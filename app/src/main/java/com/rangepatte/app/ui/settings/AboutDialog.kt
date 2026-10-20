package com.rangepatte.app.ui.settings

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import com.rangepatte.app.BuildConfig
import com.rangepatte.app.R
import com.rangepatte.app.game.common.GameResultDialog
import com.rangepatte.app.ui.components.royal.RoyalButton
import com.rangepatte.app.ui.components.royal.RoyalButtonStyle

/** Opens [url] in the browser; does nothing if there is none or no app can show it. */
fun openLink(context: Context, url: String) {
    if (url.isBlank()) return
    runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
}

/** Settings ▸ About: the version and the public links (privacy policy, terms, deleting an account, contact). */
@Composable
fun AboutDialog(onDismiss: () -> Unit) {
    val context = LocalContext.current
    val privacy = stringResource(R.string.legal_privacy_url)
    val terms = stringResource(R.string.legal_terms_url)
    val deletion = stringResource(R.string.legal_delete_url)
    val email = stringResource(R.string.legal_support_email)
    GameResultDialog(
        title = stringResource(R.string.settings_about),
        lines = listOf(stringResource(R.string.app_name), stringResource(R.string.about_version, BuildConfig.VERSION_NAME)),
        primaryText = stringResource(R.string.about_close),
        onPrimary = onDismiss,
        extra = {
            if (privacy.isNotBlank()) RoyalButton(text = stringResource(R.string.about_privacy), onClick = { openLink(context, privacy) }, style = RoyalButtonStyle.STEEL, modifier = Modifier.fillMaxWidth().padding(top = 10.dp))
            if (terms.isNotBlank()) RoyalButton(text = stringResource(R.string.about_terms), onClick = { openLink(context, terms) }, style = RoyalButtonStyle.STEEL, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
            if (deletion.isNotBlank()) RoyalButton(text = stringResource(R.string.about_delete_web), onClick = { openLink(context, deletion) }, style = RoyalButtonStyle.STEEL, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
            if (email.isNotBlank()) RoyalButton(text = stringResource(R.string.about_contact), onClick = { openLink(context, "mailto:$email") }, style = RoyalButtonStyle.STEEL, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
        }
    )
}
