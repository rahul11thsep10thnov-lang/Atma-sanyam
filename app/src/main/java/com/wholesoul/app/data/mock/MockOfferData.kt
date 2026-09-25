package com.wholesoul.app.data.mock

import com.wholesoul.app.domain.model.CouponType
import com.wholesoul.app.domain.model.Coupon
import com.wholesoul.app.domain.model.Offer
import com.wholesoul.app.domain.model.ProductCategory

object MockOfferData {

    val coupons: List<Coupon> by lazy {
        listOf(
            Coupon("FIRST50", "Rs 50 off on first order", "Get flat Rs 50 off on your first WHOLESOUL order", CouponType.FLAT, 50.0, minOrderValue = 199.0, expiryLabel = "Valid till you place your first order"),
            Coupon("FRESH20", "20% off on fruits", "20% off on all fresh fruits, up to Rs 80", CouponType.PERCENTAGE, 20.0, minOrderValue = 150.0, maxDiscount = 80.0, expiryLabel = "Valid this week"),
            Coupon("FREEDEL", "Free delivery", "Free delivery on orders above Rs 299", CouponType.FREE_DELIVERY, 0.0, minOrderValue = 299.0, expiryLabel = "Always on"),
            Coupon("FLOWER15", "15% off puja & flowers", "15% off on flowers, garlands and puja items", CouponType.PERCENTAGE, 15.0, minOrderValue = 100.0, maxDiscount = 60.0, expiryLabel = "Valid on festival days"),
            Coupon("COMBO30", "Rs 30 off on combo orders", "Rs 30 off when you buy 2 or more categories together", CouponType.FLAT, 30.0, minOrderValue = 250.0, expiryLabel = "Limited period offer"),
        )
    }

    val offers: List<Offer> by lazy {
        listOf(
            Offer("o1", "20% OFF fruits", "On all fresh fruits this week", "offers/fruits-20-off", "FRESH20", ProductCategory.FRUITS),
            Offer("o2", "Rs 50 OFF on first order", "New to WHOLESOUL? This one's on us", "offers/first-order-50", "FIRST50", null),
            Offer("o3", "Free delivery above Rs 299", "No delivery fee on your basket", "offers/free-delivery", "FREEDEL", null),
            Offer("o4", "Combo offers", "Save more when you shop across categories", "offers/combo", "COMBO30", null),
            Offer("o5", "Festival offers", "Special prices on puja essentials this season", "offers/festival", "FLOWER15", ProductCategory.PUJA_ITEMS),
            Offer("o6", "Flower offers", "Fresh garlands and blooms at better prices", "offers/flowers", "FLOWER15", ProductCategory.FLOWERS),
            Offer("o7", "Puja offers", "Everything for your puja thali, discounted", "offers/puja", "FLOWER15", ProductCategory.PUJA_ITEMS),
        )
    }
}
