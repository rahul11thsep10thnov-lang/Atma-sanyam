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
class LudoRecordRepository(context: Context, prefsName: String = "ludo_record") {
    private val prefs = context.applicationContext.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
    private var me: String? = null
    private val _value = MutableStateFlow(LudoRecord())
    val value: StateFlow<LudoRecord> = _value.asStateFlow()

    fun start(uid: String) {
        me = uid
        _value.value = LudoRecord.decode(prefs.getString(uid, null))
    }

    fun stop() { me = null; _value.value = LudoRecord() }

    /** Counts a finished match in which this phone sat at [seat]. Does nothing while the match is not over. */
    fun record(state: LudoState, seat: Int) = store(_value.value.after(state, seat))

    /** The same for a Moksha Patam match. */
    fun record(state: com.rangepatte.app.domain.snakes.SnakesState, seat: Int) {
        if (state.phase != com.rangepatte.app.domain.snakes.SnakesPhase.OVER || seat !in state.players.indices) return
        val place = state.places.indexOf(seat) + 1
        val r = _value.value
        store(r.copy(played = r.played + 1, won = r.won + (if (place == 1) 1 else 0), second = r.second + (if (place == 2) 1 else 0), third = r.third + (if (place == 3) 1 else 0), captures = r.captures + state.statsOf(seat).captures))
    }

    private fun store(next: LudoRecord) {
        val uid = me ?: return
        if (next == _value.value) return
        _value.value = next
        prefs.edit { putString(uid, next.encode()) }
    }
}
