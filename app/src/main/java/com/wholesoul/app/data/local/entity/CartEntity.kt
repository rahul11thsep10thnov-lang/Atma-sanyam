package com.wholesoul.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "cart_items")
data class CartItemEntity(
    @PrimaryKey val productId: String,
    val quantity: Int,
    val addedAtEpochMillis: Long,
)

/** Single-row table (id is always 0) holding the currently applied coupon code, if any. */
@Entity(tableName = "cart_meta")
data class CartMetaEntity(
    @PrimaryKey val id: Int = 0,
    val appliedCouponCode: String?,
)
