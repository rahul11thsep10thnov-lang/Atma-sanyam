package com.rangepatte.app.data.membership

import android.content.Context
import androidx.core.content.edit
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.concurrent.TimeUnit

/**
 * Remembers until when this device is ad-free. Stored locally so the app knows instantly at start-up
 * (before any network call) whether to show ads; the same date is also written to the signed-in
 * user's record in the online database (see [com.rangepatte.app.data.auth.AccountRepository]).
 */
class MembershipRepository(context: Context) {
    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val _adFreeUntilMillis = MutableStateFlow(prefs.getLong(KEY_AD_FREE_UNTIL, 0L))

    /** Epoch millis until which no ads are shown; 0 means never a member. */
    val adFreeUntilMillis: StateFlow<Long> = _adFreeUntilMillis.asStateFlow()

    fun isAdFree(nowMillis: Long = System.currentTimeMillis()): Boolean = _adFreeUntilMillis.value > nowMillis

    /** Stores what Google Play just said about the subscription (see [MembershipRules]). */
    fun setPlayEntitlement(active: Boolean, nowMillis: Long = System.currentTimeMillis()) {
        setAdFreeUntil(MembershipRules.adFreeUntil(active, nowMillis))
    }

    /** Debug builds only (the checkout's "simulate" button): adds one month, starting now or — if still a member — from the current end date. */
    fun addPaidMonth(nowMillis: Long = System.currentTimeMillis()): Long {
        val start = maxOf(nowMillis, _adFreeUntilMillis.value)
        val until = start + TimeUnit.DAYS.toMillis(MembershipPlan.DURATION_DAYS)
        setAdFreeUntil(until)
        return until
    }

    fun setAdFreeUntil(untilMillis: Long) {
        prefs.edit { putLong(KEY_AD_FREE_UNTIL, untilMillis) }
        _adFreeUntilMillis.value = untilMillis
    }

    private companion object {
        const val PREFS_NAME = "membership_prefs"
        const val KEY_AD_FREE_UNTIL = "ad_free_until"
    }
}
