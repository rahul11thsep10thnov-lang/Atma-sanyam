package com.rangepatte.app.data.profile

import android.content.Context
import android.util.Log
import androidx.core.content.edit
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import com.rangepatte.app.domain.profile.Username
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** A player's public identity: what friends and opponents see. Never the phone number. */
data class PlayerProfile(val uid: String, val username: String? = null, val avatarId: String? = null) {
    /** Both steps of first-time setup are done. */
    val isComplete: Boolean get() = !username.isNullOrBlank() && !avatarId.isNullOrBlank()
}

sealed interface ClaimResult {
    data object Claimed : ClaimResult
    data object Taken : ClaimResult
    data class Failed(val error: Throwable) : ClaimResult
}

/** Where profiles and reserved usernames live: Firestore when connected, this phone otherwise. */
interface ProfileStore {
    fun load(uid: String, onResult: (Result<PlayerProfile?>) -> Unit)
    fun isUsernameTaken(normalized: String, onResult: (Result<Boolean>) -> Unit)
    /** Reserves the name for [uid] atomically: nobody else can get it even if they checked at the same moment. */
    fun claimUsername(uid: String, username: String, onResult: (ClaimResult) -> Unit)
    fun saveAvatar(uid: String, avatarId: String, onResult: (Result<Unit>) -> Unit)
}

/**
 * The signed-in player's profile, cached on the phone (so the top bar and tables know the username
 * at once) and kept in sync with the [ProfileStore].
 */
class ProfileRepository(context: Context, private val store: ProfileStore) {
    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val _profile = MutableStateFlow(loadCached())
    val profile: StateFlow<PlayerProfile?> = _profile.asStateFlow()

    /** False until the store has answered once for the current user (the setup screens wait for it). */
    private val _loaded = MutableStateFlow(false)
    val loaded: StateFlow<Boolean> = _loaded.asStateFlow()

    fun onSignedIn(uid: String) {
        if (_profile.value?.uid != uid) {
            _profile.value = PlayerProfile(uid)
            cache(_profile.value)
        }
        _loaded.value = false
        store.load(uid) { result ->
            result.onSuccess { remote -> if (remote != null && remote.uid == uid) set(remote) }
                .onFailure { Log.w(TAG, "Could not load profile", it) }
            _loaded.value = true
        }
    }

    fun onSignedOut() {
        _profile.value = null
        _loaded.value = false
        prefs.edit { clear() }
    }

    fun checkUsername(raw: String, onResult: (Result<Boolean>) -> Unit) =
        store.isUsernameTaken(Username.normalize(raw), onResult)

    fun claimUsername(raw: String, onResult: (ClaimResult) -> Unit) {
        val current = _profile.value ?: return onResult(ClaimResult.Failed(IllegalStateException("not signed in")))
        val name = raw.trim()
        store.claimUsername(current.uid, name) { result ->
            if (result == ClaimResult.Claimed) set(current.copy(username = name))
            onResult(result)
        }
    }

    fun saveAvatar(avatarId: String, onResult: (Result<Unit>) -> Unit) {
        val current = _profile.value ?: return onResult(Result.failure(IllegalStateException("not signed in")))
        set(current.copy(avatarId = avatarId)) // optimistic: the picker feels instant
        store.saveAvatar(current.uid, avatarId, onResult)
    }

    private fun set(profile: PlayerProfile) {
        _profile.value = profile
        cache(profile)
    }

    private fun cache(profile: PlayerProfile?) = prefs.edit {
        if (profile == null) clear() else {
            putString(KEY_UID, profile.uid); putString(KEY_USERNAME, profile.username); putString(KEY_AVATAR, profile.avatarId)
        }
    }

    private fun loadCached(): PlayerProfile? {
        val uid = prefs.getString(KEY_UID, null) ?: return null
        return PlayerProfile(uid, prefs.getString(KEY_USERNAME, null), prefs.getString(KEY_AVATAR, null))
    }

    private companion object {
        const val TAG = "ProfileRepository"
        const val PREFS_NAME = "profile_prefs"
        const val KEY_UID = "uid"; const val KEY_USERNAME = "username"; const val KEY_AVATAR = "avatar"
    }
}

/** Demo mode: names are reserved in this phone's preferences only. */
class LocalProfileStore(context: Context) : ProfileStore {
    private val prefs = context.getSharedPreferences("profile_store_demo", Context.MODE_PRIVATE)

    override fun load(uid: String, onResult: (Result<PlayerProfile?>) -> Unit) {
        val username = prefs.getString("u:$uid", null)
        val avatar = prefs.getString("a:$uid", null)
        onResult(Result.success(if (username == null && avatar == null) null else PlayerProfile(uid, username, avatar)))
    }

    override fun isUsernameTaken(normalized: String, onResult: (Result<Boolean>) -> Unit) =
        onResult(Result.success(prefs.contains("n:$normalized")))

    override fun claimUsername(uid: String, username: String, onResult: (ClaimResult) -> Unit) {
        val key = "n:" + Username.normalize(username)
        val owner = prefs.getString(key, null)
        if (owner != null && owner != uid) return onResult(ClaimResult.Taken)
        prefs.edit {
            prefs.getString("u:$uid", null)?.let { remove("n:" + Username.normalize(it)) }
            putString(key, uid); putString("u:$uid", username)
        }
        onResult(ClaimResult.Claimed)
    }

    override fun saveAvatar(uid: String, avatarId: String, onResult: (Result<Unit>) -> Unit) {
        prefs.edit { putString("a:$uid", avatarId) }
        onResult(Result.success(Unit))
    }
}

/**
 * Firestore: `profiles/{uid}` holds `username` and `avatarId`; `usernames/{normalized}` holds `{uid}`
 * and is created inside a transaction, so two players can never end up with the same name. Phone
 * numbers stay in the owner-only `users` collection and are never written here.
 */
class FirestoreProfileStore : ProfileStore {
    private val db get() = FirebaseFirestore.getInstance()

    override fun load(uid: String, onResult: (Result<PlayerProfile?>) -> Unit) {
        db.collection(PROFILES).document(uid).get()
            .addOnSuccessListener { doc ->
                onResult(Result.success(if (doc.exists()) PlayerProfile(uid, doc.getString("username"), doc.getString("avatarId")) else null))
            }
            .addOnFailureListener { onResult(Result.failure(it)) }
    }

    override fun isUsernameTaken(normalized: String, onResult: (Result<Boolean>) -> Unit) {
        db.collection(USERNAMES).document(normalized).get()
            .addOnSuccessListener { onResult(Result.success(it.exists())) }
            .addOnFailureListener { onResult(Result.failure(it)) }
    }

    override fun claimUsername(uid: String, username: String, onResult: (ClaimResult) -> Unit) {
        val normalized = Username.normalize(username)
        val nameRef = db.collection(USERNAMES).document(normalized)
        val profileRef = db.collection(PROFILES).document(uid)
        db.runTransaction { tx ->
            val existing = tx.get(nameRef)
            if (existing.exists() && existing.getString("uid") != uid) return@runTransaction false
            val old = tx.get(profileRef).getString("username")
            if (old != null && Username.normalize(old) != normalized) tx.delete(db.collection(USERNAMES).document(Username.normalize(old)))
            tx.set(nameRef, mapOf("uid" to uid, "claimedAt" to FieldValue.serverTimestamp()))
            tx.set(profileRef, mapOf("uid" to uid, "username" to username, "usernameLower" to normalized, "updatedAt" to FieldValue.serverTimestamp()), SetOptions.merge())
            true
        }.addOnSuccessListener { claimed -> onResult(if (claimed) ClaimResult.Claimed else ClaimResult.Taken) }
            .addOnFailureListener { onResult(ClaimResult.Failed(it)) }
    }

    override fun saveAvatar(uid: String, avatarId: String, onResult: (Result<Unit>) -> Unit) {
        db.collection(PROFILES).document(uid)
            .set(mapOf("uid" to uid, "avatarId" to avatarId, "updatedAt" to FieldValue.serverTimestamp()), SetOptions.merge())
            .addOnSuccessListener { onResult(Result.success(Unit)) }
            .addOnFailureListener { onResult(Result.failure(it)) }
    }

    private companion object { const val PROFILES = "profiles"; const val USERNAMES = "usernames" }
}
