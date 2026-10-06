package com.rangepatte.app.net.online

import com.google.firebase.firestore.DocumentChange
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.Query
import com.rangepatte.app.net.Transport
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Carries table messages over the internet through a Firestore room.
 *
 * - `rooms/{code}/inbox`: guests write here, only the host reads. One document per message.
 * - `rooms/{code}/log`: the host writes here (document ids are zero-padded counters), everybody reads
 *   it in order. A message may carry a `to` field when it is for one guest only.
 * - `rooms/{code}/presence/{uid}`: every phone stamps the time every few seconds; a phone silent for
 *   [SILENCE_LIMIT_MS] is treated as gone.
 *
 * Peer ids are Firebase user ids. For a guest the only peer is [hostUid].
 */
class FirestoreTransport(
    code: String,
    private val myUid: String,
    private val hostUid: String,
    private val isHost: Boolean
) : Transport {
    private val room = FirebaseFirestore.getInstance().collection("rooms").document(code)
    private val registrations = mutableListOf<ListenerRegistration>()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val lastSeen = HashMap<String, Long>()
    private var nextLogNumber = 1L
    private var lastTimestamp = 0L

    override var listener: Transport.Listener? = null

    init {
        if (isHost) listenToInbox() else listenToLog()
        listenToPresence()
        scope.launch {
            while (true) {
                room.collection("presence").document(myUid).set(mapOf("t" to System.currentTimeMillis()))
                checkSilentPeers()
                delay(HEARTBEAT_MS)
            }
        }
    }

    private fun listenToInbox() {
        registrations += room.collection("inbox").orderBy("ts", Query.Direction.ASCENDING).addSnapshotListener { snapshot, _ ->
            snapshot?.documentChanges?.filter { it.type == DocumentChange.Type.ADDED }?.forEach { change ->
                val from = change.document.getString("from") ?: return@forEach
                val text = change.document.getString("text") ?: return@forEach
                listener?.onMessage(from, text)
            }
        }
    }

    private fun listenToLog() {
        registrations += room.collection("log").orderBy("n", Query.Direction.ASCENDING).addSnapshotListener { snapshot, _ ->
            snapshot?.documentChanges?.filter { it.type == DocumentChange.Type.ADDED }?.forEach { change ->
                val to = change.document.getString("to")
                if (to != null && to != myUid) return@forEach
                val text = change.document.getString("text") ?: return@forEach
                listener?.onMessage(hostUid, text)
            }
        }
    }

    private fun listenToPresence() {
        registrations += room.collection("presence").addSnapshotListener { snapshot, _ ->
            snapshot?.documentChanges?.forEach { change ->
                val uid = change.document.id
                if (uid != myUid && (isHost || uid == hostUid)) {
                    if (change.type == DocumentChange.Type.REMOVED) forget(uid) else synchronized(lastSeen) { lastSeen[uid] = System.currentTimeMillis() }
                }
            }
        }
    }

    private fun forget(uid: String) {
        val wasKnown = synchronized(lastSeen) { lastSeen.remove(uid) != null }
        if (wasKnown) listener?.onPeerLost(uid)
    }

    private fun checkSilentPeers() {
        val now = System.currentTimeMillis()
        val silent = synchronized(lastSeen) { lastSeen.filterValues { now - it > SILENCE_LIMIT_MS }.keys.toList() }
        silent.forEach(::forget)
    }

    private fun writeToLog(text: String, to: String?) {
        val number = synchronized(this) { nextLogNumber++ }
        val data = mutableMapOf<String, Any>("n" to number, "text" to text)
        if (to != null) data["to"] = to
        room.collection("log").document("%08d".format(number)).set(data)
    }

    override fun sendToHost(text: String) {
        val stamp = synchronized(this) { maxOf(System.currentTimeMillis(), lastTimestamp + 1).also { lastTimestamp = it } }
        room.collection("inbox").add(mapOf("from" to myUid, "text" to text, "ts" to stamp))
    }

    override fun sendToPeer(peerId: String, text: String) = writeToLog(text, peerId)

    override fun broadcast(text: String) = writeToLog(text, null)

    override fun close() {
        registrations.forEach { it.remove() }
        registrations.clear()
        scope.cancel()
        room.collection("presence").document(myUid).delete()
        if (isHost) OnlineRooms.markStatus(room.id, "closed")
    }

    companion object {
        private const val HEARTBEAT_MS = 5_000L
        private const val SILENCE_LIMIT_MS = 25_000L
    }
}
