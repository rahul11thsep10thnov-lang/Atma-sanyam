package com.atmasanyam.delivery

import android.graphics.Color as AndroidColor
import android.os.Bundle
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.core.os.LocaleListCompat
import com.atmasanyam.delivery.core.designsystem.theme.AtmaSanyamTheme
import com.atmasanyam.delivery.core.model.AppLanguage
import com.atmasanyam.delivery.navigation.AtmaSanyamNavHost

/**
 * AppCompatActivity (rather than a plain ComponentActivity) is what makes the in-app language
 * switch work: AppCompatDelegate.setApplicationLocales() re-creates the activity with the chosen
 * locale and remembers it, so every stringResource() in the app picks up values-hi/ automatically.
 */
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // The pastel background is light-only, so keep the status/navigation bar icons dark.
        val lightBars = SystemBarStyle.light(AndroidColor.TRANSPARENT, AndroidColor.TRANSPARENT)
        enableEdgeToEdge(statusBarStyle = lightBars, navigationBarStyle = lightBars)
        setContent {
            AtmaSanyamTheme {
                Box(modifier = Modifier.fillMaxSize()) {
                    Image(
                        painter = painterResource(R.drawable.app_background),
                        contentDescription = null,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop,
                    )
                    Surface(modifier = Modifier.fillMaxSize(), color = Color.Transparent) {
                        AtmaSanyamNavHost(onLanguageSelected = ::applyLanguage)
                    }
                }
            }
        }
    }

    private fun applyLanguage(language: AppLanguage) {
        AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(language.languageTag))
    }
}
