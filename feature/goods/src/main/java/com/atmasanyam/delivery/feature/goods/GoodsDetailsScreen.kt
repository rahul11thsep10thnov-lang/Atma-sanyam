package com.atmasanyam.delivery.feature.goods

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.weight
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.atmasanyam.delivery.core.designsystem.components.PrimaryButton
import com.atmasanyam.delivery.core.designsystem.components.SecondaryButton
import com.atmasanyam.delivery.core.designsystem.components.SectionHeader
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
    var errorMessage by remember { mutableStateOf<String?>(null) }

    fun buildGoodsDetailsOrShowError(): GoodsDetails? {
        if (selectedCategories.isEmpty()) {
            errorMessage = "Please select what you're delivering."
            return null
        }
        val weightKg = weightText.toDoubleOrNull()
        if (weightKg == null || weightKg <= 0.0) {
            errorMessage = "Please enter approximate weight."
            return null
        }
        val length = lengthText.toDoubleOrNull()
        val width = widthText.toDoubleOrNull()
        val height = heightText.toDoubleOrNull()
        if (length == null || width == null || height == null || length <= 0 || width <= 0 || height <= 0) {
            errorMessage = "Please enter valid dimensions."
            return null
        }
        errorMessage = null
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
            SectionHeader(title = "What are you delivering?")
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
                        label = { Text(category.displayName) },
                        modifier = Modifier.padding(end = 8.dp),
                    )
                }
            }

            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text("Describe your items (optional)") },
                placeholder = { Text("e.g. 2 ceiling fans + electrical wires") },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp),
            )

            SectionHeader(title = "How many items/packages?", modifier = Modifier.padding(top = 20.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { if (quantity > 1) quantity-- }) {
                    Icon(Icons.Filled.Remove, contentDescription = "Decrease quantity")
                }
                Text(text = quantity.toString(), style = MaterialTheme.typography.titleLarge)
                IconButton(onClick = { if (quantity < 999_999) quantity++ }) {
                    Icon(Icons.Filled.Add, contentDescription = "Increase quantity")
                }
            }

            SectionHeader(
                title = "Approximate total weight",
                subtitle = "Don't know the exact weight? An approximate value is okay.",
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
                        label = { Text(preset.label) },
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
                label = { Text("Weight (kg)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
            )

            SectionHeader(
                title = "Largest item's/package's size",
                subtitle = "Enter the dimensions of your largest item/package.",
                modifier = Modifier.padding(top = 20.dp),
            )
            Row {
                FilterChip(
                    selected = lengthUnit == LengthUnit.FEET,
                    onClick = { lengthUnit = LengthUnit.FEET },
                    label = { Text("Feet") },
                    modifier = Modifier.padding(end = 8.dp),
                )
                FilterChip(
                    selected = lengthUnit == LengthUnit.INCHES,
                    onClick = { lengthUnit = LengthUnit.INCHES },
                    label = { Text("Inches") },
                )
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
                    label = { Text("Length") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.weight(1f),
                )
                OutlinedTextField(
                    value = widthText,
                    onValueChange = { widthText = it },
                    label = { Text("Width") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.weight(1f),
                )
                OutlinedTextField(
                    value = heightText,
                    onValueChange = { heightText = it },
                    label = { Text("Height") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.weight(1f),
                )
            }

            if (errorMessage != null) {
                Text(
                    text = errorMessage.orEmpty(),
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(top = 12.dp),
                )
            }

            PrimaryButton(
                text = "Calculate delivery charge",
                onClick = { buildGoodsDetailsOrShowError()?.let(onContinue) },
                modifier = Modifier.padding(top = 20.dp),
            )
            SecondaryButton(text = "Back", onClick = onBack, modifier = Modifier.padding(top = 12.dp, bottom = 8.dp))
        }
    }
}
