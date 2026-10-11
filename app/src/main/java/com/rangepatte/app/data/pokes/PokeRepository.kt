package com.rangepatte.app.data.pokes

import android.os.Handler
import android.os.Looper
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.rangepatte.app.data.notifications.NotificationRepository
import com.rangepatte.app.domain.friends.RelationStatus
import com.rangepatte.app.domain.notifications.Notice
import com.rangepatte.app.domain.notifications.NoticeKind
import com.rangepatte.app.domain.pokes.Poke
import com.rangepatte.app.domain.pokes.PokePrefs
import com.rangepatte.app.domain.pokes.Pokes
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** The other player has switched pokes off (or limited them): the sender is told, nothing is written. */
class NotTakingPokes : Exception("not taking pokes")

/** Where pokes live: one record per sender→receiver (`pokes/{from_to}` = {from, to, t}). */
interface PokeStore {
    fun send(poke: Poke, onResult: (Result<Unit>) -> Unit)
    /** Pokes to [uid] as they arrive (only those newer than when watching began). */
    fun watch(uid: String, onPoke: (Poke) -> Unit): () -> Unit
}

/**
 * Pokes (Element 13, Design 1): the sender's phone keeps the cooldown per friend and the hourly total;
 * the store refuses anything faster anyway. A received poke is posted to the notification centre and
 * exposed as [incoming] for the table-shaking animation (Element 14).
 */
class PokeRepository(
    private val store: PokeStore,
    private val notifications: NotificationRepository,
    private val relationOf: (String) -> RelationStatus,
    private val isOnline: (String) -> Boolean,
    /** The receiver's own settings (Element 15): who may poke, muted people. */
    private val prefs: () -> PokePrefs = { PokePrefs() }
) {
    private var me: String? = null
    private var stop: (() -> Unit)? = null
    private val lastTo = HashMap<String, Long>()
    private val sent = ArrayList<Long>()

    /** The pokes this phone sent: uid → time, so screens can show the countdown. Bumps on every send. */
    private val _sentTo = MutableStateFlow<Map<String, Long>>(emptyMap())
    val sentTo: StateFlow<Map<String, Long>> = _sentTo.asStateFlow()

    /** The latest poke received, for the animation; cleared by [acknowledge]. */
    private val _incoming = MutableStateFlow<Poke?>(null)
    val incoming: StateFlow<Poke?> = _incoming.asStateFlow()

    fun start(uid: String) {
        me = uid
        stop?.invoke()
        stop = store.watch(uid) { poke ->
            if (relationOf(poke.from) != RelationStatus.FRIENDS) return@watch // not from a friend: ignored
            if (!prefs().accepts(poke.from)) return@watch // switched off, muted, or not a favourite: nothing at all
            notifications.post(Notice("poke:${poke.from}:${poke.at}", NoticeKind.POKE, poke.from, poke.at))
            _incoming.value = poke
        }
    }

    fun stopWatching() {
        stop?.invoke(); stop = null; me = null
        lastTo.clear(); sent.clear(); _sentTo.value = emptyMap(); _incoming.value = null
    }

    fun acknowledge() { _incoming.value = null }

    fun canPoke(other: String, now: Long = System.currentTimeMillis()): Boolean =
        me != null && Pokes.canPoke(relationOf(other) == RelationStatus.FRIENDS, isOnline(other), lastTo[other], sent, now)

    fun cooldownLeft(other: String, now: Long = System.currentTimeMillis()): Long = Pokes.cooldownLeft(lastTo[other], now)

    fun poke(other: String, onResult: (Result<Unit>) -> Unit = {}) {
        val uid = me ?: return
        val now = System.currentTimeMillis()
        if (!canPoke(other, now)) { onResult(Result.failure(IllegalStateException("cooldown"))); return }
        lastTo[other] = now
        sent += now
        sent.removeAll { now - it > Pokes.HOUR_MS }
        _sentTo.value = lastTo.toMap()
        store.send(Poke(uid, other, now), onResult)
    }
}

/** Demo mode: pokes stay on the phone; priya_q pokes back after three seconds. */
class LocalPokeStore : PokeStore {
    private var listener: ((Poke) -> Unit)? = null
    override fun send(poke: Poke, onResult: (Result<Unit>) -> Unit) {
        onResult(Result.success(Unit))
        if (poke.to == "demo-9000000001") {
            Handler(Looper.getMainLooper()).postDelayed({ listener?.invoke(Poke(poke.to, poke.from, System.currentTimeMillis())) }, 3000)
        }
    }
    override fun watch(uid: String, onPoke: (Poke) -> Unit): () -> Unit {
        listener = onPoke
        return { if (listener === onPoke) listener = null }
    }
}

/** Firestore: `pokes/{from_to}` = {from, to, t}. The rule refuses a write less than ten minutes after the last. */
class FirestorePokeStore : PokeStore {
    private val db get() = FirebaseFirestore.getInstance()
    override fun send(poke: Poke, onResult: (Result<Unit>) -> Unit) {
        // The receiver's mirrored settings first: "receive" off or audience NOBODY means a polite refusal.
        db.collection("profiles").document(poke.to).get().addOnSuccessListener { doc ->
            val mirrored = doc.get("pokePrefs") as? Map<*, *>
            val receive = mirrored?.get("receive") as? Boolean ?: true
            val audience = mirrored?.get("audience") as? String
            if (!receive || audience == "NOBODY") { onResult(Result.failure(NotTakingPokes())); return@addOnSuccessListener }
            db.collection("pokes").document(Pokes.docId(poke.from, poke.to))
                .set(mapOf("from" to poke.from, "to" to poke.to, "t" to poke.at))
                .addOnSuccessListener { onResult(Result.success(Unit)) }
                .addOnFailureListener { onResult(Result.failure(it)) }
        }.addOnFailureListener { onResult(Result.failure(it)) }
    }
    override fun watch(uid: String, onPoke: (Poke) -> Unit): () -> Unit {
        val since = System.currentTimeMillis()
        val reg: ListenerRegistration = db.collection("pokes").whereEqualTo("to", uid).whereGreaterThan("t", since)
            .addSnapshotListener { snap, e ->
                if (e != null || snap == null) return@addSnapshotListener
                snap.documentChanges.forEach { c ->
                    val d = c.document
                    val from = d.getString("from") ?: return@forEach
                    val t = d.getLong("t") ?: return@forEach
                    onPoke(Poke(from, uid, t))
                }
            }
        return { reg.remove() }
    }
}
