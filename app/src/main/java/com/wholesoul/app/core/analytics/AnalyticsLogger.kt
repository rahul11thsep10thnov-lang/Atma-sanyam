package com.wholesoul.app.core.analytics

/**
 * Provider-agnostic analytics event (spec section 37). Screens/ViewModels call
 * [AnalyticsLogger.log] only — never a Firebase/Segment/Mixpanel API directly — so the
 * provider can be swapped centrally in di/AppModule.
 */
sealed class AnalyticsEvent(val name: String, val params: Map<String, Any?> = emptyMap()) {
    data object AppOpened : AnalyticsEvent("app_opened")
    data class SearchPerformed(val query: String) : AnalyticsEvent("search_performed", mapOf("query" to query))
    data class ProductViewed(val productId: String) : AnalyticsEvent("product_viewed", mapOf("product_id" to productId))
    data class ProductAddedToCart(val productId: String, val quantity: Int) :
        AnalyticsEvent("product_added_to_cart", mapOf("product_id" to productId, "quantity" to quantity))
    data class ProductRemovedFromCart(val productId: String) :
        AnalyticsEvent("product_removed_from_cart", mapOf("product_id" to productId))
    data object CheckoutStarted : AnalyticsEvent("checkout_started")
    data class PaymentInitiated(val method: String) : AnalyticsEvent("payment_initiated", mapOf("method" to method))
    data class OrderPlaced(val orderId: String, val amount: Double) :
        AnalyticsEvent("order_placed", mapOf("order_id" to orderId, "amount" to amount))
    data class CouponApplied(val code: String) : AnalyticsEvent("coupon_applied", mapOf("code" to code))
    data class ProductPurchased(val productId: String) : AnalyticsEvent("product_purchased", mapOf("product_id" to productId))
    data class WishlistAdded(val productId: String) : AnalyticsEvent("wishlist_added", mapOf("product_id" to productId))
}

interface AnalyticsLogger {
    fun log(event: AnalyticsEvent)
}
