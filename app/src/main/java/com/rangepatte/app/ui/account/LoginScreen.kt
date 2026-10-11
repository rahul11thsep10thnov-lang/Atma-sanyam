package com.rangepatte.app.ui.account

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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.rangepatte.app.AppServices
import com.rangepatte.app.R
import com.rangepatte.app.data.auth.DemoPhoneAuthService
import com.rangepatte.app.ui.background.BackgroundType
import com.rangepatte.app.ui.components.GameHeader
import com.rangepatte.app.ui.components.WatermarkBackground
import com.rangepatte.app.ui.components.royal.RoyalButton
import com.rangepatte.app.ui.components.royal.RoyalButtonStyle
import com.rangepatte.app.ui.components.royal.RoyalPanel
import com.rangepatte.app.ui.components.royal.RoyalTextField
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import com.rangepatte.app.ui.theme.GoldBevelDark
import com.rangepatte.app.ui.theme.GoldenGlow
import com.rangepatte.app.ui.language.LocalAppLanguage
import com.rangepatte.app.ui.language.findActivity
import com.rangepatte.app.ui.theme.BodyFont
import com.rangepatte.app.ui.theme.GoldBevelDark
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.GoldenGlow
import com.rangepatte.app.ui.theme.PanelWoodDark
import com.rangepatte.app.ui.theme.ParchmentText
import com.rangepatte.app.ui.theme.ParchmentTextDim

/**
 * Login / Sign up with a mobile number and an SMS OTP. When someone is already signed in, the same
 * page shows their account with a Log out button.
 */
@Composable
fun LoginScreen(
    onBackClick: () -> Unit,
    onSignedIn: () -> Unit,
    onEditProfile: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: LoginViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val user by AppServices.account.currentUser.collectAsState()

    LaunchedEffect(uiState.signedIn) {
        if (uiState.signedIn) onSignedIn()
    }

    WatermarkBackground(backgroundType = BackgroundType.COURTYARD, modifier = modifier) {
        Column(modifier = Modifier.fillMaxSize()) {
            GameHeader(title = stringResource(R.string.login_title), onBackClick = onBackClick)
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                val signedInUser = user
                if (signedInUser != null && !uiState.signedIn) {
                    RoyalPanel(
                        title = stringResource(R.string.account_title),
                        modifier = Modifier.widthIn(max = 520.dp).fillMaxWidth()
                    ) {
                        val profile by AppServices.profile.profile.collectAsState()
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            com.rangepatte.app.ui.profile.MyAvatar(profile?.avatarId, size = 48.dp)
                            Column(modifier = Modifier.padding(start = 12.dp)) {
                                Text(
                                    text = profile?.username?.let { "@$it" } ?: signedInUser.displayName ?: "",
                                    style = MaterialTheme.typography.titleLarge, color = GoldBevelLight
                                )
                                Text(signedInUser.phoneNumber, style = MaterialTheme.typography.bodyLarge, color = ParchmentText)
                            }
                        }
                        RoyalButton(
                            text = stringResource(R.string.profile_edit),
                            onClick = onEditProfile,
                            style = RoyalButtonStyle.STEEL,
                            modifier = Modifier.fillMaxWidth().padding(top = 14.dp)
                        )
                        RoyalButton(
                            text = stringResource(R.string.account_logout),
                            onClick = viewModel::signOut,
                            style = RoyalButtonStyle.STEEL,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 18.dp)
                        )
                    }
                } else {
                    LoginForm(uiState = uiState, viewModel = viewModel)
                }
            }
        }
    }
}

@Composable
private fun LoginForm(uiState: LoginUiState, viewModel: LoginViewModel) {
    val activity = LocalContext.current.findActivity()
    val languageTag = LocalAppLanguage.current.localeTag
    val sendOtp = { if (activity != null) viewModel.requestOtp(activity, languageTag) }
    val verify = { viewModel.verifyOtp(languageTag) }

    RoyalPanel(
        title = stringResource(R.string.login_title),
        modifier = Modifier.widthIn(max = 520.dp).fillMaxWidth()
    ) {
        if (viewModel.isDemoMode) {
            DemoNotice()
        }
        when (uiState.step) {
            LoginStep.ENTER_PHONE -> {
                CountryPicker(selected = uiState.country, onSelect = viewModel::onCountryChange)
                RoyalTextField(
                    value = uiState.phoneDigits,
                    onValueChange = viewModel::onPhoneChange,
                    label = stringResource(R.string.login_phone_label),
                    prefix = uiState.country.dial + " ",
                    isError = uiState.errorRes == R.string.login_invalid_phone,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone, imeAction = ImeAction.Next),
                    modifier = Modifier.padding(top = 4.dp)
                )
                RoyalTextField(
                    value = uiState.name,
                    onValueChange = viewModel::onNameChange,
                    label = stringResource(R.string.login_name_label),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { sendOtp() }),
                    modifier = Modifier.padding(top = 10.dp)
                )
                ErrorLine(uiState.errorRes)
                RoyalButton(
                    text = stringResource(R.string.login_send_otp),
                    onClick = sendOtp,
                    enabled = !uiState.isBusy && LoginViewModel.isValidNumber(uiState.country, uiState.phoneDigits),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 16.dp)
                )
                Text(
                    text = stringResource(R.string.login_sms_note),
                    style = MaterialTheme.typography.bodySmall,
                    color = ParchmentTextDim,
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 10.dp)
                )
            }
            LoginStep.ENTER_OTP -> {
                Text(
                    text = stringResource(R.string.login_otp_sent_format, LoginViewModel.phoneE164(uiState.country, uiState.phoneDigits)),
                    style = MaterialTheme.typography.bodyLarge,
                    color = ParchmentText,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
                RoyalTextField(
                    value = uiState.otp,
                    onValueChange = viewModel::onOtpChange,
                    label = stringResource(R.string.login_otp_label),
                    isError = uiState.errorRes == R.string.login_invalid_otp,
                    textStyle = TextStyle(fontFamily = BodyFont, fontSize = 24.sp, letterSpacing = 8.sp, color = ParchmentText),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword, imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { verify() }),
                    modifier = Modifier.padding(top = 12.dp)
                )
                ErrorLine(uiState.errorRes)
                RoyalButton(
                    text = stringResource(R.string.login_verify),
                    onClick = verify,
                    enabled = !uiState.isBusy && uiState.otp.length == LoginViewModel.OTP_DIGITS,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 16.dp)
                )
                Row(
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 10.dp)
                ) {
                    RoyalButton(
                        text = if (uiState.resendSecondsLeft > 0) {
                            stringResource(R.string.login_resend_in_format, uiState.resendSecondsLeft)
                        } else {
                            stringResource(R.string.login_resend)
                        },
                        onClick = sendOtp,
                        enabled = !uiState.isBusy && uiState.resendSecondsLeft == 0,
                        style = RoyalButtonStyle.STEEL,
                        modifier = Modifier.weight(1f)
                    )
                    RoyalButton(
                        text = stringResource(R.string.login_change_number),
                        onClick = viewModel::changeNumber,
                        style = RoyalButtonStyle.STEEL,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }
    }
}

/** A row of dial-code chips; India is first and the default. */
@Composable
private fun CountryPicker(selected: CountryCode, onSelect: (CountryCode) -> Unit) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        modifier = Modifier.fillMaxWidth().padding(top = 12.dp).horizontalScroll(rememberScrollState())
    ) {
        COUNTRY_CODES.forEach { country ->
            val isSelected = country == selected
            Text(
                text = "${country.iso} ${country.dial}",
                style = MaterialTheme.typography.labelLarge,
                color = if (isSelected) GoldenGlow else ParchmentTextDim,
                modifier = Modifier
                    .border(1.dp, if (isSelected) GoldenGlow else GoldBevelDark, RoundedCornerShape(3.dp))
                    .clickable(role = Role.RadioButton) { onSelect(country) }
                    .semantics { contentDescription = country.name }
                    .padding(horizontal = 10.dp, vertical = 6.dp)
            )
        }
    }
}

@Composable
private fun ErrorLine(errorRes: Int?) {
    if (errorRes != null) {
        Text(
            text = stringResource(errorRes),
            style = MaterialTheme.typography.bodyMedium,
            color = Color(0xFFF08A7A),
            modifier = Modifier.padding(top = 8.dp)
        )
    }
}

/** Shown while Firebase is not connected: explains that no real SMS is sent and gives the demo code. */
@Composable
private fun DemoNotice() {
    val shape = RoundedCornerShape(3.dp)
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 12.dp)
            .background(PanelWoodDark, shape)
            .border(1.dp, GoldBevelDark, shape)
            .padding(10.dp)
    ) {
        Icon(Icons.Filled.Info, contentDescription = null, tint = GoldenGlow, modifier = Modifier.size(20.dp))
        Text(
            text = stringResource(R.string.login_demo_notice_format, DemoPhoneAuthService.DEMO_OTP),
            style = MaterialTheme.typography.bodyMedium,
            color = ParchmentText,
            modifier = Modifier.padding(start = 8.dp)
        )
    }
}
