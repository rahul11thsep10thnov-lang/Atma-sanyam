package com.rangepatte.app.data.local

import android.content.Context
import androidx.core.content.edit
import com.rangepatte.app.audio.AudioSettings

/** The player's sound settings, remembered between launches (plain [android.content.SharedPreferences], like the other preferences). */
object AudioPreferences {
    private const val PREFS_NAME = "audio_prefs"
    private const val KEY_MASTER = "master"
    private const val KEY_GAME_SOUNDS_ON = "game_sounds_on"
    private const val KEY_GAME_SOUND_VOLUME = "game_sound_volume"
    private const val KEY_MUSIC_ON = "music_on"
    private const val KEY_MUSIC_VOLUME = "music_volume"

    fun load(context: Context): AudioSettings {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val defaults = AudioSettings()
        return AudioSettings(
            master = AudioSettings.clamp(prefs.getFloat(KEY_MASTER, defaults.master)),
            gameSoundsOn = prefs.getBoolean(KEY_GAME_SOUNDS_ON, defaults.gameSoundsOn),
            gameSoundVolume = AudioSettings.clamp(prefs.getFloat(KEY_GAME_SOUND_VOLUME, defaults.gameSoundVolume)),
            musicOn = prefs.getBoolean(KEY_MUSIC_ON, defaults.musicOn),
            musicVolume = AudioSettings.clamp(prefs.getFloat(KEY_MUSIC_VOLUME, defaults.musicVolume))
        )
    }

    fun save(context: Context, settings: AudioSettings) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit {
            putFloat(KEY_MASTER, settings.master)
            putBoolean(KEY_GAME_SOUNDS_ON, settings.gameSoundsOn)
            putFloat(KEY_GAME_SOUND_VOLUME, settings.gameSoundVolume)
            putBoolean(KEY_MUSIC_ON, settings.musicOn)
            putFloat(KEY_MUSIC_VOLUME, settings.musicVolume)
        }
    }
}
