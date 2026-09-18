package com.wholesoul.app.domain.model

data class Category(
    val id: String,
    val category: ProductCategory,
    val displayName: String,
    val imageKey: String,
    val productCount: Int,
)

data class Banner(
    val id: String,
    val imageKey: String,
    val title: String,
    val subtitle: String,
    val deepLinkCategory: ProductCategory? = null,
)
