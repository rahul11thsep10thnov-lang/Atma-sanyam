package com.rangepatte.app.data.auth

import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import com.rangepatte.app.BuildConfig

/**
 * The online "users" database the app owner analyses. Each signed-up player is one document in the
 * Firestore collection [COLLECTION], keyed by their user id, with: phone number, name, app
 * language, membership end date, sign-up time, last-login time, platform and app version. Open it
 * in the Firebase console (Firestore Database ▸ users) or export it to BigQuery/Sheets for analysis.
 */
interface UserDirectory {
    fun saveUser(profile: UserProfile, languageTag: String, adFreeUntilMillis: Long)
}

/** Used in demo mode (Firebase not connected): nothing leaves the phone. */
object LocalOnlyUserDirectory : UserDirectory {
    override fun saveUser(profile: UserProfile, languageTag: String, adFreeUntilMillis: Long) = Unit
}

class FirestoreUserDirectory : UserDirectory {
    private val db: FirebaseFirestore = FirebaseFirestore.getInstance()

    override fun saveUser(profile: UserProfile, languageTag: String, adFreeUntilMillis: Long) {
        val doc = db.collection(COLLECTION).document(profile.uid)
        val data = hashMapOf<String, Any?>(
            "uid" to profile.uid,
            "phoneNumber" to profile.phoneNumber,
            "displayName" to profile.displayName,
            "language" to languageTag,
            "adFreeUntil" to adFreeUntilMillis,
            "isMember" to (adFreeUntilMillis > System.currentTimeMillis()),
            "lastLoginAt" to FieldValue.serverTimestamp(),
            "platform" to "android",
            "appVersion" to BuildConfig.VERSION_NAME
        )
        // Only stamp the sign-up time the first time this user is seen.
        doc.get()
            .addOnSuccessListener { snapshot ->
                if (!snapshot.exists()) data["signedUpAt"] = FieldValue.serverTimestamp()
                doc.set(data, SetOptions.merge())
            }
            .addOnFailureListener { doc.set(data, SetOptions.merge()) }
    }

    companion object {
        const val COLLECTION = "users"
    }
}
