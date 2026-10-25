package com.wholesoul.app.presentation.help

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.wholesoul.app.core.designsystem.WholesoulColors
import com.wholesoul.app.core.designsystem.components.WholesoulTopBar

private data class Faq(val question: String, val answer: String)

private val faqs = listOf(
    Faq("How fast is delivery?", "Most orders arrive within 45-90 minutes depending on your area and order volume."),
    Faq("Do you use GPS to find my address?", "No. WHOLESOUL never uses device location. You choose your country, state, city, area and PIN code manually."),
    Faq("What if my area isn't serviceable yet?", "Enter your PIN code while adding an address and we'll tell you right away. We're expanding to new areas regularly."),
    Faq("Can I cancel an order?", "Yes, orders can be cancelled before they are packed, from the order details screen."),
    Faq("What payment methods are supported?", "UPI, credit/debit cards, net banking, wallets and cash on delivery."),
    Faq("How do I apply a coupon?", "Enter the coupon code on the cart screen and tap Apply."),
)

private data class ContactOption(val icon: androidx.compose.ui.graphics.vector.ImageVector, val label: String, val value: String)

private val contactOptions = listOf(
    ContactOption(Icons.Filled.Call, "Call us", "1800-000-000"),
    ContactOption(Icons.Filled.Email, "Email us", "support@wholesoul.app"),
    ContactOption(Icons.Filled.Chat, "Chat with us", "Available 9 AM - 9 PM"),
)

@Composable
fun HelpScreen(onBack: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize()) {
        WholesoulTopBar(title = "Help & Support", onBack = onBack)
        LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            item { Text("Contact us", style = MaterialTheme.typography.titleSmall) }
            items(contactOptions) { option ->
                Card(
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = WholesoulColors.SurfaceAlt),
                ) {
                    Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(option.icon, contentDescription = null, tint = WholesoulColors.Leaf)
                        Column(modifier = Modifier.padding(start = 12.dp)) {
                            Text(option.label, style = MaterialTheme.typography.titleSmall)
                            Text(option.value, style = MaterialTheme.typography.bodySmall, color = WholesoulColors.TextSecondary)
                        }
                    }
                }
            }
            item { Text("Frequently asked questions", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(top = 24.dp)) }
            items(faqs) { faq -> FaqRow(faq) }
        }
    }
}

@Composable
private fun FaqRow(faq: Faq) {
    var expanded by remember { mutableStateOf(false) }
    Card(
        modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = WholesoulColors.SurfaceAlt),
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth().clickable { expanded = !expanded },
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(faq.question, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                Icon(Icons.Filled.ExpandMore, contentDescription = null, tint = WholesoulColors.TextTertiary)
            }
            if (expanded) {
                Text(faq.answer, style = MaterialTheme.typography.bodySmall, color = WholesoulColors.TextSecondary, modifier = Modifier.padding(top = 8.dp))
            }
        }
    }
}
