package com.rangepatte.app

import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.rangepatte.app.data.local.LanguagePreferences
import com.rangepatte.app.navigation.RangEPatteNavHost
import com.rangepatte.app.navigation.Routes
import com.rangepatte.app.ui.language.withAppLocale
import com.rangepatte.app.ui.theme.RangEPatteTheme

class MainActivity : ComponentActivity() {

    override fun attachBaseContext(newBase: Context) {
        val language = LanguagePreferences.getSelectedLanguage(newBase)
        super.attachBaseContext(if (language != null) newBase.withAppLocale(language) else newBase)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val languageAlreadyChosen = LanguagePreferences.getSelectedLanguage(this) != null
        val startDestination = if (languageAlreadyChosen) Routes.HOME else Routes.LANGUAGE_SELECT
        setContent {
            RangEPatteApp(startDestination = startDestination)
        }
    }
}

@Composable
private fun RangEPatteApp(startDestination: String) {
    RangEPatteTheme {
        Surface(modifier = Modifier.fillMaxSize()) {
            RangEPatteNavHost(startDestination = startDestination)
        }
    }
}
