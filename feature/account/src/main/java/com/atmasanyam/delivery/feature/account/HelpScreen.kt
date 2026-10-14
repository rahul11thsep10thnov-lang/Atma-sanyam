package com.atmasanyam.delivery.feature.account

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
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.atmasanyam.delivery.core.designsystem.components.LokrathScreen

/** Static help: what Lokrath is and answers to common questions. Open to guests. */
@Composable
fun HelpScreen(onBack: () -> Unit, modifier: Modifier = Modifier) {
    val faqs = listOf(
        R.string.account_help_q_book to R.string.account_help_a_book,
        R.string.account_help_q_price to R.string.account_help_a_price,
        R.string.account_help_q_vehicle to R.string.account_help_a_vehicle,
        R.string.account_help_q_login to R.string.account_help_a_login,
        R.string.account_help_q_language to R.string.account_help_a_language,
    )
    LokrathScreen(title = stringResource(R.string.account_help_title), onBack = onBack, modifier = modifier) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 8.dp),
        ) {
            Text(text = stringResource(R.string.account_help_about_heading), style = MaterialTheme.typography.titleMedium)
            Text(
                text = stringResource(R.string.account_help_about_body),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 4.dp, bottom = 16.dp),
            )
            Text(text = stringResource(R.string.account_help_faq_heading), style = MaterialTheme.typography.titleMedium)
            faqs.forEach { (question, answer) ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 12.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(text = stringResource(question), style = MaterialTheme.typography.titleSmall)
                        Text(
                            text = stringResource(answer),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 4.dp),
                        )
                    }
                }
            }
        }
    }
}
