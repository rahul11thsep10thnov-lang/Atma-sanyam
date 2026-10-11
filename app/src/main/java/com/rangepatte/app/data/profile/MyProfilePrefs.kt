package com.rangepatte.app.data.profile

import android.content.Context
import androidx.core.content.edit
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** The switches on My Profile (Element 16) that live on the phone, per account. */
data class MyProfileSettings(
    /** Off: play requests sent to me are declined at once ("not available"). */
    val acceptPlayRequests: Boolean = true,
    val notifyFriendRequests: Boolean = true,
    val notifyPlayRequests: Boolean = true,
    /** Friends whose "came online" I want to hear about (off for everyone by default). */
    val onlineWatch: Set<String> = emptySet()
)

class MyProfilePrefsRepository(context: Context) {
    private val prefs = context.applicationContext.getSharedPreferences("my_profile", Context.MODE_PRIVATE)
    private var me: String? = null
    private val _value = MutableStateFlow(MyProfileSettings())
    val value: StateFlow<MyProfileSettings> = _value.asStateFlow()

    fun start(uid: String) {
        me = uid
        _value.value = MyProfileSettings(
            acceptPlayRequests = prefs.getBoolean("$uid:acceptPlay", true),
            notifyFriendRequests = prefs.getBoolean("$uid:notifyFriend", true),
            notifyPlayRequests = prefs.getBoolean("$uid:notifyPlay", true),
            onlineWatch = prefs.getStringSet("$uid:onlineWatch", emptySet()).orEmpty().toSet()
        )
    }

    fun stop() { me = null; _value.value = MyProfileSettings() }

    fun update(change: (MyProfileSettings) -> MyProfileSettings) {
        val uid = me ?: return
        val next = change(_value.value)
        _value.value = next
        prefs.edit {
            putBoolean("$uid:acceptPlay", next.acceptPlayRequests); putBoolean("$uid:notifyFriend", next.notifyFriendRequests)
            putBoolean("$uid:notifyPlay", next.notifyPlayRequests); putStringSet("$uid:onlineWatch", next.onlineWatch)
        }
    }
}
