package com.rangepatte.app.ui.membership

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Block
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.WorkspacePremium
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.rangepatte.app.AppServices
import com.rangepatte.app.R
import com.rangepatte.app.ui.background.BackgroundType
import com.rangepatte.app.ui.components.GameHeader
import com.rangepatte.app.ui.components.OrnamentalDivider
import com.rangepatte.app.ui.components.WatermarkBackground
import com.rangepatte.app.ui.components.royal.RoyalButton
import com.rangepatte.app.ui.components.royal.RoyalPanel
import com.rangepatte.app.ui.theme.ButtonCrimsonBottom
import com.rangepatte.app.ui.theme.ButtonCrimsonTop
import com.rangepatte.app.ui.theme.GoldBevelDark
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.GoldenGlow
import com.rangepatte.app.ui.theme.ParchmentText
import com.rangepatte.app.ui.theme.ParchmentTextDim
import com.rangepatte.app.ui.theme.RoyalTitleStyle
import java.text.DateFormat
import java.util.Date

/**
 * Opened from the "Remove ads?" tab: the invitation to join the community for ₹29/month. A player
 * must be logged in (so the membership belongs to their account), then Pay opens the checkout.
 */
@Composable
fun MembershipScreen(
    onBackClick: () -> Unit,
    onLoginClick: () -> Unit,
    onPayClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val user by AppServices.account.currentUser.collectAsState()
    val adFreeUntil by AppServices.membership.adFreeUntilMillis.collectAsState()
    val isMember = adFreeUntil > System.currentTimeMillis()

    WatermarkBackground(backgroundType = BackgroundType.COURTYARD, modifier = modifier) {
        Column(modifier = Modifier.fillMaxSize()) {
            GameHeader(title = stringResource(R.string.membership_title), onBackClick = onBackClick)
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                RoyalPanel(modifier = Modifier.widthIn(max = 560.dp).fillMaxWidth()) {
                    Icon(
                        imageVector = Icons.Filled.WorkspacePremium,
                        contentDescription = null,
                        tint = GoldenGlow,
                        modifier = Modifier
                            .size(64.dp)
                            .align(Alignment.CenterHorizontally)
                    )
                    OrnamentalDivider(modifier = Modifier.padding(vertical = 6.dp))
                    Text(
                        text = stringResource(R.string.membership_heading),
                        style = RoyalTitleStyle,
                        color = GoldBevelLight,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Text(
                        text = stringResource(R.string.membership_body),
                        style = MaterialTheme.typography.titleMedium,
                        color = ParchmentText,
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 10.dp)
                    )
                    OrnamentalDivider(modifier = Modifier.padding(vertical = 10.dp))

                    Benefit(Icons.Filled.Block, stringResource(R.string.membership_benefit_no_ads))
                    Benefit(Icons.Filled.Favorite, stringResource(R.string.membership_benefit_support))

                    PricePlaque(text = stringResource(R.string.membership_price))

                    if (isMember) {
                        val until = DateFormat.getDateInstance(DateFormat.MEDIUM).format(Date(adFreeUntil))
                        Text(
                            text = stringResource(R.string.membership_active_until_format, until),
                            style = MaterialTheme.typography.bodyLarge,
                            color = GoldenGlow,
                            textAlign = TextAlign.Center,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 12.dp)
                        )
                    }

                    if (user == null) {
                        Text(
                            text = stringResource(R.string.membership_login_required),
                            style = MaterialTheme.typography.bodyMedium,
                            color = ParchmentTextDim,
                            textAlign = TextAlign.Center,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 14.dp)
                        )
                        RoyalButton(
                            text = stringResource(R.string.topbar_login),
                            onClick = onLoginClick,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 10.dp)
                        )
                    } else {
                        RoyalButton(
                            text = stringResource(if (isMember) R.string.membership_extend else R.string.membership_pay),
                            onClick = onPayClick,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 16.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun Benefit(icon: ImageVector, text: String) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 4.dp)) {
        Icon(imageVector = icon, contentDescription = null, tint = GoldBevelLight, modifier = Modifier.size(22.dp))
        Text(
            text = text,
            style = MaterialTheme.typography.bodyLarge,
            color = ParchmentText,
            modifier = Modifier.padding(start = 10.dp)
        )
    }
}

@Composable
private fun PricePlaque(text: String) {
    val shape = RoundedCornerShape(3.dp)
    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 14.dp)
            .background(Brush.verticalGradient(listOf(ButtonCrimsonTop, ButtonCrimsonBottom)), shape)
            .border(1.dp, GoldBevelDark, shape)
            .padding(vertical = 10.dp)
    ) {
        Text(text = text, style = MaterialTheme.typography.headlineMedium, color = GoldenGlow, textAlign = TextAlign.Center)
    }
}
