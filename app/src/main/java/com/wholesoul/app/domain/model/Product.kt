package com.wholesoul.app.domain.model

import kotlinx.serialization.Serializable

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
@Serializable
data class FreshnessInfo(
    val harvestedDaysAgo: Int,
    val sourceFarm: String,
    val qualityGrade: String,
)

/** Extra context shown for flowers/garlands per spec section 12. */
@Serializable
data class FlowerInfo(
    val flowerType: String,
    val weightPerBunchGrams: Int,
    val approxCount: Int,
    val useCase: String,
)

data class Product(
    val id: String,
    val name: String,
    val categoryId: String,
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
    /** Extra photos after [imageKey] (the primary photo), in display order. */
    val galleryImageKeys: List<String> = listOf(),
    /** Position inside its category; lower comes first. Managed from the Admin Console. */
    val sortOrder: Int = 0,
    /** Hidden products stay in the catalog but are invisible to customers. */
    val isActive: Boolean = true,
    val createdAtEpochMillis: Long = 0L,
) {
    /** Primary photo first, then the gallery. */
    val allImageKeys: List<String> get() = listOf(imageKey) + galleryImageKeys

    val discountPercent: Int
        get() = if (mrp <= 0) 0 else (((mrp - price) / mrp) * 100).toInt()

    val inStock: Boolean get() = stock > 0
}
