package com.rangepatte.app.net.online

import com.google.firebase.Timestamp
import com.google.firebase.firestore.FirebaseFirestore
import com.rangepatte.app.domain.model.GameId
import kotlin.random.Random

/** What a room looks like to someone about to join it. */
data class RoomInfo(val code: String, val hostUid: String, val gameId: String, val status: String)

/**
 * Online tables are Firestore documents `rooms/{code}`. A host creates one and shares its short code;
 * friends type the code to join. The messages themselves travel through the room's sub-collections
 * (see [FirestoreTransport]). Needs Firebase to be connected and the player to be logged in.
 */
object OnlineRooms {
    private const val COLLECTION = "rooms"
    private const val CODE_LENGTH = 5
    // No 0/O, 1/I/L — codes are read aloud and typed on phones.
    private const val CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
    private const val ROOM_LIFETIME_MS = 6 * 60 * 60 * 1000L

    private val db get() = FirebaseFirestore.getInstance()

    private fun newCode(): String = buildString { repeat(CODE_LENGTH) { append(CODE_ALPHABET[Random.nextInt(CODE_ALPHABET.length)]) } }

    /** Creates a room for [gameId] hosted by [hostUid] and returns its code. */
    fun createRoom(gameId: GameId, hostUid: String, onResult: (Result<String>) -> Unit, attemptsLeft: Int = 5) {
        val code = newCode()
        val ref = db.collection(COLLECTION).document(code)
        ref.get().addOnSuccessListener { existing ->
            if (existing.exists()) {
                if (attemptsLeft > 0) createRoom(gameId, hostUid, onResult, attemptsLeft - 1)
                else onResult(Result.failure(IllegalStateException("No free room code")))
            } else {
                val now = System.currentTimeMillis()
                ref.set(
                    mapOf(
                        "host" to hostUid,
                        "game" to gameId.name,
                        "status" to "lobby",
                        "createdAt" to now,
                        // Lets Firestore's TTL policy delete finished rooms (see README).
                        "expireAt" to Timestamp((now + ROOM_LIFETIME_MS) / 1000, 0)
                    )
                ).addOnSuccessListener { onResult(Result.success(code)) }
                    .addOnFailureListener { onResult(Result.failure(it)) }
            }
        }.addOnFailureListener { onResult(Result.failure(it)) }
    }

    /** Looks a room up by the code someone typed; the result is null if there is no such room. */
    fun lookup(code: String, onResult: (Result<RoomInfo?>) -> Unit) {
        val clean = code.trim().uppercase()
        db.collection(COLLECTION).document(clean).get()
            .addOnSuccessListener { doc ->
                onResult(
                    Result.success(
                        if (doc.exists()) RoomInfo(clean, doc.getString("host").orEmpty(), doc.getString("game").orEmpty(), doc.getString("status").orEmpty())
                        else null
                    )
                )
            }
            .addOnFailureListener { onResult(Result.failure(it)) }
    }

    fun markStatus(code: String, status: String) {
        db.collection(COLLECTION).document(code).update("status", status)
    }
}
