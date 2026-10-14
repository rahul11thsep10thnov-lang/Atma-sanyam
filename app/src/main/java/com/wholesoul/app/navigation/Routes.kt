package com.wholesoul.app.navigation

/** Every navigable destination in the app, centralized so no screen hardcodes a route string. */
object Routes {
    const val SPLASH = "splash"
    const val ONBOARDING = "onboarding"
    const val LOGIN = "login"
    const val OTP = "otp/{mobile}"
    const val HOME = "home"
    const val CATEGORIES = "categories"
    const val PRODUCT_LISTING = "products/{categoryId}"
    const val PRODUCT_DETAILS = "product/{productId}"
    const val SEARCH = "search"
    const val CART = "cart"
    const val ADDRESS_LIST = "addresses?selectMode={selectMode}"
    const val ADD_ADDRESS = "address/add"
    const val EDIT_ADDRESS = "address/edit/{addressId}"
    const val CHECKOUT = "checkout"
    const val ORDER_CONFIRMATION = "order-confirmation/{orderId}"
    const val ORDERS = "orders"
    const val ORDER_DETAILS = "order/{orderId}"
    const val WISHLIST = "wishlist"
    const val PROFILE = "profile"
    const val OFFERS = "offers"
    const val NOTIFICATIONS = "notifications"
    const val HELP = "help"
    const val LEGAL = "legal/{docType}"
    const val ADMIN = "admin"
    const val ADMIN_PRODUCT = "admin/product/{productId}?categoryId={categoryId}"
    const val ADMIN_CATEGORY = "admin/category/{categoryId}"

    fun otp(mobile: String) = "otp/$mobile"
    fun addressList(selectMode: Boolean = false) = "addresses?selectMode=$selectMode"
    fun productListing(categoryId: String) = "products/$categoryId"
    fun productDetails(productId: String) = "product/$productId"
    fun editAddress(addressId: String) = "address/edit/$addressId"
    fun orderConfirmation(orderId: String) = "order-confirmation/$orderId"
    fun orderDetails(orderId: String) = "order/$orderId"
    fun legal(docType: String) = "legal/$docType"

    /** [productId] is `null` for a new item; [categoryId] pre-selects its category. */
    fun adminProduct(productId: String?, categoryId: String? = null) =
        "admin/product/${productId ?: "new"}" + (categoryId?.let { "?categoryId=$it" } ?: "")
    fun adminCategory(categoryId: String?) = "admin/category/${categoryId ?: "new"}"
}

enum class LegalDocType { PRIVACY_POLICY, TERMS, REFUND_POLICY, CANCELLATION_POLICY, SHIPPING_POLICY, CONTACT_US, ABOUT }
