package com.wholesoul.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.wholesoul.app.domain.model.Category
import com.wholesoul.app.domain.model.FlowerInfo
import com.wholesoul.app.domain.model.FreshnessInfo
import com.wholesoul.app.domain.model.Product
import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private val json = Json { ignoreUnknownKeys = true }

@Entity(tableName = "categories")
data class CategoryEntity(
    @PrimaryKey val id: String,
    val name: String,
    val imageKey: String,
    val sortOrder: Int,
    val isActive: Boolean,
)

@Entity(tableName = "products")
data class ProductEntity(
    @PrimaryKey val id: String,
    val name: String,
    val categoryId: String,
    val subCategory: String,
    val description: String,
    val imageKey: String,
    /** JSON array of extra photo keys. */
    val galleryJson: String,
    val mrp: Double,
    val price: Double,
    val unit: String,
    val weightLabel: String,
    val rating: Float,
    val reviewCount: Int,
    val stock: Int,
    val brand: String,
    /** JSON array of tags. */
    val tagsJson: String,
    val origin: String,
    /** JSON object with the optional freshness / flower details, pack sizes and benefits. */
    val extrasJson: String,
    val sortOrder: Int,
    val isActive: Boolean,
    val createdAtEpochMillis: Long,
)

/** Query result for "how many products does each category hold" (not a table). */
data class CategoryCount(
    val categoryId: String,
    val total: Int,
    val visible: Int,
)

@Serializable
private data class ProductExtras(
    val freshness: FreshnessInfo? = null,
    val flower: FlowerInfo? = null,
    val availableQuantities: List<String> = emptyList(),
    val benefits: List<String> = emptyList(),
)

private fun decodeList(text: String): List<String> =
    runCatching { json.decodeFromString<List<String>>(text) }.getOrDefault(emptyList())

fun CategoryEntity.toDomain(productCount: Int): Category = Category(
    id = id,
    displayName = name,
    imageKey = imageKey,
    productCount = productCount,
    sortOrder = sortOrder,
    isActive = isActive,
)

fun ProductEntity.toDomain(): Product {
    val extras = runCatching { json.decodeFromString<ProductExtras>(extrasJson) }.getOrDefault(ProductExtras())
    return Product(
        id = id,
        name = name,
        categoryId = categoryId,
        subCategory = subCategory,
        description = description,
        imageKey = imageKey,
        mrp = mrp,
        price = price,
        unit = unit,
        weightLabel = weightLabel,
        rating = rating,
        reviewCount = reviewCount,
        stock = stock,
        brand = brand,
        tags = decodeList(tagsJson),
        origin = origin,
        freshnessInfo = extras.freshness,
        flowerInfo = extras.flower,
        availableQuantities = extras.availableQuantities,
        benefits = extras.benefits,
        galleryImageKeys = decodeList(galleryJson),
        sortOrder = sortOrder,
        isActive = isActive,
        createdAtEpochMillis = createdAtEpochMillis,
    )
}

fun Product.toEntity(): ProductEntity = ProductEntity(
    id = id,
    name = name,
    categoryId = categoryId,
    subCategory = subCategory,
    description = description,
    imageKey = imageKey,
    galleryJson = json.encodeToString(galleryImageKeys),
    mrp = mrp,
    price = price,
    unit = unit,
    weightLabel = weightLabel,
    rating = rating,
    reviewCount = reviewCount,
    stock = stock,
    brand = brand,
    tagsJson = json.encodeToString(tags),
    origin = origin,
    extrasJson = json.encodeToString(
        ProductExtras(freshnessInfo, flowerInfo, availableQuantities, benefits),
    ),
    sortOrder = sortOrder,
    isActive = isActive,
    createdAtEpochMillis = createdAtEpochMillis,
)
