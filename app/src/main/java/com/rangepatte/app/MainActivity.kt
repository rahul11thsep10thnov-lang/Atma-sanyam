package com.rangepatte.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.rangepatte.app.data.local.LanguagePreferences
import com.rangepatte.app.domain.model.AppLanguage
import com.rangepatte.app.navigation.RangEPatteNavHost
import com.rangepatte.app.navigation.Routes
import com.rangepatte.app.ui.language.ProvideAppLocale
import com.rangepatte.app.ui.theme.RangEPatteTheme

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // The app is always dark (royal-court theme), so system bar icons must always be light.
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT)
        )
        val savedLanguage = LanguagePreferences.getSelectedLanguage(this)
        val startDestination = if (savedLanguage != null) Routes.GAMES else Routes.LANGUAGE_SELECT

        // Consent form (where required by law) and the Google ads SDK; skipped for paid members.
        AppServices.ads.start(this)

        setContent {
            // Held as state so choosing a language re-renders the whole UI in it immediately.
            var language by remember { mutableStateOf(savedLanguage ?: AppLanguage.ENGLISH) }
            ProvideAppLocale(language) {
                RangEPatteTheme {
                    Surface(modifier = Modifier.fillMaxSize()) {
                        RangEPatteNavHost(
                            startDestination = startDestination,
                            currentLanguage = language,
                            onLanguageSelected = { chosen ->
                                LanguagePreferences.setSelectedLanguage(this@MainActivity, chosen)
                                language = chosen
                            }
                        )
                    }
                }
            }
        }
    }
}
