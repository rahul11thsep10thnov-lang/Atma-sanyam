package com.rangepatte.app.ui.profile

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.rangepatte.app.AppServices
import com.rangepatte.app.R
import com.rangepatte.app.data.profile.ClaimResult
import com.rangepatte.app.domain.profile.AvatarCatalog
import com.rangepatte.app.domain.profile.Username
import com.rangepatte.app.ui.background.BackgroundType
import com.rangepatte.app.ui.components.GameHeader
import com.rangepatte.app.ui.components.WatermarkBackground
import com.rangepatte.app.ui.components.royal.RoyalButton
import com.rangepatte.app.ui.components.royal.RoyalPanel
import com.rangepatte.app.ui.components.royal.RoyalTextField
import com.rangepatte.app.ui.components.royal.antiquePlaque
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.GoldenGlow
import com.rangepatte.app.ui.theme.ParchmentText
import com.rangepatte.app.ui.theme.ParchmentTextDim
import com.rangepatte.app.ui.theme.RoyalTitleStyle
import kotlinx.coroutines.delay

private val Green = Color(0xFF7DDC9A)
private val Red = Color(0xFFF08A7A)

/** What the live check says about the name typed so far. */
private sealed interface Check {
    data object Idle : Check
    data object Checking : Check
    data object Available : Check
    data object Taken : Check
    data class Invalid(val problem: Username.Problem) : Check
    data object NetworkError : Check
}

/**
 * First-time setup, step 1 (approved Design 1): the name friends will know you by, previewed on a
 * nameplate, checked as you type (debounced) and reserved atomically when you continue.
 */
@Composable
fun UsernameScreen(onDone: () -> Unit, onBackClick: () -> Unit, modifier: Modifier = Modifier) {
    val repository = AppServices.profile
    val profile by repository.profile.collectAsState()
    val loaded by repository.loaded.collectAsState()
    var name by remember { mutableStateOf(profile?.username.orEmpty()) }
    var check by remember { mutableStateOf<Check>(Check.Idle) }
    var busy by remember { mutableStateOf(false) }
    var suggestions by remember { mutableStateOf<List<String>>(emptyList()) }

    // Someone who already has a username (same account on a new phone) skips this step.
    LaunchedEffect(loaded, profile?.username) {
        if (loaded && !profile?.username.isNullOrBlank() && name == profile?.username) onDone()
    }

    // Live availability: wait 400 ms after the last keystroke, then ask the store once.
    LaunchedEffect(name) {
        suggestions = emptyList()
        val problem = Username.validate(name)
        if (name.isEmpty()) { check = Check.Idle; return@LaunchedEffect }
        if (problem != null) { check = Check.Invalid(problem); return@LaunchedEffect }
        check = Check.Checking
        delay(400)
        val typed = name
        repository.checkUsername(typed) { result ->
            if (typed != name) return@checkUsername
            check = result.fold(
                onSuccess = { taken -> if (taken) { suggestions = Username.suggestions(typed); Check.Taken } else Check.Available },
                onFailure = { Check.NetworkError }
            )
        }
    }

    fun claim() {
        if (busy || check != Check.Available) return
        busy = true
        repository.claimUsername(name) { result ->
            busy = false
            when (result) {
                ClaimResult.Claimed -> onDone()
                ClaimResult.Taken -> { check = Check.Taken; suggestions = Username.suggestions(name) }
                is ClaimResult.Failed -> check = Check.NetworkError
            }
        }
    }

    WatermarkBackground(backgroundType = BackgroundType.COURTYARD, modifier = modifier) {
        Column(modifier = Modifier.fillMaxSize()) {
            GameHeader(title = stringResource(R.string.username_title), onBackClick = onBackClick)
            Column(
                modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                RoyalPanel(title = stringResource(R.string.username_heading), modifier = Modifier.widthIn(max = 520.dp).fillMaxWidth()) {
                    Text(
                        text = stringResource(R.string.username_intro),
                        style = MaterialTheme.typography.bodyLarge, color = ParchmentTextDim, textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                    // The nameplate: exactly how the name will look at a table.
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.padding(top = 14.dp).widthIn(min = 160.dp).antiquePlaque(active = check == Check.Available).padding(12.dp)
                    ) {
                        AvatarView(AvatarCatalog.byId(profile?.avatarId), size = 48.dp)
                        Text(
                            text = if (name.isBlank()) stringResource(R.string.username_placeholder) else name,
                            style = RoyalTitleStyle, color = GoldBevelLight, modifier = Modifier.padding(top = 6.dp)
                        )
                    }
                    RoyalTextField(
                        value = name,
                        onValueChange = { name = Username.sanitizeInput(it) },
                        label = stringResource(R.string.username_label),
                        prefix = "@",
                        isError = check is Check.Taken || check is Check.Invalid && name.length >= Username.MIN_LENGTH,
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(onDone = { claim() }),
                        enabled = !busy,
                        modifier = Modifier.padding(top = 14.dp)
                    )
                    StatusLine(check, name)
                    if (suggestions.isNotEmpty()) {
                        Text(stringResource(R.string.username_try), style = MaterialTheme.typography.bodyMedium, color = ParchmentTextDim, modifier = Modifier.padding(top = 8.dp))
                        suggestions.forEach { s ->
                            Text(
                                text = "@$s", style = MaterialTheme.typography.bodyLarge, color = GoldenGlow,
                                modifier = Modifier.padding(top = 4.dp).clickable { name = s }
                            )
                        }
                    }
                    Text(
                        text = stringResource(R.string.username_rules, Username.MIN_LENGTH, Username.MAX_LENGTH),
                        style = MaterialTheme.typography.bodySmall, color = ParchmentTextDim, modifier = Modifier.fillMaxWidth().padding(top = 12.dp)
                    )
                    RoyalButton(
                        text = stringResource(R.string.username_continue),
                        onClick = ::claim,
                        enabled = check == Check.Available && !busy,
                        modifier = Modifier.fillMaxWidth().padding(top = 16.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun StatusLine(check: Check, name: String) {
    val (text, color) = when (check) {
        Check.Idle -> null to ParchmentTextDim
        Check.Checking -> stringResource(R.string.username_checking) to ParchmentTextDim
        Check.Available -> stringResource(R.string.username_available) to Green
        Check.Taken -> stringResource(R.string.username_taken) to Red
        Check.NetworkError -> stringResource(R.string.username_check_failed) to Red
        is Check.Invalid -> when (check.problem) {
            Username.Problem.TOO_SHORT -> if (name.isEmpty()) null else stringResource(R.string.username_too_short, Username.MIN_LENGTH)
            Username.Problem.TOO_LONG -> stringResource(R.string.username_too_long, Username.MAX_LENGTH)
            Username.Problem.BAD_CHARACTERS -> stringResource(R.string.username_bad_chars)
            Username.Problem.RESERVED -> stringResource(R.string.username_reserved)
        } to Red
    }
    if (text == null) return
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 8.dp)) {
        if (check == Check.Checking) CircularProgressIndicator(color = GoldBevelLight, strokeWidth = 2.dp, modifier = Modifier.padding(end = 8.dp).size(14.dp))
        Text(text = text, style = MaterialTheme.typography.bodyMedium, color = color)
    }
}
