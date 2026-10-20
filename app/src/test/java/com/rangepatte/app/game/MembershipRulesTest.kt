package com.rangepatte.app.game

import com.rangepatte.app.data.membership.MembershipPlan
import com.rangepatte.app.data.membership.MembershipRules
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.concurrent.TimeUnit

class MembershipRulesTest {
    @Test
    fun anActiveSubscriptionKeepsAdsOffForTheGraceWindowOnly() {
        val now = 1_000_000L
        assertEquals(now + TimeUnit.DAYS.toMillis(MembershipRules.GRACE_DAYS), MembershipRules.adFreeUntil(true, now))
    }

    @Test
    fun noSubscriptionMeansNoMembership() {
        assertEquals(0L, MembershipRules.adFreeUntil(false, 5_000L))
    }

    @Test
    fun onlyAPaidPurchaseOfThePlanCounts() {
        val plan = MembershipPlan.PRODUCT_ID
        assertTrue(MembershipRules.isActive(listOf(plan), true, plan))
        assertFalse("a pending or refunded purchase is not active", MembershipRules.isActive(listOf(plan), false, plan))
        assertFalse("some other product is not the plan", MembershipRules.isActive(listOf("other"), true, plan))
    }
}
