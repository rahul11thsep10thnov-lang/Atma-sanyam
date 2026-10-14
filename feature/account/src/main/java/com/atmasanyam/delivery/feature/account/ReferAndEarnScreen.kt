package com.atmasanyam.delivery.feature.account

import android.content.ActivityNotFoundException
import android.content.Intent
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.atmasanyam.delivery.core.designsystem.components.PrimaryButton
import com.atmasanyam.delivery.core.model.AccountState
import com.atmasanyam.delivery.core.model.ReferralCode

/** Shows the user's referral code and shares it through the system share sheet. */
@Composable
fun ReferAndEarnScreen(
    account: AccountState,
    onBack: () -> Unit,
    onSignIn: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val code = account.phoneNumber?.let { ReferralCode.forPhone(it) }.orEmpty()
    val shareText = stringResource(R.string.account_refer_share_text, code)

    SignedInScreen(
        title = stringResource(R.string.account_refer_title),
        isSignedIn = account.isSignedIn,
        onBack = onBack,
        onSignIn = onSignIn,
        modifier = modifier,
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
        ) {
            Text(text = stringResource(R.string.account_refer_intro), style = MaterialTheme.typography.bodyLarge)
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 20.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
            ) {
                Column(modifier = Modifier.fillMaxWidth().padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = stringResource(R.string.account_refer_your_code),
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        text = code,
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
            }
            PrimaryButton(
                text = stringResource(R.string.account_refer_share),
                onClick = {
                    val send = Intent(Intent.ACTION_SEND).apply {
                        type = "text/plain"
                        putExtra(Intent.EXTRA_TEXT, shareText)
                    }
                    try {
                        context.startActivity(Intent.createChooser(send, null))
                    } catch (e: ActivityNotFoundException) {
                        // No app can handle a share: nothing to open.
                    }
                },
            )
            Text(
                text = stringResource(R.string.account_refer_note),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 16.dp),
            )
        }
    }
}
