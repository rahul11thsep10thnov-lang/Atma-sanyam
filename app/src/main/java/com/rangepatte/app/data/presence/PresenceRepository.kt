package com.rangepatte.app.data.presence

import android.app.Activity as AndroidActivity
import android.app.Application
import android.content.Context
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.core.content.edit
import com.google.firebase.firestore.FieldPath
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.rangepatte.app.domain.model.GameId
import com.rangepatte.app.domain.presence.Activity
import com.rangepatte.app.domain.presence.FriendState
import com.rangepatte.app.domain.presence.GameCapabilities
import com.rangepatte.app.domain.presence.Presence
import com.rangepatte.app.domain.presence.PresenceRecord
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** Where presence records live. */
interface PresenceStore {
    fun write(record: PresenceRecord)
    /** Marks [uid] gone at once (sign-out, app closing) rather than waiting for the beat to age. */
    fun clear(uid: String)
    fun watch(uids: Collection<String>, onChange: (Map<String, PresenceRecord>) -> Unit): () -> Unit
}

/**
 * Keeps this phone's presence alive and follows friends' presence. A beat goes out every
 * [Presence.HEARTBEAT_MS] while an activity is in front; when the app leaves the screen the record is
 * cleared, so nobody looks online after they've gone. [setActivity] is called by the table and lobby
 * screens so friends can see whether there is a seat to join.
 */
class PresenceRepository(context: Context, private val store: PresenceStore) {
    private val prefs = context.getSharedPreferences("presence_prefs", Context.MODE_PRIVATE)
    private val main = Handler(Looper.getMainLooper())
    private var uid: String? = null
    private var foreground = false
    private var started = 0
    private var activity: Activity? = null
    private var stopWatching: (() -> Unit)? = null

    private val _invisible = MutableStateFlow(prefs.getBoolean("invisible", false))
    /** "Appear offline": friends see this player as offline. */
    val invisible: StateFlow<Boolean> = _invisible.asStateFlow()

    private val _friends = MutableStateFlow<Map<String, PresenceRecord>>(emptyMap())
    val friends: StateFlow<Map<String, PresenceRecord>> = _friends.asStateFlow()

    /** Ticks once a minute so rows go grey when a beat ages out even if no new record arrives. */
    private val _clock = MutableStateFlow(System.currentTimeMillis())
    val clock: StateFlow<Long> = _clock.asStateFlow()

    private val beat = object : Runnable {
        override fun run() {
            val me = uid ?: return
            if (foreground) runCatching { store.write(PresenceRecord(me, System.currentTimeMillis(), _invisible.value, activity)) }
                .onFailure { Log.w("Presence", "beat", it) }
            _clock.value = System.currentTimeMillis()
            main.postDelayed(this, Presence.HEARTBEAT_MS)
        }
    }

    fun attach(application: Application) = application.registerActivityLifecycleCallbacks(object : Application.ActivityLifecycleCallbacks {
        override fun onActivityStarted(a: AndroidActivity) { if (started++ == 0) { foreground = true; beatNow() } }
        override fun onActivityStopped(a: AndroidActivity) { if (--started == 0 && !a.isChangingConfigurations) { foreground = false; uid?.let(store::clear) } }
        override fun onActivityCreated(a: AndroidActivity, b: Bundle?) = Unit
        override fun onActivityResumed(a: AndroidActivity) = Unit
        override fun onActivityPaused(a: AndroidActivity) = Unit
        override fun onActivitySaveInstanceState(a: AndroidActivity, b: Bundle) = Unit
        override fun onActivityDestroyed(a: AndroidActivity) = Unit
    })

    fun onSignedIn(uid: String) {
        this.uid = uid
        beatNow()
    }

    fun onSignedOut() {
        uid?.let(store::clear)
        uid = null
        main.removeCallbacks(beat)
        follow(emptyList())
    }

    fun setInvisible(value: Boolean) {
        _invisible.value = value
        prefs.edit { putBoolean("invisible", value) }
        beatNow()
    }

    /** Called when a table or lobby opens (with its free seats) and with null when it closes. */
    fun setActivity(activity: Activity?) {
        this.activity = activity
        beatNow()
    }

    /** Follows these players' presence (the friends list). */
    fun follow(uids: Collection<String>) {
        stopWatching?.invoke()
        stopWatching = if (uids.isEmpty()) { _friends.value = emptyMap(); null } else store.watch(uids) { _friends.value = it }
    }

    fun stateOf(other: String): FriendState =
        Presence.stateOf(_friends.value[other], _clock.value, GameCapabilities::canJoinLate)

    private fun beatNow() {
        main.removeCallbacks(beat)
        main.post(beat)
    }
}

/** Demo mode: pretend players, two of them "online", one at a full table — so the marks can be seen. */
class LocalPresenceStore : PresenceStore {
    private var mine: PresenceRecord? = null
    override fun write(record: PresenceRecord) { mine = record }
    override fun clear(uid: String) { mine = null }
    override fun watch(uids: Collection<String>, onChange: (Map<String, PresenceRecord>) -> Unit): () -> Unit {
        val now = System.currentTimeMillis()
        val pretend = mapOf(
            "demo-9000000001" to PresenceRecord("demo-9000000001", now, false, Activity(GameId.TEEN_PATTI)),
            "demo-9000000002" to PresenceRecord("demo-9000000002", now, false, Activity(GameId.RUMMY, "K7M2Q", 0)),
            "demo-9000000003" to PresenceRecord("demo-9000000003", now, false, null)
        )
        // Beats are refreshed every half minute so the pretend players stay online.
        val handler = Handler(Looper.getMainLooper())
        val tick = object : Runnable { override fun run() { val t = System.currentTimeMillis(); onChange(pretend.filterKeys { it in uids }.mapValues { it.value.copy(lastBeat = t) }); handler.postDelayed(this, 30_000) } }
        handler.post(tick)
        return { handler.removeCallbacks(tick) }
    }
}

/** Firestore: `presence/{uid}` = {t, invisible, game, table, seatsFree}. Readable by friends, writable by the owner only. */
class FirestorePresenceStore : PresenceStore {
    private val db get() = FirebaseFirestore.getInstance()

    override fun write(record: PresenceRecord) {
        db.collection("presence").document(record.uid).set(
            mapOf(
                "t" to record.lastBeat, "invisible" to record.invisible,
                "game" to record.activity?.gameId?.name, "table" to record.activity?.tableCode, "seatsFree" to (record.activity?.seatsFree ?: 0)
            )
        )
    }

    override fun clear(uid: String) { db.collection("presence").document(uid).delete() }

    override fun watch(uids: Collection<String>, onChange: (Map<String, PresenceRecord>) -> Unit): () -> Unit {
        val chunks = uids.distinct().chunked(10)
        val parts = HashMap<Int, Map<String, PresenceRecord>>()
        val regs = ArrayList<ListenerRegistration>()
        chunks.forEachIndexed { index, chunk ->
            regs += db.collection("presence").whereIn(FieldPath.documentId(), chunk).addSnapshotListener { snap, e ->
                if (e != null || snap == null) return@addSnapshotListener
                parts[index] = snap.documents.associate { d ->
                    val game = d.getString("game")?.let { runCatching { GameId.valueOf(it) }.getOrNull() }
                    d.id to PresenceRecord(
                        d.id, d.getLong("t") ?: 0, d.getBoolean("invisible") ?: false,
                        game?.let { Activity(it, d.getString("table"), (d.getLong("seatsFree") ?: 0).toInt()) }
                    )
                }
                onChange(parts.values.fold(emptyMap()) { acc, m -> acc + m })
            }
        }
        return { regs.forEach { it.remove() } }
    }
}
