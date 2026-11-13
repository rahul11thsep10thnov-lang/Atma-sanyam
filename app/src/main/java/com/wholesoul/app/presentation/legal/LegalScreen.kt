package com.wholesoul.app.presentation.legal

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.wholesoul.app.core.designsystem.WholesoulColors
import com.wholesoul.app.core.designsystem.components.WholesoulTopBar
import com.wholesoul.app.navigation.LegalDocType

private data class LegalDoc(val title: String, val body: String)

private fun docFor(type: LegalDocType): LegalDoc = when (type) {
    LegalDocType.PRIVACY_POLICY -> LegalDoc(
        "Privacy Policy",
        "WHOLESOUL collects only the information you provide manually — name, mobile number and the delivery " +
            "addresses you enter yourself. We never access device location, GPS, or background location data. " +
            "Your information is used solely to process orders and improve your shopping experience, and is never " +
            "sold to third parties.",
    )
    LegalDocType.TERMS -> LegalDoc(
        "Terms & Conditions",
        "By using WHOLESOUL, you agree to order responsibly, provide accurate delivery details, and make payment " +
            "through the supported methods. Prices and availability are subject to change. WHOLESOUL reserves the " +
            "right to cancel orders that cannot be fulfilled and will refund any amount paid in such cases.",
    )
    LegalDocType.REFUND_POLICY -> LegalDoc(
        "Refund Policy",
        "If an item is missing, damaged or incorrect, you can raise a request from the order details screen within " +
            "24 hours of delivery. Approved refunds are credited to your original payment method within 5-7 business days.",
    )
    LegalDocType.CANCELLATION_POLICY -> LegalDoc(
        "Cancellation Policy",
        "Orders can be cancelled free of charge as long as they haven't been packed yet. Once an order is out for " +
            "delivery, it can no longer be cancelled from the app — please contact support instead.",
    )
    LegalDocType.SHIPPING_POLICY -> LegalDoc(
        "Shipping & Delivery Policy",
        "WHOLESOUL delivers to a curated list of serviceable PIN codes, checked manually — never via GPS. Typical " +
            "delivery windows are 45-90 minutes depending on your area, order size and local demand.",
    )
    LegalDocType.CONTACT_US -> LegalDoc(
        "Contact Us",
        "Reach us at support@wholesoul.app or call 1800-000-000, 9 AM - 9 PM, all days of the week.",
    )
    LegalDocType.ABOUT -> LegalDoc(
        "About WHOLESOUL",
        "WHOLESOUL is a fast, fresh and frugal marketplace for fruits, vegetables, flowers, garlands, puja items and " +
            "daily essentials — sourced directly to cut out middlemen and keep prices honest. Fast. Fresh. Frugal.",
    )
}

@Composable
fun LegalScreen(docType: LegalDocType, onBack: () -> Unit) {
    val doc = docFor(docType)
    Column(modifier = Modifier.fillMaxSize()) {
        WholesoulTopBar(title = doc.title, onBack = onBack)
        Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp)) {
            Text(doc.body, style = MaterialTheme.typography.bodyMedium, color = WholesoulColors.TextPrimary)
        }
    }
}
