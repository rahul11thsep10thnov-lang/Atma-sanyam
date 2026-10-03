package com.rangepatte.app.ui.membership

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.QrCode2
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.rangepatte.app.AppServices
import com.rangepatte.app.BuildConfig
import com.rangepatte.app.R
import com.rangepatte.app.data.membership.MembershipPlan
import com.rangepatte.app.data.payment.PaymentMethod
import com.rangepatte.app.data.payment.PaymentOrder
import com.rangepatte.app.data.payment.PaymentResult
import com.rangepatte.app.ui.background.BackgroundType
import com.rangepatte.app.ui.components.GameHeader
import com.rangepatte.app.ui.components.WatermarkBackground
import com.rangepatte.app.ui.components.royal.GoldRule
import com.rangepatte.app.ui.components.royal.RoyalButton
import com.rangepatte.app.ui.components.royal.RoyalButtonStyle
import com.rangepatte.app.ui.components.royal.RoyalPanel
import com.rangepatte.app.ui.language.LocalAppLanguage
import com.rangepatte.app.ui.language.findActivity
import com.rangepatte.app.ui.theme.GoldBevelDark
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.GoldenGlow
import com.rangepatte.app.ui.theme.PanelWoodDark
import com.rangepatte.app.ui.theme.PanelWoodLight
import com.rangepatte.app.ui.theme.ParchmentText
import com.rangepatte.app.ui.theme.ParchmentTextDim
import com.rangepatte.app.ui.theme.RoyalLabelStyle

private data class MethodOption(val method: PaymentMethod, val icon: ImageVector, val labelRes: Int)

private val methodOptions = listOf(
    MethodOption(PaymentMethod.UPI, Icons.Filled.QrCode2, R.string.checkout_method_upi),
    MethodOption(PaymentMethod.CARD, Icons.Filled.CreditCard, R.string.checkout_method_card),
    MethodOption(PaymentMethod.NET_BANKING, Icons.Filled.AccountBalance, R.string.checkout_method_netbanking),
    MethodOption(PaymentMethod.WALLET, Icons.Filled.AccountBalanceWallet, R.string.checkout_method_wallet)
)

private sealed interface CheckoutStatus {
    data object Idle : CheckoutStatus
    data object Processing : CheckoutStatus
    data object Paid : CheckoutStatus
    data class Message(val textRes: Int) : CheckoutStatus
}

/**
 * The payment gateway page: order summary, choice of payment method, and Pay ₹29. Payment itself
 * is delegated to [AppServices.paymentGateway]; until a payment partner is connected, Pay explains
 * that payments are not live yet and nothing is charged. Debug builds also offer a "simulate
 * success" button so the ad-free flow can be tested end to end.
 */
@Composable
fun CheckoutScreen(
    onBackClick: () -> Unit,
    onDone: () -> Unit,
    modifier: Modifier = Modifier
) {
    val activity = LocalContext.current.findActivity()
    val languageTag = LocalAppLanguage.current.localeTag
    val itemLabel = stringResource(R.string.checkout_item)
    var method by remember { mutableStateOf(PaymentMethod.UPI) }
    var status by remember { mutableStateOf<CheckoutStatus>(CheckoutStatus.Idle) }

    val grantMembership = {
        val until = AppServices.membership.addPaidMonth()
        AppServices.account.syncUser(languageTag, until)
        status = CheckoutStatus.Paid
    }
    val pay = pay@{
        if (activity == null) return@pay
        status = CheckoutStatus.Processing
        val order = PaymentOrder(
            orderId = "IT-${System.currentTimeMillis()}",
            amountPaise = MembershipPlan.PRICE_PAISE,
            currency = MembershipPlan.CURRENCY,
            description = itemLabel,
            customerPhone = AppServices.account.currentUser.value?.phoneNumber
        )
        AppServices.paymentGateway.startPayment(activity, order, method) { result ->
            when (result) {
                is PaymentResult.Success -> grantMembership()
                is PaymentResult.Failed -> status = CheckoutStatus.Message(R.string.checkout_failed)
                PaymentResult.Cancelled -> status = CheckoutStatus.Message(R.string.checkout_cancelled)
                PaymentResult.NotConfigured -> status = CheckoutStatus.Message(R.string.checkout_not_configured)
            }
        }
    }

    WatermarkBackground(backgroundType = BackgroundType.CLASSICAL_LIVING_ROOM, modifier = modifier) {
        Column(modifier = Modifier.fillMaxSize()) {
            GameHeader(title = stringResource(R.string.checkout_title), onBackClick = onBackClick)
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                if (status == CheckoutStatus.Paid) {
                    RoyalPanel(modifier = Modifier.widthIn(max = 560.dp).fillMaxWidth()) {
                        Icon(
                            Icons.Filled.CheckCircle,
                            contentDescription = null,
                            tint = GoldenGlow,
                            modifier = Modifier
                                .size(64.dp)
                                .align(Alignment.CenterHorizontally)
                        )
                        Text(
                            text = stringResource(R.string.checkout_success),
                            style = MaterialTheme.typography.titleLarge,
                            color = ParchmentText,
                            textAlign = TextAlign.Center,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 10.dp)
                        )
                        RoyalButton(
                            text = stringResource(R.string.language_select_continue),
                            onClick = onDone,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 16.dp)
                        )
                    }
                } else {
                    CheckoutForm(
                        itemLabel = itemLabel,
                        method = method,
                        onMethodChange = { method = it },
                        status = status,
                        onPay = pay,
                        onSimulateSuccess = grantMembership
                    )
                }
            }
        }
    }
}

@Composable
private fun CheckoutForm(
    itemLabel: String,
    method: PaymentMethod,
    onMethodChange: (PaymentMethod) -> Unit,
    status: CheckoutStatus,
    onPay: () -> Unit,
    onSimulateSuccess: () -> Unit
) {
    RoyalPanel(title = stringResource(R.string.checkout_order_summary), modifier = Modifier.widthIn(max = 560.dp).fillMaxWidth()) {
        SummaryRow(itemLabel, stringResource(R.string.checkout_amount))
        GoldRule(modifier = Modifier.padding(vertical = 8.dp))
        SummaryRow(stringResource(R.string.checkout_total), stringResource(R.string.checkout_amount), emphasise = true)
    }

    RoyalPanel(title = stringResource(R.string.checkout_method_title), modifier = Modifier.widthIn(max = 560.dp).fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            methodOptions.forEach { option ->
                MethodRow(option = option, selected = method == option.method, onSelect = { onMethodChange(option.method) })
            }
        }

        val message = status as? CheckoutStatus.Message
        if (message != null) {
            Text(
                text = stringResource(message.textRes),
                style = MaterialTheme.typography.bodyMedium,
                color = Color(0xFFF0B07A),
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp)
            )
        }

        RoyalButton(
            text = stringResource(R.string.membership_pay),
            onClick = onPay,
            enabled = status != CheckoutStatus.Processing,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 16.dp)
        )
        if (BuildConfig.DEBUG) {
            RoyalButton(
                text = stringResource(R.string.checkout_debug_simulate),
                onClick = onSimulateSuccess,
                style = RoyalButtonStyle.STEEL,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp)
            )
        }
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 12.dp)
        ) {
            Icon(Icons.Filled.Lock, contentDescription = null, tint = ParchmentTextDim, modifier = Modifier.size(16.dp))
            Text(
                text = stringResource(R.string.checkout_secure_note),
                style = MaterialTheme.typography.bodySmall,
                color = ParchmentTextDim,
                modifier = Modifier.padding(start = 6.dp)
            )
        }
    }
}

@Composable
private fun SummaryRow(label: String, value: String, emphasise: Boolean = false) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
        Text(
            text = label,
            style = if (emphasise) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyLarge,
            color = ParchmentText,
            modifier = Modifier.weight(1f)
        )
        Text(
            text = value,
            style = if (emphasise) MaterialTheme.typography.headlineMedium else MaterialTheme.typography.bodyLarge,
            color = if (emphasise) GoldenGlow else ParchmentText
        )
    }
}

@Composable
private fun MethodRow(option: MethodOption, selected: Boolean, onSelect: () -> Unit) {
    val shape = RoundedCornerShape(3.dp)
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .background(if (selected) PanelWoodLight else PanelWoodDark, shape)
            .border(if (selected) 2.dp else 1.dp, if (selected) GoldenGlow else GoldBevelDark, shape)
            .selectable(selected = selected, role = Role.RadioButton, onClick = onSelect)
            .padding(horizontal = 12.dp, vertical = 12.dp)
    ) {
        Icon(option.icon, contentDescription = null, tint = if (selected) GoldenGlow else GoldBevelLight, modifier = Modifier.size(24.dp))
        Text(
            text = stringResource(option.labelRes).uppercase(),
            style = RoyalLabelStyle,
            color = if (selected) GoldBevelLight else ParchmentText,
            modifier = Modifier
                .weight(1f)
                .padding(start = 12.dp)
        )
    }
}
