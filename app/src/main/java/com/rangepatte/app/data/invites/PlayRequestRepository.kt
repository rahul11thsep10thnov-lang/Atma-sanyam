package com.rangepatte.app.data.invites

import android.os.Handler
import android.os.Looper
import android.util.Log
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.rangepatte.app.domain.invites.PlayRequest
import com.rangepatte.app.domain.invites.PlayRequests
import com.rangepatte.app.domain.invites.RequestStatus
import com.rangepatte.app.domain.invites.SendProblem
import com.rangepatte.app.domain.model.GameId
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.UUID

interface PlayRequestStore {
    /** Streams requests sent to or by [uid] that were created in the last few minutes. */
    fun watch(uid: String, onChange: (List<PlayRequest>) -> Unit): () -> Unit
    fun create(request: PlayRequest, onResult: (Result<Unit>) -> Unit)
    /** Sets the answer atomically; fails if the request was already answered or has expired. */
    fun answer(id: String, by: String, action: RequestStatus, onResult: (Result<PlayRequest>) -> Unit)
}

/**
 * Play requests for the signed-in player. [incoming] is the one card to show (the newest pending
 * request to me); [outgoing] is the request I am waiting on. Ticks every second so timers and expiry
 * stay right without a server round-trip.
 */
class PlayRequestRepository(private val store: PlayRequestStore, private val friendStateOf: (String) -> com.rangepatte.app.domain.presence.FriendState, private val relationOf: (String) -> com.rangepatte.app.domain.friends.RelationStatus) {
    private var me: String? = null
    private var stop: (() -> Unit)? = null
    private val main = Handler(Looper.getMainLooper())
    private val _all = MutableStateFlow<List<PlayRequest>>(emptyList())
    /** Every request that involves this player, as the store last reported it. */
    val all: StateFlow<List<PlayRequest>> = _all.asStateFlow()
    private val _now = MutableStateFlow(System.currentTimeMillis())
    val now: StateFlow<Long> = _now.asStateFlow()
    private val _incoming = MutableStateFlow<PlayRequest?>(null)
    val incoming: StateFlow<PlayRequest?> = _incoming.asStateFlow()
    private val _outgoing = MutableStateFlow<PlayRequest?>(null)
    val outgoing: StateFlow<PlayRequest?> = _outgoing.asStateFlow()
    /** Requests the user dismissed (declined locally or seen resolved) — never shown twice. */
    private val seen = HashSet<String>()
    private val tick = object : Runnable { override fun run() { _now.value = System.currentTimeMillis(); recompute(); main.postDelayed(this, 1000) } }

    fun start(uid: String) {
        if (me == uid) return
        stopWatching(); me = uid
        stop = store.watch(uid) { _all.value = it; recompute() }
        main.post(tick)
    }

    fun stopWatching() { stop?.invoke(); stop = null; me = null; main.removeCallbacks(tick); _all.value = emptyList(); _incoming.value = null; _outgoing.value = null }

    private fun recompute() {
        val uid = me ?: return
        val t = _now.value
        _incoming.value = _all.value.filter { it.to == uid && it.isPendingAt(t) && it.id !in seen }.maxByOrNull { it.createdAt }
        // The sender keeps seeing their request until it is resolved and they have read the outcome.
        _outgoing.value = _all.value.filter { it.from == uid && it.id !in seen }.maxByOrNull { it.createdAt }
    }

    fun send(to: String, gameId: GameId, tableCode: String?, onResult: (Result<Unit>) -> Unit) {
        val uid = me ?: return onResult(Result.failure(IllegalStateException("not signed in")))
        val pending = _all.value.any { it.from == uid && it.to == to && it.isPendingAt(_now.value) }
        PlayRequests.canSend(uid, to, relationOf(to), friendStateOf(to), gameId, pending)?.let { return onResult(Result.failure(SendRefused(it))) }
        val t = System.currentTimeMillis()
        store.create(PlayRequest(UUID.randomUUID().toString(), uid, to, gameId, tableCode, t, t + PlayRequests.TTL_MS), onResult)
    }

    fun answer(request: PlayRequest, action: RequestStatus, onResult: (Result<PlayRequest>) -> Unit = {}) {
        val uid = me ?: return
        seen += request.id
        recompute()
        store.answer(request.id, uid, action) { r -> r.onFailure { Log.w("PlayRequest", "answer", it) }; onResult(r) }
    }

    /** The sender read the outcome line; stop showing that request. */
    fun dismiss(request: PlayRequest) { seen += request.id; recompute() }

    class SendRefused(val problem: SendProblem) : Exception(problem.name)
}

/** Demo mode: a request to priya_q is accepted after three seconds; to anyone else it is declined. */
class LocalPlayRequestStore : PlayRequestStore {
    private val all = ArrayList<PlayRequest>()
    private val listeners = HashMap<String, (List<PlayRequest>) -> Unit>()
    private fun publish() = listeners.forEach { (uid, cb) -> cb(all.filter { it.from == uid || it.to == uid }) }
    override fun watch(uid: String, onChange: (List<PlayRequest>) -> Unit): () -> Unit { listeners[uid] = onChange; onChange(all.filter { it.from == uid || it.to == uid }); return { listeners.remove(uid) } }
    override fun create(request: PlayRequest, onResult: (Result<Unit>) -> Unit) {
        all += request; publish(); onResult(Result.success(Unit))
        val reply = if (request.to == "demo-9000000001") RequestStatus.ACCEPTED else RequestStatus.DECLINED
        Handler(Looper.getMainLooper()).postDelayed({ answer(request.id, request.to, reply) {} }, 3000)
    }
    override fun answer(id: String, by: String, action: RequestStatus, onResult: (Result<PlayRequest>) -> Unit) {
        val i = all.indexOfFirst { it.id == id }
        if (i < 0) return onResult(Result.failure(IllegalStateException("gone")))
        val next = PlayRequests.answer(all[i], by, action, System.currentTimeMillis()) ?: return onResult(Result.failure(IllegalStateException("already answered")))
        all[i] = next; publish(); onResult(Result.success(next))
    }
}

/**
 * Firestore `playRequests/{id}`. Both sides listen; answering is a transaction that re-reads the
 * document and applies [PlayRequests.answer], so a late tap or a duplicate message cannot answer twice.
 * Rules: only `from` may create (and only for a friend, enforced by reading `relations`), only `to`
 * may set ACCEPTED/DECLINED, only `from` may set CANCELLED.
 */
class FirestorePlayRequestStore : PlayRequestStore {
    private val db get() = FirebaseFirestore.getInstance()
    private fun parse(d: com.google.firebase.firestore.DocumentSnapshot): PlayRequest? = runCatching {
        PlayRequest(d.id, d.getString("from")!!, d.getString("to")!!, GameId.valueOf(d.getString("game")!!), d.getString("table"), d.getLong("createdAt")!!, d.getLong("expiresAt")!!, RequestStatus.valueOf(d.getString("status")!!))
    }.getOrNull()

    override fun watch(uid: String, onChange: (List<PlayRequest>) -> Unit): () -> Unit {
        val since = System.currentTimeMillis() - 10 * 60_000L
        val parts = HashMap<String, List<PlayRequest>>()
        val regs = ArrayList<ListenerRegistration>()
        for (field in listOf("to", "from")) {
            regs += db.collection("playRequests").whereEqualTo(field, uid).whereGreaterThan("createdAt", since).addSnapshotListener { snap, e ->
                if (e != null || snap == null) return@addSnapshotListener
                parts[field] = snap.documents.mapNotNull(::parse)
                onChange(parts.values.flatten().distinctBy { it.id })
            }
        }
        return { regs.forEach { it.remove() } }
    }

    override fun create(request: PlayRequest, onResult: (Result<Unit>) -> Unit) {
        db.collection("playRequests").document(request.id).set(
            mapOf("from" to request.from, "to" to request.to, "game" to request.gameId.name, "table" to request.tableCode,
                "createdAt" to request.createdAt, "expiresAt" to request.expiresAt, "status" to request.status.name, "serverAt" to FieldValue.serverTimestamp())
        ).addOnSuccessListener { onResult(Result.success(Unit)) }.addOnFailureListener { onResult(Result.failure(it)) }
    }

    override fun answer(id: String, by: String, action: RequestStatus, onResult: (Result<PlayRequest>) -> Unit) {
        val ref = db.collection("playRequests").document(id)
        db.runTransaction { tx ->
            val current = parse(tx.get(ref)) ?: throw IllegalStateException("gone")
            val next = PlayRequests.answer(current, by, action, System.currentTimeMillis()) ?: throw IllegalStateException("already answered")
            tx.update(ref, mapOf("status" to next.status.name, "answeredAt" to FieldValue.serverTimestamp()))
            next
        }.addOnSuccessListener { onResult(Result.success(it)) }.addOnFailureListener { onResult(Result.failure(it)) }
    }
}
