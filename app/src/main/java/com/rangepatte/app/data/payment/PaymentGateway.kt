package com.rangepatte.app.data.payment

import android.app.Activity

/** What the customer is paying for. Amounts are in paise (₹29 = 2900) to avoid rounding errors. */
data class PaymentOrder(
    val orderId: String,
    val amountPaise: Long,
    val currency: String,
    val description: String,
    val customerPhone: String?
)

enum class PaymentMethod { UPI, CARD, NET_BANKING, WALLET }

sealed interface PaymentResult {
    data class Success(val paymentId: String) : PaymentResult
    data class Failed(val reason: String?) : PaymentResult
    data object Cancelled : PaymentResult
    /** No payment partner is connected yet — nothing was charged. */
    data object NotConfigured : PaymentResult
}

/**
 * The one seam between the app and a payment partner (Razorpay, PayU, Cashfree, Google Play
 * Billing …). The checkout screen only ever talks to this interface, so plugging a partner in
 * means writing one class that implements it and returning it from
 * [com.rangepatte.app.AppServices.paymentGateway] — no screen changes.
 *
 * A real implementation must confirm every payment on a server (the partner's webhook / order
 * verification) before granting membership; never trust a success reported only by the phone.
 */
interface PaymentGateway {
    /** False while no partner is connected; the checkout screen then explains that payments are not live yet. */
    val isConfigured: Boolean

    fun startPayment(
        activity: Activity,
        order: PaymentOrder,
        method: PaymentMethod,
        onResult: (PaymentResult) -> Unit
    )
}

/** Stand-in used until a real partner is chosen: never charges anything, always reports [PaymentResult.NotConfigured]. */
object PlaceholderPaymentGateway : PaymentGateway {
    override val isConfigured: Boolean = false

    override fun startPayment(
        activity: Activity,
        order: PaymentOrder,
        method: PaymentMethod,
        onResult: (PaymentResult) -> Unit
    ) {
        onResult(PaymentResult.NotConfigured)
    }
}
