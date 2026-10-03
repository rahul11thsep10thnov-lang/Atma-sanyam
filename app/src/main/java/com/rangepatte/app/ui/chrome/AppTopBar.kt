package com.rangepatte.app.ui.chrome

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.GenericShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.WorkspacePremium
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rangepatte.app.R
import com.rangepatte.app.data.auth.UserProfile
import com.rangepatte.app.ui.components.royal.GoldRule
import com.rangepatte.app.ui.theme.ButtonCrimsonBottom
import com.rangepatte.app.ui.theme.ButtonCrimsonTop
import com.rangepatte.app.ui.theme.ButtonSteelBottom
import com.rangepatte.app.ui.theme.ButtonSteelTop
import com.rangepatte.app.ui.theme.GoldBevelDark
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.GoldenGlow
import com.rangepatte.app.ui.theme.PanelWoodDark
import com.rangepatte.app.ui.theme.PanelWoodMid
import com.rangepatte.app.ui.theme.ParchmentText
import com.rangepatte.app.ui.theme.RoyalLabelStyle

/**
 * The strip shown at the top of every page: the "Remove ads?" call-in tab on the left (a gold
 * "Ad-free" seal once the player is a member) and Login / Sign up — or the signed-in player — on
 * the right.
 */
@Composable
fun AppTopBar(
    isAdFree: Boolean,
    user: UserProfile?,
    onRemoveAdsClick: () -> Unit,
    onAccountClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(Brush.verticalGradient(listOf(PanelWoodMid, PanelWoodDark)))
            .windowInsetsPadding(WindowInsets.statusBars)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 10.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            if (isAdFree) {
                TopBarTab(
                    text = stringResource(R.string.topbar_ad_free),
                    icon = Icons.Filled.WorkspacePremium,
                    colors = listOf(Color(0xFF2E7A4F), Color(0xFF0E2A1A)),
                    iconTint = GoldenGlow,
                    onClick = onRemoveAdsClick,
                    modifier = Modifier.weight(1f, fill = false)
                )
            } else {
                TopBarTab(
                    text = stringResource(R.string.topbar_remove_ads),
                    icon = Icons.Filled.Campaign,
                    colors = listOf(ButtonCrimsonTop, ButtonCrimsonBottom),
                    iconTint = GoldenGlow,
                    onClick = onRemoveAdsClick,
                    pennant = true,
                    modifier = Modifier.weight(1f, fill = false)
                )
            }
            Spacer(modifier = Modifier.width(10.dp))
            TopBarTab(
                text = user?.let(::shortName) ?: stringResource(R.string.topbar_login),
                icon = if (user != null) Icons.Filled.AccountCircle else Icons.Filled.Person,
                colors = listOf(ButtonSteelTop, ButtonSteelBottom),
                iconTint = GoldBevelLight,
                onClick = onAccountClick,
                modifier = Modifier.weight(1f, fill = false)
            )
        }
        GoldRule()
    }
}

/** Name if given, otherwise the phone number with all but the last four digits hidden. */
private fun shortName(user: UserProfile): String =
    user.displayName ?: ("•••" + user.phoneNumber.takeLast(4))

/** A pennant whose right edge is cut into a swallow-tail, like a herald's call-in banner. */
private val PennantShape = GenericShape { size, _ ->
    val notch = size.height * 0.28f
    moveTo(0f, 0f)
    lineTo(size.width, 0f)
    lineTo(size.width - notch, size.height / 2f)
    lineTo(size.width, size.height)
    lineTo(0f, size.height)
    close()
}

@Composable
private fun TopBarTab(
    text: String,
    icon: ImageVector,
    colors: List<Color>,
    iconTint: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    pennant: Boolean = false
) {
    val shape = if (pennant) PennantShape else RoundedCornerShape(3.dp)
    Row(
        modifier = modifier
            .background(Brush.verticalGradient(colors), shape)
            .border(1.dp, GoldBevelDark, shape)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(start = 10.dp, end = if (pennant) 18.dp else 10.dp, top = 7.dp, bottom = 7.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(imageVector = icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(18.dp))
        Text(
            text = text.uppercase(),
            style = RoyalLabelStyle.copy(fontSize = 13.sp, letterSpacing = 0.6.sp),
            color = ParchmentText,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(start = 6.dp)
        )
    }
}
