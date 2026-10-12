package com.wholesoul.app.domain.model

/**
 * A catalog category. Categories are data (created, renamed, hidden and re-ordered from the
 * Admin Console), not a fixed enum, so everything refers to them by [id].
 */
data class Category(
    val id: String,
    val displayName: String,
    val imageKey: String,
    /** Customer screens count only visible products; the Admin Console counts all of them. */
    val productCount: Int,
    val sortOrder: Int = 0,
    val isActive: Boolean = true,
)

data class Banner(
    val id: String,
    val imageKey: String,
    val title: String,
    val subtitle: String,
    val deepLinkCategoryId: String? = null,
)
