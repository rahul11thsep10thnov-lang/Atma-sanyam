package com.atmasanyam.delivery.core.designsystem.components

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector

/**
 * A search-style text field used for both pickup and destination in the map-first home screen.
 * [onCurrentLocationClick] is null when "use current location" doesn't apply (e.g. destination).
 */
@Composable
fun LocationField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    leadingIcon: ImageVector,
    modifier: Modifier = Modifier,
    placeholder: String? = null,
    onCurrentLocationClick: (() -> Unit)? = null,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        label = { Text(label) },
        placeholder = placeholder?.let { { Text(it) } },
        leadingIcon = { Icon(leadingIcon, contentDescription = null) },
        trailingIcon = onCurrentLocationClick?.let {
            {
                IconButton(onClick = it) {
                    Icon(
                        Icons.Filled.MyLocation,
                        contentDescription = "Use current location",
                        tint = MaterialTheme.colorScheme.primary,
                    )
                }
            }
        },
        singleLine = true,
    )
}
