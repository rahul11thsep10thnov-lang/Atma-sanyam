package com.wholesoul.app.core.designsystem.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.wholesoul.app.core.designsystem.WholesoulColors

/** ADD button that morphs into a [-] qty [+] stepper, used on every product card + details page. */
@Composable
fun AddOrQuantitySelector(
    quantity: Int,
    onAdd: () -> Unit,
    onIncrement: () -> Unit,
    onDecrement: () -> Unit,
    modifier: Modifier = Modifier,
) {
    if (quantity <= 0) {
        Box(
            modifier = modifier
                .height(34.dp)
                .background(WholesoulColors.Leaf, RoundedCornerShape(8.dp))
                .clickable(onClickLabel = "Add to cart", onClick = onAdd)
                .padding(horizontal = 16.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text("ADD", style = MaterialTheme.typography.labelLarge, color = Color.White)
        }
    } else {
        Row(
            modifier = modifier
                .height(34.dp)
                .background(WholesoulColors.Leaf, RoundedCornerShape(8.dp)),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            StepperIcon(Icons.Filled.Remove, "Decrease quantity", onDecrement)
            Box(
                modifier = Modifier.width(28.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = quantity.toString(),
                    style = MaterialTheme.typography.labelLarge,
                    color = Color.White,
                )
            }
            StepperIcon(Icons.Filled.Add, "Increase quantity", onIncrement)
        }
    }
}

@Composable
private fun StepperIcon(icon: androidx.compose.ui.graphics.vector.ImageVector, description: String, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(34.dp)
            .clickable(onClickLabel = description, onClick = onClick)
            .semantics { contentDescription = description },
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
    }
}
