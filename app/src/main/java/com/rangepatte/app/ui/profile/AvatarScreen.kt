package com.rangepatte.app.ui.profile

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.rangepatte.app.AppServices
import com.rangepatte.app.R
import com.rangepatte.app.domain.profile.AvatarCatalog
import com.rangepatte.app.ui.background.BackgroundType
import com.rangepatte.app.ui.components.GameHeader
import com.rangepatte.app.ui.components.WatermarkBackground
import com.rangepatte.app.ui.components.royal.RoyalButton
import com.rangepatte.app.ui.components.royal.RoyalPanel
import com.rangepatte.app.ui.components.royal.antiquePlaque
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.GoldenGlow
import com.rangepatte.app.ui.theme.ParchmentTextDim
import com.rangepatte.app.ui.theme.RoyalTitleStyle

/**
 * First-time setup, step 2 (approved Design 1): the twenty avatar discs in a grid under a nameplate
 * that previews the chosen one with the username. Also opened from Profile to change the picture.
 */
@Composable
fun AvatarScreen(onDone: () -> Unit, onBackClick: () -> Unit, modifier: Modifier = Modifier) {
    val repository = AppServices.profile
    val profile by repository.profile.collectAsState()
    var selectedId by remember { mutableStateOf(profile?.avatarId) }
    var busy by remember { mutableStateOf(false) }
    var failed by remember { mutableStateOf(false) }
    val selected = AvatarCatalog.byId(selectedId)

    WatermarkBackground(backgroundType = BackgroundType.COURTYARD, modifier = modifier) {
        Column(modifier = Modifier.fillMaxSize()) {
            GameHeader(title = stringResource(R.string.avatar_title), onBackClick = onBackClick)
            Column(modifier = Modifier.fillMaxSize().padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                RoyalPanel(title = stringResource(R.string.avatar_heading), modifier = Modifier.widthIn(max = 520.dp).fillMaxWidth().weight(1f, fill = false)) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.align(Alignment.CenterHorizontally).widthIn(min = 160.dp).antiquePlaque(active = selected != null).padding(12.dp)
                    ) {
                        AvatarView(selected, size = 64.dp)
                        Text(
                            text = profile?.username?.let { "@$it" } ?: stringResource(R.string.username_placeholder),
                            style = RoyalTitleStyle, color = GoldBevelLight, modifier = Modifier.padding(top = 6.dp)
                        )
                    }
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(4),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxWidth().padding(top = 14.dp).weight(1f, fill = false)
                    ) {
                        items(AvatarCatalog.all, key = { it.id }) { avatar ->
                            val isSelected = avatar.id == selectedId
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .semantics { contentDescription = avatar.title; this.selected = isSelected }
                                    .clickable(role = Role.RadioButton) { selectedId = avatar.id; failed = false }
                                    .padding(4.dp)
                            ) {
                                AvatarView(
                                    avatar, size = 64.dp,
                                    ring = if (isSelected) GoldenGlow else null,
                                    modifier = if (isSelected) Modifier.shadow(10.dp, CircleShape, ambientColor = GoldenGlow, spotColor = GoldenGlow) else Modifier
                                )
                            }
                        }
                    }
                    if (failed) {
                        Text(stringResource(R.string.avatar_save_failed), style = MaterialTheme.typography.bodyMedium, color = androidx.compose.ui.graphics.Color(0xFFF08A7A), textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
                    }
                    Text(
                        text = stringResource(R.string.avatar_hint),
                        style = MaterialTheme.typography.bodySmall, color = ParchmentTextDim, textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth().padding(top = 8.dp)
                    )
                    RoyalButton(
                        text = stringResource(R.string.username_continue),
                        enabled = selected != null && !busy,
                        onClick = {
                            val id = selectedId ?: return@RoyalButton
                            busy = true
                            repository.saveAvatar(id) { result ->
                                busy = false
                                result.onSuccess { onDone() }.onFailure { failed = true }
                            }
                        },
                        modifier = Modifier.fillMaxWidth().padding(top = 12.dp)
                    )
                }
            }
        }
    }
}
