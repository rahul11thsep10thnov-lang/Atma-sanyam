package com.rangepatte.app.data.payment

import android.app.Activity
import android.content.Context
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import com.rangepatte.app.data.membership.MembershipPlan
import com.rangepatte.app.data.membership.MembershipRepository
import com.rangepatte.app.data.membership.MembershipRules
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

/** What the checkout page needs to know about Google Play Billing right now. */
data class BillingState(
    /** Billing is connected and the subscription's details were found in Play Console. */
    val canSubscribe: Boolean = false,
    /** The price text from Google Play (e.g. "₹29.00"), in the player's currency; null until known. */
    val price: String? = null,
    /** Play says the subscription is active. */
    val subscribed: Boolean = false,
    /** A purchase is waiting for payment approval (Play's "pending"). */
    val pending: Boolean = false,
    /** True while Google Play's purchase sheet is open. */
    val busy: Boolean = false,
    val message: BillingMessage? = null
)

enum class BillingMessage { UNAVAILABLE, CANCELLED, FAILED, ALREADY_SUBSCRIBED }

/**
 * Google Play Billing for the ad-free subscription ([MembershipPlan.PRODUCT_ID]). Play is the source of
 * truth: at start and at every return to the app the phone asks Play for the player's subscriptions and
 * stores the answer through [MembershipRepository.setPlayEntitlement]. A new purchase is acknowledged
 * (Play refunds unacknowledged purchases after three days) and then read the same way.
 *
 * Entitlement is decided on the phone from Play's own purchase list. Checking a purchase token on a
 * server (Google Play Developer API / real-time notifications) is the stronger design and is listed in
 * the launch documents as an owner follow-up; nothing here grants a membership without Play's say-so.
 */
class PlayBilling(context: Context, private val membership: MembershipRepository) : PurchasesUpdatedListener {
    private val _state = MutableStateFlow(BillingState())
    val state: StateFlow<BillingState> = _state.asStateFlow()

    private var details: ProductDetails? = null

    private val client: BillingClient = BillingClient.newBuilder(context.applicationContext)
        .setListener(this)
        .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
        .enableAutoServiceReconnection()
        .build()

    /** Connects to Google Play and loads the product and the player's subscriptions. Safe to call again. */
    fun connect() {
        if (client.isReady) { loadProduct(); refreshPurchases(); return }
        client.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                if (result.responseCode == BillingClient.BillingResponseCode.OK) { loadProduct(); refreshPurchases() }
                else _state.update { it.copy(canSubscribe = false, message = BillingMessage.UNAVAILABLE) }
            }

            // enableAutoServiceReconnection() reconnects by itself; nothing to do here.
            override fun onBillingServiceDisconnected() = Unit
        })
    }

    private fun loadProduct() {
        val product = QueryProductDetailsParams.Product.newBuilder()
            .setProductId(MembershipPlan.PRODUCT_ID)
            .setProductType(BillingClient.ProductType.SUBS)
            .build()
        client.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(listOf(product)).build()) { result, queryResult ->
            val found = if (result.responseCode == BillingClient.BillingResponseCode.OK) queryResult.productDetailsList.firstOrNull() else null
            details = found
            val offer = found?.subscriptionOfferDetails?.firstOrNull()
            val price = offer?.pricingPhases?.pricingPhaseList?.lastOrNull()?.formattedPrice
            _state.update { it.copy(canSubscribe = offer != null, price = price) }
        }
    }

    /** Asks Play which subscriptions the player has and stores the answer. Call at start and on every resume. */
    fun refreshPurchases() {
        if (!client.isReady) return
        client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build()) { result, purchases ->
            // A failed query says nothing about the subscription: keep what is stored.
            if (result.responseCode == BillingClient.BillingResponseCode.OK) apply(purchases)
        }
    }

    /** Opens Google Play's purchase sheet for the subscription. */
    fun subscribe(activity: Activity) {
        val d = details
        val offer = d?.subscriptionOfferDetails?.firstOrNull()
        if (d == null || offer == null || !client.isReady) {
            _state.update { it.copy(message = BillingMessage.UNAVAILABLE) }
            connect()
            return
        }
        if (_state.value.subscribed) { _state.update { it.copy(message = BillingMessage.ALREADY_SUBSCRIBED) }; return }
        val params = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(d).setOfferToken(offer.offerToken).build()
        val flow = BillingFlowParams.newBuilder().setProductDetailsParamsList(listOf(params)).build()
        _state.update { it.copy(busy = true, message = null) }
        val launched = client.launchBillingFlow(activity, flow)
        if (launched.responseCode != BillingClient.BillingResponseCode.OK) {
            _state.update { it.copy(busy = false, message = BillingMessage.FAILED) }
        }
    }

    fun clearMessage() = _state.update { it.copy(message = null) }

    override fun onPurchasesUpdated(result: BillingResult, purchases: MutableList<Purchase>?) {
        when (result.responseCode) {
            BillingClient.BillingResponseCode.OK -> { _state.update { it.copy(busy = false) }; apply(purchases.orEmpty()) }
            BillingClient.BillingResponseCode.USER_CANCELED -> _state.update { it.copy(busy = false, message = BillingMessage.CANCELLED) }
            BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED -> { _state.update { it.copy(busy = false) }; refreshPurchases() }
            else -> _state.update { it.copy(busy = false, message = BillingMessage.FAILED) }
        }
    }

    /** Acknowledges new purchases and stores whether the plan is paid for. */
    private fun apply(purchases: List<Purchase>) {
        val mine = purchases.filter { MembershipPlan.PRODUCT_ID in it.products }
        val paid = mine.filter { it.purchaseState == Purchase.PurchaseState.PURCHASED }
        paid.filter { !it.isAcknowledged }.forEach { purchase ->
            client.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(purchase.purchaseToken).build()) { /* read again on the next refresh if this failed */ }
        }
        val active = paid.any { MembershipRules.isActive(it.products, true, MembershipPlan.PRODUCT_ID) }
        val pending = mine.any { it.purchaseState == Purchase.PurchaseState.PENDING }
        membership.setPlayEntitlement(active)
        _state.update { it.copy(subscribed = active, pending = pending && !active) }
    }
}
