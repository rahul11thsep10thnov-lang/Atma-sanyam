package com.wholesoul.app.presentation.address

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.wholesoul.app.core.designsystem.WholesoulColors
import com.wholesoul.app.core.designsystem.components.PrimaryButton
import com.wholesoul.app.core.designsystem.components.WholesoulFilterChip
import com.wholesoul.app.core.designsystem.components.WholesoulTopBar
import com.wholesoul.app.domain.model.AddressLabel

@Composable
fun AddEditAddressScreen(
    onBack: () -> Unit,
    onSaved: () -> Unit,
    viewModel: AddEditAddressViewModel = hiltViewModel(),
) {
    val state by viewModel.formState.collectAsState()

    LaunchedEffect(state.saved) { if (state.saved) onSaved() }

    Column(modifier = Modifier.fillMaxSize()) {
        WholesoulTopBar(title = if (state.addressId == null) "Add new address" else "Edit address", onBack = onBack)

        Column(
            modifier = Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(16.dp),
        ) {
            Text("Address type", style = MaterialTheme.typography.titleSmall)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                AddressLabel.entries.forEach { label ->
                    WholesoulFilterChip(label = label.name, selected = state.label == label, onClick = { viewModel.onLabelChange(label) })
                }
            }

            LabeledField("Full name", state.fullName, viewModel::onFullNameChange, Modifier.padding(top = 16.dp))
            LabeledField("Mobile number", state.mobileNumber, viewModel::onMobileChange, Modifier.padding(top = 12.dp), KeyboardType.Phone)
            LabeledField("House / Flat number", state.houseNumber, viewModel::onHouseNumberChange, Modifier.padding(top = 12.dp))
            LabeledField("Building / Street", state.buildingStreet, viewModel::onBuildingStreetChange, Modifier.padding(top = 12.dp))
            LabeledField("Landmark (optional)", state.landmark, viewModel::onLandmarkChange, Modifier.padding(top = 12.dp))
            LabeledField("Area / Locality", state.area, viewModel::onAreaChange, Modifier.padding(top = 12.dp))

            DropdownField(
                label = "State",
                selected = state.state,
                options = state.states,
                onSelected = viewModel::onStateChange,
                modifier = Modifier.padding(top = 12.dp),
            )
            DropdownField(
                label = "City",
                selected = state.city,
                options = state.cities,
                onSelected = viewModel::onCityChange,
                modifier = Modifier.padding(top = 12.dp),
            )

            LabeledField("PIN code", state.pinCode, viewModel::onPinCodeChange, Modifier.padding(top = 12.dp), KeyboardType.Number)
            state.serviceabilityMessage?.let {
                Text(
                    it,
                    style = MaterialTheme.typography.bodySmall,
                    color = if (state.isServiceable == true) WholesoulColors.Success else WholesoulColors.Warning,
                    modifier = Modifier.padding(top = 6.dp),
                )
            }

            Spacer(Modifier.height(24.dp))
            PrimaryButton(
                text = if (state.isSaving) "SAVING..." else "SAVE ADDRESS",
                onClick = viewModel::save,
                enabled = state.isValid && !state.isSaving,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(16.dp))
        }
    }
}

@Composable
private fun LabeledField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    keyboardType: KeyboardType = KeyboardType.Text,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        singleLine = true,
        keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = keyboardType),
        modifier = modifier.fillMaxWidth(),
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DropdownField(
    label: String,
    selected: String,
    options: List<String>,
    onSelected: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }
    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }, modifier = modifier) {
        OutlinedTextField(
            value = selected,
            onValueChange = {},
            readOnly = true,
            label = { Text(label) },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier.fillMaxWidth().menuAnchor(),
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            options.forEach { option ->
                DropdownMenuItem(text = { Text(option) }, onClick = { onSelected(option); expanded = false })
            }
        }
    }
}
