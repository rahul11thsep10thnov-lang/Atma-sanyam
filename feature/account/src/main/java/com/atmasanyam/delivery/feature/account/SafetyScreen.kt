package com.atmasanyam.delivery.feature.account

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CheckCircleOutline
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.atmasanyam.delivery.core.designsystem.components.LokrathScreen
import com.atmasanyam.delivery.core.designsystem.components.PrimaryButton

private const val EMERGENCY_NUMBER = "112"

/** Safety guidance for senders and receivers, plus a one-tap dial of India's emergency number. Open to guests. */
@Composable
fun SafetyScreen(onBack: () -> Unit, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val tips = listOf(
        R.string.account_safety_tip_pack,
        R.string.account_safety_tip_vehicle,
        R.string.account_safety_tip_booking_id,
        R.string.account_safety_tip_code,
        R.string.account_safety_tip_valuables,
        R.string.account_safety_tip_prohibited,
    )
    LokrathScreen(title = stringResource(R.string.account_safety_title), onBack = onBack, modifier = modifier) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 8.dp),
        ) {
            Text(
                text = stringResource(R.string.account_safety_intro),
                style = MaterialTheme.typography.bodyLarge,
                modifier = Modifier.padding(bottom = 12.dp),
            )
            tips.forEach { tip ->
                Row(modifier = Modifier.padding(vertical = 8.dp), verticalAlignment = Alignment.Top) {
                    Icon(
                        Icons.Outlined.CheckCircleOutline,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(end = 12.dp),
                    )
                    Text(text = stringResource(tip), style = MaterialTheme.typography.bodyMedium)
                }
            }
            Text(
                text = stringResource(R.string.account_safety_emergency_note),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 16.dp, bottom = 12.dp),
            )
            PrimaryButton(
                text = stringResource(R.string.account_safety_call, EMERGENCY_NUMBER),
                onClick = {
                    // ACTION_DIAL only opens the dialer with the number filled in; the user presses call.
                    try {
                        context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$EMERGENCY_NUMBER")))
                    } catch (e: ActivityNotFoundException) {
                        // Device without a phone app: nothing to open.
                    }
                },
                modifier = Modifier.padding(bottom = 16.dp),
            )
        }
    }
}
