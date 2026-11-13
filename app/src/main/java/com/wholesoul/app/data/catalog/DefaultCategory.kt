package com.wholesoul.app.data.catalog

/**
 * The starter categories the catalog is seeded with on first launch. After that, categories are
 * ordinary rows the Admin Console can rename, hide, re-order, delete or add to — this enum is
 * only the seed data, and the stable ids ("fruits", "flowers", …) that Home's curated sections
 * look up.
 */
enum class DefaultCategory(val displayName: String) {
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
    OTHER("Other");

    val id: String get() = name.lowercase()
}
