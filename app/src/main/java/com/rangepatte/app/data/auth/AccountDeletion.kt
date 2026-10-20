package com.rangepatte.app.data.auth

import com.google.android.gms.tasks.Task
import com.google.android.gms.tasks.Tasks
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthRecentLoginRequiredException
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.QuerySnapshot
import com.rangepatte.app.domain.profile.Username

/** Firebase only lets a sign-in older than a few minutes delete itself after signing in again. */
class NeedsRecentLoginException : IllegalStateException("Sign in again to delete the account")

/**
 * Deletes everything held about a player, as Google Play's account-deletion policy asks: the online
 * records and the sign-in itself. Safe to run twice (a second run finds nothing left).
 */
interface AccountDeletion {
    fun deleteAll(uid: String, username: String?, onResult: (Result<Unit>) -> Unit)
}

/**
 * Removes, from Firestore: the `users` record (phone number, name), the profile, the reserved username,
 * the online status, every friend relation, poke and play request that names the player — and then the
 * Firebase Authentication user. What stays: safety reports other players filed about this account
 * (kept to protect others, and deleted by the app owner on request), and online rooms, which delete
 * themselves six hours after creation (Firestore TTL).
 */
class FirestoreAccountDeletion : AccountDeletion {
    private val db get() = FirebaseFirestore.getInstance()

    override fun deleteAll(uid: String, username: String?, onResult: (Result<Unit>) -> Unit) {
        val own = db.batch().apply {
            delete(db.collection("users").document(uid))
            delete(db.collection("profiles").document(uid))
            delete(db.collection("presence").document(uid))
            username?.let { delete(db.collection("usernames").document(Username.normalize(it))) }
        }.commit()
        val tasks = mutableListOf<Task<Void>>(own)
        for ((collection, field) in listOf("relations" to "a", "relations" to "b", "pokes" to "from", "pokes" to "to", "playRequests" to "from", "playRequests" to "to")) {
            tasks += deleteWhere(collection, field, uid)
        }
        Tasks.whenAll(tasks)
            .addOnSuccessListener { deleteSignIn(onResult) }
            .addOnFailureListener { onResult(Result.failure(it)) }
    }

    private fun deleteWhere(collection: String, field: String, uid: String): Task<Void> =
        db.collection(collection).whereEqualTo(field, uid).get().onSuccessTask { snapshot: QuerySnapshot ->
            // A batch holds at most 500 writes; 400 per batch keeps well inside it.
            val batches = snapshot.documents.chunked(400).map { chunk ->
                db.batch().apply { chunk.forEach { delete(it.reference) } }.commit()
            }
            Tasks.whenAll(batches)
        }

    private fun deleteSignIn(onResult: (Result<Unit>) -> Unit) {
        val user = FirebaseAuth.getInstance().currentUser
        if (user == null) { onResult(Result.success(Unit)); return }
        user.delete()
            .addOnSuccessListener { onResult(Result.success(Unit)) }
            .addOnFailureListener { e ->
                onResult(Result.failure(if (e is FirebaseAuthRecentLoginRequiredException) NeedsRecentLoginException() else e))
            }
    }
}

/** Demo mode (no Firebase): everything lives on the phone, so removing the local profile is all there is. */
class LocalAccountDeletion(private val deleteLocal: ((Result<Unit>) -> Unit) -> Unit) : AccountDeletion {
    override fun deleteAll(uid: String, username: String?, onResult: (Result<Unit>) -> Unit) = deleteLocal(onResult)
}
