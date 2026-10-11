package com.rangepatte.app.audio

import android.app.Activity
import android.app.Application
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.SoundPool
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import com.rangepatte.app.data.local.AudioPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * The one place that owns all sound in the app — the source of truth for the audio settings and the
 * only code that touches [SoundPool] and [MediaPlayer].
 *
 * **Card effects** are short, so they go through one [SoundPool]: loaded once, played on separate
 * streams (so a dealing run never cuts itself off) and kept from piling up by a small gap between
 * repeats of the same effect and the pool's own stream limit.
 *
 * **Background music** is one looping [MediaPlayer], created once, started and paused as the app
 * comes to the front and goes away, and faded in and out (never restarted by gameplay). The effects
 * and the music are separate players, so effects never stop or restart the music; the music dips
 * gently (ducks) while an effect plays and then eases back.
 *
 * Volumes: `effective music = master × music volume` and `effective effects = master × effects
 * volume`, each 0 when its switch is off (see [AudioSettings]). Master 0 silences everything without
 * touching any switch.
 *
 * The music file is `res/raw/surreal_forest.mp3`. If it has not been added the app simply has no
 * music — [musicAvailable] is false and nothing else is affected. Every call is safe to make from
 * anywhere on the main thread and never throws.
 */
object GameAudio {
    private const val TAG = "GameAudio"

    /** Name (without extension) of the music file in `res/raw`. */
    const val MUSIC_RES_NAME = "surreal_forest"

    /** The same effect is not restarted more often than this (guards rapid taps and duplicate events). */
    private const val MIN_REPEAT_GAP_MS = 60L
    private const val MAX_STREAMS = 6

    /** How far the music dips while a card effect plays, and how long it takes to ease up or down. */
    private const val DUCK_LEVEL = 0.6f
    private const val RAMP_MS = 450f
    private const val TICK_MS = 30L

    private val main = Handler(Looper.getMainLooper())
    private var app: Application? = null

    private val _settings = MutableStateFlow(AudioSettings())

    /** What the player has chosen. The control panel shows and edits this. */
    val settings: StateFlow<AudioSettings> = _settings.asStateFlow()

    private val _musicAvailable = MutableStateFlow(false)

    /** False until `surreal_forest.mp3` is in `res/raw` (the panel says so). */
    val musicAvailable: StateFlow<Boolean> = _musicAvailable.asStateFlow()

    // ---- Effects ---------------------------------------------------------------------------------

    private var pool: SoundPool? = null
    private val soundIds = HashMap<Sfx, Int>()
    private val loaded = HashSet<Int>()
    private val lastPlayedAt = HashMap<Sfx, Long>()
    private val activeStreams = ArrayDeque<Int>()
    private val pendingCues = ArrayList<Runnable>()

    // ---- Music -----------------------------------------------------------------------------------

    private var player: MediaPlayer? = null
    private var prepared = false
    private var foreground = false
    private var startedActivities = 0

    /** Fade and ducking multiplier on the music (0..1), eased towards [levelTarget]. */
    private var level = 0f
    private var levelTarget = 0f
    private var duckUntil = 0L
    private val rampTick = Runnable { rampStep() }
    private val refreshTarget = Runnable { updateMusicTarget() }

    /** Call once, from `Application.onCreate`. Safe to call again. */
    fun init(application: Application) {
        if (app != null) return
        app = application
        _settings.value = AudioPreferences.load(application)
        buildPool(application)
        _musicAvailable.value = application.resources.getIdentifier(MUSIC_RES_NAME, "raw", application.packageName) != 0
        if (!_musicAvailable.value) Log.i(TAG, "No res/raw/$MUSIC_RES_NAME.* — the game plays without background music.")
        application.registerActivityLifecycleCallbacks(lifecycle)
    }

    // ---- Settings --------------------------------------------------------------------------------

    /** Changes the settings, remembers them, and applies them to playback immediately. */
    fun update(change: (AudioSettings) -> AudioSettings) {
        val context = app ?: return
        val old = _settings.value
        val new = change(old).let {
            it.copy(
                master = AudioSettings.clamp(it.master),
                gameSoundVolume = AudioSettings.clamp(it.gameSoundVolume),
                musicVolume = AudioSettings.clamp(it.musicVolume)
            )
        }
        if (new == old) return
        _settings.value = new
        AudioPreferences.save(context, new)
        if (new.effectiveGameSoundVolume <= 0f) silenceEffects()
        applyMusicVolume()
        updateMusicTarget()
    }

    fun restoreDefaults() = update { AudioSettings() }

    // ---- Playing card effects ------------------------------------------------------------------------

    fun playShuffle() = play(Sfx.SHUFFLE)
    fun playRiffleShuffle() = play(Sfx.RIFFLE)
    fun playDealCard() = play(Sfx.DEAL_ONE)
    fun playDealCards() = play(Sfx.DEAL_MANY)
    fun playPresentCard() = play(Sfx.PRESENT)
    fun playRevealCard() = play(Sfx.REVEAL)
    fun playCollectCards() = play(Sfx.COLLECT)
    fun playHandReveal() = play(Sfx.HAND_REVEAL)

    /** Plays [sfx] now, unless card sounds are off, silent, still loading, or it just played. */
    fun play(sfx: Sfx) {
        try {
            val volume = _settings.value.effectiveGameSoundVolume
            if (volume <= 0f) return
            val soundPool = pool ?: return
            val id = soundIds[sfx]?.takeIf { it in loaded } ?: return
            val now = SystemClock.uptimeMillis()
            if (now - (lastPlayedAt[sfx] ?: 0L) < MIN_REPEAT_GAP_MS) return
            lastPlayedAt[sfx] = now
            val stream = soundPool.play(id, volume, volume, 1, 0, 1f)
            if (stream != 0) {
                activeStreams.addLast(stream)
                while (activeStreams.size > MAX_STREAMS * 2) activeStreams.removeFirst()
            }
            duckMusic(sfx.durationMs)
        } catch (e: Exception) {
            Log.w(TAG, "Could not play $sfx", e)
        }
    }

    /** Plays a sequence: each cue [SfxCue.delayMs] after now. Does nothing at all when card sounds are off. */
    fun playCues(cues: List<SfxCue>) {
        if (cues.isEmpty() || _settings.value.effectiveGameSoundVolume <= 0f) return
        cues.forEach { cue ->
            if (cue.delayMs <= 0L) {
                play(cue.sfx)
            } else {
                lateinit var task: Runnable
                task = Runnable {
                    pendingCues.remove(task)
                    play(cue.sfx)
                }
                pendingCues.add(task)
                main.postDelayed(task, cue.delayMs)
            }
        }
    }

    /** Drops cues that were scheduled but have not played yet (a table closing, the app going away). */
    fun cancelPending() {
        pendingCues.forEach(main::removeCallbacks)
        pendingCues.clear()
    }

    private fun silenceEffects() {
        cancelPending()
        val soundPool = pool ?: return
        while (activeStreams.isNotEmpty()) runCatching { soundPool.stop(activeStreams.removeFirst()) }
    }

    private fun buildPool(application: Application) {
        try {
            val attributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_GAME)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()
            val soundPool = SoundPool.Builder().setMaxStreams(MAX_STREAMS).setAudioAttributes(attributes).build()
            soundPool.setOnLoadCompleteListener { _, sampleId, status ->
                if (status == 0) loaded.add(sampleId) else Log.w(TAG, "Sound $sampleId failed to load ($status)")
            }
            Sfx.entries.forEach { sfx ->
                val resId = application.resources.getIdentifier(sfx.resName, "raw", application.packageName)
                if (resId == 0) Log.w(TAG, "Missing sound asset res/raw/${sfx.resName}")
                else soundIds[sfx] = soundPool.load(application, resId, 1)
            }
            pool = soundPool
        } catch (e: Exception) {
            Log.w(TAG, "Sound effects are unavailable", e)
        }
    }

    // ---- Music ------------------------------------------------------------------------------------

    private fun wantMusic(): Boolean =
        foreground && _musicAvailable.value && _settings.value.effectiveMusicVolume > 0f

    private fun duckMusic(durationMs: Long) {
        if (player?.isPlaying != true) return
        val now = SystemClock.uptimeMillis()
        duckUntil = maxOf(duckUntil, now + durationMs + 150)
        main.removeCallbacks(refreshTarget)
        main.postDelayed(refreshTarget, duckUntil - now + 10)
        updateMusicTarget()
    }

    /** Decides where the fade level should head (up, ducked, or down to a pause) and starts easing there. */
    private fun updateMusicTarget() {
        if (wantMusic()) {
            ensurePlayer()
            levelTarget = if (SystemClock.uptimeMillis() < duckUntil) DUCK_LEVEL else 1f
            val mediaPlayer = player
            if (prepared && mediaPlayer != null && !mediaPlayer.isPlaying) {
                level = 0f
                runCatching { mediaPlayer.start() }
            }
        } else {
            levelTarget = 0f
        }
        main.removeCallbacks(rampTick)
        main.post(rampTick)
    }

    private fun rampStep() {
        val step = TICK_MS / RAMP_MS
        level = when {
            level < levelTarget -> minOf(levelTarget, level + step)
            level > levelTarget -> maxOf(levelTarget, level - step)
            else -> level
        }
        applyMusicVolume()
        if (level == 0f && levelTarget == 0f) {
            // Faded out: pause (do not release — it resumes from here).
            player?.let { if (it.isPlaying) runCatching { it.pause() } }
        }
        if (level != levelTarget) main.postDelayed(rampTick, TICK_MS)
    }

    private fun applyMusicVolume() {
        val volume = (_settings.value.effectiveMusicVolume * level).coerceIn(0f, 1f)
        runCatching { player?.setVolume(volume, volume) }
    }

    /** Creates the one music player the first time it is wanted. Never creates a second. */
    private fun ensurePlayer() {
        if (player != null) return
        val context = app ?: return
        val resId = context.resources.getIdentifier(MUSIC_RES_NAME, "raw", context.packageName)
        if (resId == 0) {
            _musicAvailable.value = false
            return
        }
        try {
            val mediaPlayer = MediaPlayer()
            mediaPlayer.setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_GAME)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build()
            )
            context.resources.openRawResourceFd(resId).use { fd ->
                mediaPlayer.setDataSource(fd.fileDescriptor, fd.startOffset, fd.length)
            }
            mediaPlayer.isLooping = true
            mediaPlayer.setVolume(0f, 0f)
            mediaPlayer.setOnPreparedListener {
                prepared = true
                updateMusicTarget()
            }
            mediaPlayer.setOnErrorListener { _, what, extra ->
                Log.w(TAG, "Music player error $what/$extra; music is off for this run")
                releasePlayer()
                _musicAvailable.value = false
                true
            }
            player = mediaPlayer
            prepared = false
            mediaPlayer.prepareAsync()
        } catch (e: Exception) {
            Log.w(TAG, "Background music is unavailable", e)
            releasePlayer()
            _musicAvailable.value = false
        }
    }

    private fun releasePlayer() {
        main.removeCallbacks(rampTick)
        runCatching { player?.release() }
        player = null
        prepared = false
        level = 0f
        levelTarget = 0f
    }

    // ---- App lifecycle ------------------------------------------------------------------------------

    private val lifecycle = object : Application.ActivityLifecycleCallbacks {
        override fun onActivityStarted(activity: Activity) {
            startedActivities++
            if (!foreground) {
                foreground = true
                pool?.autoResume()
                updateMusicTarget()
            }
        }

        override fun onActivityStopped(activity: Activity) {
            startedActivities = maxOf(0, startedActivities - 1)
            if (startedActivities == 0 && !activity.isChangingConfigurations) {
                foreground = false
                // Going to the background: stop right away rather than fading in the dark.
                cancelPending()
                pool?.autoPause()
                main.removeCallbacks(rampTick)
                level = 0f
                levelTarget = 0f
                player?.let { if (it.isPlaying) runCatching { it.pause() } }
            }
        }

        override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) = Unit
        override fun onActivityResumed(activity: Activity) = Unit
        override fun onActivityPaused(activity: Activity) = Unit
        override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) = Unit
        override fun onActivityDestroyed(activity: Activity) = Unit
    }

    /** Frees every audio resource. Not needed in normal use (Android reclaims them with the process). */
    fun release() {
        cancelPending()
        main.removeCallbacks(refreshTarget)
        releasePlayer()
        pool?.release()
        pool = null
        soundIds.clear()
        loaded.clear()
        activeStreams.clear()
    }
}
