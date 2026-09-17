package com.atmasanyam.delivery

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.atmasanyam.delivery.core.designsystem.theme.AtmaSanyamTheme
import com.atmasanyam.delivery.navigation.AtmaSanyamNavHost

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            AtmaSanyamTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    AtmaSanyamNavHost()
                }
            }
        }
    }
}
