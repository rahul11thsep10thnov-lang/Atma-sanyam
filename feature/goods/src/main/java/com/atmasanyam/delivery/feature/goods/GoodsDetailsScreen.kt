package com.atmasanyam.delivery.feature.goods

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.atmasanyam.delivery.core.designsystem.components.PrimaryButton
import com.atmasanyam.delivery.core.designsystem.components.SecondaryButton
import com.atmasanyam.delivery.core.designsystem.components.SectionHeader
import com.atmasanyam.delivery.core.designsystem.labels.labelRes
import com.atmasanyam.delivery.core.model.Dimensions
import com.atmasanyam.delivery.core.model.GoodsCategory
import com.atmasanyam.delivery.core.model.GoodsDetails
import com.atmasanyam.delivery.core.model.LengthUnit
import com.atmasanyam.delivery.core.model.WeightPreset

@Composable
fun GoodsDetailsScreen(
    onContinue: (GoodsDetails) -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var selectedCategories by remember { mutableStateOf(emptySet<GoodsCategory>()) }
    var description by rememberSaveable { mutableStateOf("") }
    var quantity by rememberSaveable { mutableStateOf(1) }
    var selectedWeightPreset by rememberSaveable { mutableStateOf<WeightPreset?>(null) }
    var weightText by rememberSaveable { mutableStateOf("") }
    var lengthUnit by rememberSaveable { mutableStateOf(LengthUnit.FEET) }
    var lengthText by rememberSaveable { mutableStateOf("") }
    var widthText by rememberSaveable { mutableStateOf("") }
    var heightText by rememberSaveable { mutableStateOf("") }
    // Kept as a string-resource id (not text) so the message follows the language if it changes.
    var errorMessageRes by remember { mutableStateOf<Int?>(null) }

    fun buildGoodsDetailsOrShowError(): GoodsDetails? {
        if (selectedCategories.isEmpty()) {
            errorMessageRes = R.string.goods_error_category
            return null
        }
        val weightKg = weightText.toDoubleOrNull()
        if (weightKg == null || weightKg <= 0.0) {
            errorMessageRes = R.string.goods_error_weight
            return null
        }
        val length = lengthText.toDoubleOrNull()
        val width = widthText.toDoubleOrNull()
        val height = heightText.toDoubleOrNull()
        if (length == null || width == null || height == null || length <= 0 || width <= 0 || height <= 0) {
            errorMessageRes = R.string.goods_error_dimensions
            return null
        }
        errorMessageRes = null
        return GoodsDetails(
            categories = selectedCategories,
            description = description,
            quantity = quantity,
            approxWeightKg = weightKg,
            largestItemDimensions = Dimensions(length, width, height, lengthUnit),
        )
    }

    Scaffold(modifier = modifier) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 12.dp),
        ) {
            SectionHeader(title = stringResource(R.string.goods_title))
            Row(modifier = Modifier.horizontalScroll(rememberScrollState())) {
                GoodsCategory.entries.forEach { category ->
                    FilterChip(
                        selected = category in selectedCategories,
                        onClick = {
                            selectedCategories = if (category in selectedCategories) {
                                selectedCategories - category
                            } else {
                                selectedCategories + category
                            }
                        },
                        label = { Text(stringResource(category.labelRes())) },
                        modifier = Modifier.padding(end = 8.dp),
                    )
                }
            }

            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text(stringResource(R.string.goods_description_label)) },
                placeholder = { Text(stringResource(R.string.goods_description_placeholder)) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp),
            )

            SectionHeader(title = stringResource(R.string.goods_quantity_title), modifier = Modifier.padding(top = 20.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { if (quantity > 1) quantity-- }) {
                    Icon(Icons.Filled.Remove, contentDescription = stringResource(R.string.goods_quantity_decrease))
                }
                Text(text = quantity.toString(), style = MaterialTheme.typography.titleLarge)
                IconButton(onClick = { if (quantity < 999_999) quantity++ }) {
                    Icon(Icons.Filled.Add, contentDescription = stringResource(R.string.goods_quantity_increase))
                }
            }

            SectionHeader(
                title = stringResource(R.string.goods_weight_title),
                subtitle = stringResource(R.string.goods_weight_hint),
                modifier = Modifier.padding(top = 20.dp),
            )
            Row(modifier = Modifier.horizontalScroll(rememberScrollState())) {
                WeightPreset.entries.forEach { preset ->
                    FilterChip(
                        selected = selectedWeightPreset == preset,
                        onClick = {
                            selectedWeightPreset = preset
                            weightText = preset.rangeKg.start.toString()
                        },
                        label = { Text(stringResource(preset.labelRes())) },
                        modifier = Modifier.padding(end = 8.dp),
                    )
                }
            }
            OutlinedTextField(
                value = weightText,
                onValueChange = {
                    weightText = it
                    selectedWeightPreset = null
                },
                label = { Text(stringResource(R.string.goods_weight_label)) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
            )

            SectionHeader(
                title = stringResource(R.string.goods_size_title),
                subtitle = stringResource(R.string.goods_size_hint),
                modifier = Modifier.padding(top = 20.dp),
            )
            Row {
                LengthUnit.entries.forEach { unit ->
                    FilterChip(
                        selected = lengthUnit == unit,
                        onClick = { lengthUnit = unit },
                        label = { Text(stringResource(unit.labelRes())) },
                        modifier = Modifier.padding(end = 8.dp),
                    )
                }
            }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                OutlinedTextField(
                    value = lengthText,
                    onValueChange = { lengthText = it },
                    label = { Text(stringResource(R.string.goods_length)) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.weight(1f),
                )
                OutlinedTextField(
                    value = widthText,
                    onValueChange = { widthText = it },
                    label = { Text(stringResource(R.string.goods_width)) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.weight(1f),
                )
                OutlinedTextField(
                    value = heightText,
                    onValueChange = { heightText = it },
                    label = { Text(stringResource(R.string.goods_height)) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.weight(1f),
                )
            }

            errorMessageRes?.let { messageRes ->
                Text(
                    text = stringResource(messageRes),
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(top = 12.dp),
                )
            }

            PrimaryButton(
                text = stringResource(R.string.goods_calculate),
                onClick = { buildGoodsDetailsOrShowError()?.let(onContinue) },
                modifier = Modifier.padding(top = 20.dp),
            )
            SecondaryButton(
                text = stringResource(R.string.goods_back),
                onClick = onBack,
                modifier = Modifier.padding(top = 12.dp, bottom = 8.dp),
            )
        }
    }
}
