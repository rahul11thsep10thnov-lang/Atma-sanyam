package com.wholesoul.app.presentation.address

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Home
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.wholesoul.app.core.designsystem.WholesoulColors
import com.wholesoul.app.core.designsystem.components.EmptyStateView
import com.wholesoul.app.core.designsystem.components.PrimaryButton
import com.wholesoul.app.core.designsystem.components.WholesoulTopBar
import com.wholesoul.app.domain.model.Address

@Composable
fun AddressListScreen(
    onBack: () -> Unit,
    onAddAddress: () -> Unit,
    onEditAddress: (String) -> Unit,
    popOnSelect: Boolean = false,
    viewModel: AddressListViewModel = hiltViewModel(),
) {
    val addresses by viewModel.addresses.collectAsState()

    Column(modifier = Modifier.fillMaxSize()) {
        WholesoulTopBar(title = "Select delivery address", onBack = onBack)

        if (addresses.isEmpty()) {
            EmptyStateView(
                title = "No saved addresses",
                message = "Add an address manually to start shopping.",
                icon = Icons.Filled.Home,
                action = { PrimaryButton(text = "+ ADD NEW ADDRESS", onClick = onAddAddress) },
            )
            return@Column
        }

        LazyColumn(modifier = Modifier.weight(1f).padding(12.dp)) {
            items(addresses, key = { it.id }) { address ->
                AddressCard(
                    address = address,
                    onSelect = {
                        viewModel.setDefault(address.id)
                        if (popOnSelect) onBack()
                    },
                    onEdit = { onEditAddress(address.id) },
                    onDelete = { viewModel.delete(address.id) },
                )
            }
        }

        PrimaryButton(
            text = "+ ADD NEW ADDRESS",
            onClick = onAddAddress,
            modifier = Modifier.fillMaxWidth().padding(16.dp),
        )
    }
}

@Composable
private fun AddressCard(
    address: Address,
    onSelect: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (address.isDefault) WholesoulColors.LeafLight else WholesoulColors.SurfaceAlt,
        ),
    ) {
        Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.Top) {
            RadioButton(selected = address.isDefault, onClick = onSelect)
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(address.label.name, style = MaterialTheme.typography.titleSmall, color = WholesoulColors.LeafDark)
                    if (address.isDefault) {
                        Spacer(Modifier.width(6.dp))
                        Text("DEFAULT", style = MaterialTheme.typography.labelSmall, color = WholesoulColors.Leaf)
                    }
                }
                Text(address.fullName, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 4.dp))
                Text(
                    "${address.houseNumber}, ${address.buildingStreet}, ${address.area}, ${address.city}, ${address.state} - ${address.pinCode}",
                    style = MaterialTheme.typography.bodySmall,
                    color = WholesoulColors.TextSecondary,
                )
                Text(address.mobileNumber, style = MaterialTheme.typography.bodySmall, color = WholesoulColors.TextSecondary)
            }
            Column {
                IconButton(onClick = onEdit) { Text("EDIT", style = MaterialTheme.typography.labelSmall, color = WholesoulColors.Leaf) }
                IconButton(onClick = onDelete) { Icon(Icons.Filled.Delete, contentDescription = "Delete", tint = WholesoulColors.TextTertiary) }
            }
        }
    }
}
