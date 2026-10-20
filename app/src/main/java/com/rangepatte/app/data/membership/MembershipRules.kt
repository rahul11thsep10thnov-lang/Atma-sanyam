package com.rangepatte.app.data.membership

import java.util.concurrent.TimeUnit

/**
 * The paid "community pal" plan: an auto-renewing monthly subscription that removes ads and unlocks
 * Undo. [PRODUCT_ID] must match the subscription created in Play Console (Monetize ▸ Subscriptions),
 * which carries the real price (₹29 per month is the intended one). The price shown in the app always
 * comes from Google Play, never from this file.
 */
object MembershipPlan {
    const val PRODUCT_ID = "remove_ads_monthly"
    const val DURATION_DAYS = 30L
}

/**
 * The pure rule behind the ad-free membership. Google Play says whether the subscription is active; the
 * phone keeps ads off until [GRACE_DAYS] after the last time Play confirmed it, so a short loss of
 * network never turns the ads back on, and a cancelled or expired subscription ends within that window
 * (Play is asked again at every start and every return to the app).
 */
object MembershipRules {
    const val GRACE_DAYS = 3L

    /** The "ad-free until" time to store after Play answered [active] at [nowMillis]; 0 when not a member. */
    fun adFreeUntil(active: Boolean, nowMillis: Long): Long =
        if (active) nowMillis + TimeUnit.DAYS.toMillis(GRACE_DAYS) else 0L

    /** True when [purchaseState] (Play's code) for [productIds] means the plan is paid for right now. */
    fun isActive(productIds: List<String>, purchaseStateIsPurchased: Boolean, planProductId: String): Boolean =
        purchaseStateIsPurchased && planProductId in productIds
}
