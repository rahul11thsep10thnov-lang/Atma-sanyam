package com.rangepatte.app.data.ludo

import android.content.Context
import androidx.core.content.edit
import com.rangepatte.app.domain.ludo.LudoRecord
import com.rangepatte.app.domain.ludo.LudoState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * The lifetime Ludo record (stage 10), kept on this phone per signed-in account (demo accounts
 * included). Shown on the results dialog and on My Profile.
 */
class LudoRecordRepository(context: Context) {
    private val prefs = context.applicationContext.getSharedPreferences("ludo_record", Context.MODE_PRIVATE)
    private var me: String? = null
    private val _value = MutableStateFlow(LudoRecord())
    val value: StateFlow<LudoRecord> = _value.asStateFlow()

    fun start(uid: String) {
        me = uid
        _value.value = LudoRecord.decode(prefs.getString(uid, null))
    }

    fun stop() { me = null; _value.value = LudoRecord() }

    /** Counts a finished match in which this phone sat at [seat]. Does nothing while the match is not over. */
    fun record(state: LudoState, seat: Int) {
        val uid = me ?: return
        val next = _value.value.after(state, seat)
        if (next == _value.value) return
        _value.value = next
        prefs.edit { putString(uid, next.encode()) }
    }
}
