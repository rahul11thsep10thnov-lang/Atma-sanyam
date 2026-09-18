package com.wholesoul.app.domain.model

/** Top-level catalog grouping. Kept as a plain enum so an admin panel can later map DB rows 1:1. */
enum class ProductCategory(val displayName: String) {
    FRUITS("Fruits"),
    VEGETABLES("Vegetables"),
    FLOWERS("Flowers"),
    GARLANDS("Garlands"),
    PUJA_ITEMS("Puja Items"),
    GROCERY("Grocery"),
    DAIRY("Dairy"),
    SNACKS("Snacks"),
    BEVERAGES("Beverages"),
    HOUSEHOLD("Household"),
    PERSONAL_CARE("Personal Care"),
    OTHER("Other"),
}

data class Review(
    val id: String,
    val productId: String,
    val userName: String,
    val rating: Float,
    val comment: String,
    val createdAtEpochMillis: Long,
)

/**
 * Extra context shown on the product details page for fresh produce, per spec section 12.
 * Null for non-perishable categories.
 */
data class FreshnessInfo(
    val harvestedDaysAgo: Int,
    val sourceFarm: String,
    val qualityGrade: String,
)

/** Extra context shown for flowers/garlands per spec section 12. */
data class FlowerInfo(
    val flowerType: String,
    val weightPerBunchGrams: Int,
    val approxCount: Int,
    val useCase: String,
)

data class Product(
    val id: String,
    val name: String,
    val category: ProductCategory,
    val subCategory: String,
    val description: String,
    val imageKey: String,
    val mrp: Double,
    val price: Double,
    val unit: String,
    val weightLabel: String,
    val rating: Float,
    val reviewCount: Int,
    val stock: Int,
    val brand: String,
    val tags: List<String>,
    val origin: String,
    val freshnessInfo: FreshnessInfo? = null,
    val flowerInfo: FlowerInfo? = null,
    val availableQuantities: List<String> = listOf(),
    val benefits: List<String> = listOf(),
) {
    val discountPercent: Int
        get() = if (mrp <= 0) 0 else (((mrp - price) / mrp) * 100).toInt()

    val inStock: Boolean get() = stock > 0
}
