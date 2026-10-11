package com.rangepatte.app.data.profile

import android.content.Context
import android.util.Log
import androidx.core.content.edit
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import com.rangepatte.app.domain.profile.ProfileRules
import com.rangepatte.app.domain.profile.Username
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** A player's public identity: what friends and opponents see. Never the phone number. */
data class PlayerProfile(
    val uid: String,
    val username: String? = null,
    val avatarId: String? = null,
    /** When the username was last set (ms); 0 if never. Element 16: one change every 30 days. */
    val usernameChangedAt: Long = 0,
    /** Element 16: the player lets contacts find them by phone (a hashed number is stored). */
    val phoneDiscoverable: Boolean = false,
    /** When the profile was first created (ms); 0 if unknown. */
    val createdAt: Long = 0
) {
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
    /** Element 16: store (or clear, with null) the hashed phone number that contact search matches. */
    fun savePhoneHash(uid: String, hash: String?, onResult: (Result<Unit>) -> Unit)
    /** Element 16: remove the profile, its username reservation and presence. Relations go with a Cloud Function (README). */
    fun deleteProfile(uid: String, username: String?, onResult: (Result<Unit>) -> Unit)
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
            if (result == ClaimResult.Claimed) set(current.copy(username = name, usernameChangedAt = if (current.username == null) current.usernameChangedAt else System.currentTimeMillis()))
            onResult(result)
        }
    }

    /** Element 16: a username may be changed once every 30 days (the first one is free). */
    fun canChangeUsername(now: Long = System.currentTimeMillis()): Boolean =
        _profile.value?.let { com.rangepatte.app.domain.profile.ProfileRules.canChangeUsername(it.usernameChangedAt, now) } ?: false

    /** Element 16: let contacts find me by phone (stores a SHA-256 of the E.164 number), or stop. */
    fun setPhoneDiscoverable(phoneE164: String, enabled: Boolean, onResult: (Result<Unit>) -> Unit = {}) {
        val current = _profile.value ?: return
        set(current.copy(phoneDiscoverable = enabled))
        store.savePhoneHash(current.uid, if (enabled) com.rangepatte.app.data.friends.FirestoreFriendsStore.phoneHash(phoneE164) else null, onResult)
    }

    /** Element 16: delete what the profile holds; the caller signs out afterwards. */
    fun deleteProfile(onResult: (Result<Unit>) -> Unit) {
        val current = _profile.value ?: return onResult(Result.failure(IllegalStateException("not signed in")))
        store.deleteProfile(current.uid, current.username, onResult)
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
            putLong("changedAt", profile.usernameChangedAt); putBoolean("phoneDiscoverable", profile.phoneDiscoverable); putLong("createdAt", profile.createdAt)
        }
    }

    private fun loadCached(): PlayerProfile? {
        val uid = prefs.getString(KEY_UID, null) ?: return null
        return PlayerProfile(uid, prefs.getString(KEY_USERNAME, null), prefs.getString(KEY_AVATAR, null), prefs.getLong("changedAt", 0), prefs.getBoolean("phoneDiscoverable", false), prefs.getLong("createdAt", 0))
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
        onResult(Result.success(if (username == null && avatar == null) null else PlayerProfile(uid, username, avatar, prefs.getLong("c:$uid", 0), prefs.contains("h:$uid"), prefs.getLong("born:$uid", 0))))
    }

    private fun free(normalized: String, now: Long) =
        ProfileRules.isNameFree(prefs.contains("n:$normalized"), prefs.getLong("r:$normalized", -1).takeIf { it >= 0 }, now)

    override fun isUsernameTaken(normalized: String, onResult: (Result<Boolean>) -> Unit) =
        onResult(Result.success(!free(normalized, System.currentTimeMillis())))

    override fun claimUsername(uid: String, username: String, onResult: (ClaimResult) -> Unit) {
        val normalized = Username.normalize(username)
        val key = "n:$normalized"
        val owner = prefs.getString(key, null)
        val now = System.currentTimeMillis()
        if (owner != null && owner != uid && !free(normalized, now)) return onResult(ClaimResult.Taken)
        prefs.edit {
            val old = prefs.getString("u:$uid", null)
            // The old name stays reserved for 30 days (released, not deleted), then anyone may take it.
            if (old != null && Username.normalize(old) != normalized) { putLong("r:" + Username.normalize(old), now); putLong("c:$uid", now) }
            if (old == null) putLong("born:$uid", now)
            putString(key, uid); remove("r:$normalized"); putString("u:$uid", username)
        }
        onResult(ClaimResult.Claimed)
    }

    override fun saveAvatar(uid: String, avatarId: String, onResult: (Result<Unit>) -> Unit) {
        prefs.edit { putString("a:$uid", avatarId) }
        onResult(Result.success(Unit))
    }

    override fun savePhoneHash(uid: String, hash: String?, onResult: (Result<Unit>) -> Unit) {
        prefs.edit { if (hash == null) remove("h:$uid") else putString("h:$uid", hash) }
        onResult(Result.success(Unit))
    }

    override fun deleteProfile(uid: String, username: String?, onResult: (Result<Unit>) -> Unit) {
        prefs.edit {
            username?.let { remove("n:" + Username.normalize(it)) }
            listOf("u:", "a:", "c:", "h:", "born:").forEach { remove(it + uid) }
        }
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
                onResult(Result.success(if (doc.exists()) PlayerProfile(
                    uid, doc.getString("username"), doc.getString("avatarId"),
                    usernameChangedAt = doc.getLong("usernameChangedAt") ?: 0,
                    phoneDiscoverable = doc.getString("phoneHash") != null,
                    createdAt = doc.getTimestamp("createdAt")?.toDate()?.time ?: 0
                ) else null))
            }
            .addOnFailureListener { onResult(Result.failure(it)) }
    }

    override fun isUsernameTaken(normalized: String, onResult: (Result<Boolean>) -> Unit) {
        db.collection(USERNAMES).document(normalized).get()
            .addOnSuccessListener { onResult(Result.success(!ProfileRules.isNameFree(it.exists(), it.getLong("releasedAt"), System.currentTimeMillis()))) }
            .addOnFailureListener { onResult(Result.failure(it)) }
    }

    override fun claimUsername(uid: String, username: String, onResult: (ClaimResult) -> Unit) {
        val normalized = Username.normalize(username)
        val nameRef = db.collection(USERNAMES).document(normalized)
        val profileRef = db.collection(PROFILES).document(uid)
        val now = System.currentTimeMillis()
        db.runTransaction { tx ->
            val existing = tx.get(nameRef)
            if (existing.exists() && existing.getString("uid") != uid && !ProfileRules.isNameFree(true, existing.getLong("releasedAt"), now)) return@runTransaction false
            val profileDoc = tx.get(profileRef)
            val old = profileDoc.getString("username")
            val renaming = old != null && Username.normalize(old) != normalized
            // The old name stays reserved for 30 days (released, not deleted), then anyone may take it.
            if (renaming) tx.set(db.collection(USERNAMES).document(Username.normalize(old!!)), mapOf("releasedAt" to now), SetOptions.merge())
            tx.set(nameRef, mapOf("uid" to uid, "claimedAt" to FieldValue.serverTimestamp(), "releasedAt" to FieldValue.delete()), SetOptions.merge())
            val fields = mutableMapOf<String, Any>("uid" to uid, "username" to username, "usernameLower" to normalized, "updatedAt" to FieldValue.serverTimestamp())
            if (renaming) fields["usernameChangedAt"] = now
            if (!profileDoc.exists()) fields["createdAt"] = FieldValue.serverTimestamp()
            tx.set(profileRef, fields, SetOptions.merge())
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

    override fun savePhoneHash(uid: String, hash: String?, onResult: (Result<Unit>) -> Unit) {
        db.collection(PROFILES).document(uid)
            .set(mapOf("phoneHash" to (hash ?: FieldValue.delete())), SetOptions.merge())
            .addOnSuccessListener { onResult(Result.success(Unit)) }
            .addOnFailureListener { onResult(Result.failure(it)) }
    }

    override fun deleteProfile(uid: String, username: String?, onResult: (Result<Unit>) -> Unit) {
        val batch = db.batch()
        batch.delete(db.collection(PROFILES).document(uid))
        username?.let { batch.delete(db.collection(USERNAMES).document(Username.normalize(it))) }
        batch.delete(db.collection("presence").document(uid))
        batch.commit().addOnSuccessListener { onResult(Result.success(Unit)) }.addOnFailureListener { onResult(Result.failure(it)) }
    }

    private companion object { const val PROFILES = "profiles"; const val USERNAMES = "usernames" }
}
