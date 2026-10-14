package com.atmasanyam.delivery.core.data

import android.content.Context
import com.atmasanyam.delivery.core.model.AccountState
import com.atmasanyam.delivery.core.model.BookingRecord
import com.atmasanyam.delivery.core.model.BookingStatus
import com.atmasanyam.delivery.core.model.FavoriteLocation
import com.atmasanyam.delivery.core.model.InAppNotification
import com.atmasanyam.delivery.core.model.NotificationType
import com.atmasanyam.delivery.core.model.SavedAddressLabel
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject

/**
 * Device-local persistence for the signed-in account. There is no server yet (the backend is
 * Phase 12), so the "session" is just the phone number that last signed in, and that user's
 * profile / favorites / bookings / notifications are stored under their own key.
 *
 * Logging out forgets only the session; the per-user data stays so signing back in restores it.
 * Deleting the account removes the per-user data as well. Both use commit() so the change is
 * on disk before the UI reports it as done.
 */
class AccountStore(context: Context) {
    private val prefs = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    /** The account that was signed in when the app last ran, or a guest [AccountState] if none. */
    fun restore(): AccountState {
        val phone = prefs.getString(KEY_SESSION_PHONE, null)
        return if (phone.isNullOrBlank()) AccountState() else load(phone)
    }

    fun load(phoneNumber: String): AccountState {
        val json = prefs.getString(dataKey(phoneNumber), null) ?: return AccountState(phoneNumber = phoneNumber)
        return try {
            decode(phoneNumber, JSONObject(json))
        } catch (e: JSONException) {
            // Corrupt data must never lock the user out of signing in.
            AccountState(phoneNumber = phoneNumber)
        }
    }

    /** Persists [state] and marks its phone number as the signed-in session. No-op for a guest state. */
    fun save(state: AccountState): Boolean {
        val phone = state.phoneNumber ?: return false
        return prefs.edit()
            .putString(dataKey(phone), encode(state).toString())
            .putString(KEY_SESSION_PHONE, phone)
            .commit()
    }

    /** Ends the session but keeps the user's data on the device. */
    fun clearSession(): Boolean = prefs.edit().remove(KEY_SESSION_PHONE).commit()

    /** Ends the session and erases everything stored for [phoneNumber]. */
    fun deleteAll(phoneNumber: String): Boolean =
        prefs.edit().remove(KEY_SESSION_PHONE).remove(dataKey(phoneNumber)).commit()

    private fun dataKey(phoneNumber: String) = "$KEY_DATA_PREFIX$phoneNumber"

    private fun encode(state: AccountState): JSONObject = JSONObject().apply {
        put("displayName", state.displayName)
        put(
            "favorites",
            JSONArray().apply {
                state.favorites.forEach {
                    put(JSONObject().put("id", it.id).put("label", it.label.name).put("address", it.address))
                }
            },
        )
        put(
            "bookings",
            JSONArray().apply {
                state.bookings.forEach {
                    put(
                        JSONObject()
                            .put("id", it.bookingId)
                            .put("createdAt", it.createdAtEpochMillis)
                            .put("pickup", it.pickupAddress)
                            .put("destination", it.destinationAddress)
                            .put("vehicle", it.vehicleName)
                            .put("fare", it.totalFare ?: JSONObject.NULL)
                            .put("status", it.status.name),
                    )
                }
            },
        )
        put(
            "notifications",
            JSONArray().apply {
                state.notifications.forEach {
                    put(
                        JSONObject()
                            .put("id", it.id)
                            .put("type", it.type.name)
                            .put("bookingId", it.bookingId ?: JSONObject.NULL)
                            .put("createdAt", it.createdAtEpochMillis)
                            .put("read", it.read),
                    )
                }
            },
        )
    }

    private fun decode(phoneNumber: String, json: JSONObject): AccountState {
        val favorites = json.optJSONArray("favorites").objects().map {
            FavoriteLocation(
                id = it.getString("id"),
                label = enumOrDefault(it.optString("label"), SavedAddressLabel.OTHER),
                address = it.getString("address"),
            )
        }
        val bookings = json.optJSONArray("bookings").objects().map {
            BookingRecord(
                bookingId = it.getString("id"),
                createdAtEpochMillis = it.getLong("createdAt"),
                pickupAddress = it.optString("pickup"),
                destinationAddress = it.optString("destination"),
                vehicleName = it.optString("vehicle"),
                totalFare = if (it.isNull("fare")) null else it.getDouble("fare"),
                status = enumOrDefault(it.optString("status"), BookingStatus.SEARCHING),
            )
        }
        val notifications = json.optJSONArray("notifications").objects().map {
            InAppNotification(
                id = it.getString("id"),
                type = enumOrDefault(it.optString("type"), NotificationType.BOOKING_CONFIRMED),
                bookingId = if (it.isNull("bookingId")) null else it.getString("bookingId"),
                createdAtEpochMillis = it.getLong("createdAt"),
                read = it.optBoolean("read"),
            )
        }
        return AccountState(
            phoneNumber = phoneNumber,
            displayName = json.optString("displayName"),
            favorites = favorites,
            bookings = bookings,
            notifications = notifications,
        )
    }

    private fun JSONArray?.objects(): List<JSONObject> =
        if (this == null) emptyList() else (0 until length()).map { getJSONObject(it) }

    private inline fun <reified E : Enum<E>> enumOrDefault(name: String, default: E): E =
        enumValues<E>().firstOrNull { it.name == name } ?: default

    private companion object {
        const val PREFS_NAME = "lokrath_account"
        const val KEY_SESSION_PHONE = "session_phone"
        const val KEY_DATA_PREFIX = "data_"
    }
}
