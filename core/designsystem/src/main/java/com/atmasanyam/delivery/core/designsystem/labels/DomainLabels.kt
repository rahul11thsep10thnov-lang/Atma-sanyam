package com.atmasanyam.delivery.core.designsystem.labels

import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import com.atmasanyam.delivery.core.designsystem.R
import com.atmasanyam.delivery.core.model.GoodsCategory
import com.atmasanyam.delivery.core.model.LengthUnit
import com.atmasanyam.delivery.core.model.VehicleCategory
import com.atmasanyam.delivery.core.model.WeightPreset

/*
 * Localized display text for domain values. core:model is plain Kotlin and keeps English
 * fallbacks only; anything a user reads comes from string resources (values/ and values-hi/)
 * through these helpers, so every screen shows the same wording in the chosen language.
 */

fun GoodsCategory.labelRes(): Int = when (this) {
    GoodsCategory.HARDWARE -> R.string.label_category_hardware
    GoodsCategory.ELECTRICAL -> R.string.label_category_electrical
    GoodsCategory.ELECTRONICS -> R.string.label_category_electronics
    GoodsCategory.FURNITURE -> R.string.label_category_furniture
    GoodsCategory.APPLIANCES -> R.string.label_category_appliances
    GoodsCategory.PLUMBING -> R.string.label_category_plumbing
    GoodsCategory.CONSTRUCTION_MATERIAL -> R.string.label_category_construction
    GoodsCategory.GROCERY -> R.string.label_category_grocery
    GoodsCategory.HOUSEHOLD_ITEMS -> R.string.label_category_household
    GoodsCategory.PACKAGES_BOXES -> R.string.label_category_packages
    GoodsCategory.OTHER -> R.string.label_category_other
}

fun WeightPreset.labelRes(): Int = when (this) {
    WeightPreset.UNDER_5 -> R.string.label_weight_under_5
    WeightPreset.FIVE_TO_TEN -> R.string.label_weight_5_10
    WeightPreset.TEN_TO_TWENTY_FIVE -> R.string.label_weight_10_25
    WeightPreset.TWENTY_FIVE_TO_FIFTY -> R.string.label_weight_25_50
    WeightPreset.FIFTY_TO_HUNDRED -> R.string.label_weight_50_100
    WeightPreset.OVER_HUNDRED -> R.string.label_weight_over_100
}

fun LengthUnit.labelRes(): Int = when (this) {
    LengthUnit.FEET -> R.string.label_unit_feet
    LengthUnit.INCHES -> R.string.label_unit_inches
}

fun LengthUnit.shortLabelRes(): Int = when (this) {
    LengthUnit.FEET -> R.string.label_unit_feet_short
    LengthUnit.INCHES -> R.string.label_unit_inches_short
}

/** The vehicle catalog is admin-configured data, so unknown ids fall back to the catalog's own text. */
private fun VehicleCategory.nameResOrNull(): Int? = when (id) {
    "bike" -> R.string.label_vehicle_bike
    "three_wheeler" -> R.string.label_vehicle_three_wheeler
    "mini_goods_vehicle" -> R.string.label_vehicle_mini_goods
    "large_goods_vehicle" -> R.string.label_vehicle_large_goods
    else -> null
}

private fun VehicleCategory.descriptionResOrNull(): Int? = when (id) {
    "bike" -> R.string.label_vehicle_bike_desc
    "three_wheeler" -> R.string.label_vehicle_three_wheeler_desc
    "mini_goods_vehicle" -> R.string.label_vehicle_mini_goods_desc
    "large_goods_vehicle" -> R.string.label_vehicle_large_goods_desc
    else -> null
}

@Composable
fun VehicleCategory.localizedName(): String = nameResOrNull()?.let { stringResource(it) } ?: name

@Composable
fun VehicleCategory.localizedDescription(): String = descriptionResOrNull()?.let { stringResource(it) } ?: description
