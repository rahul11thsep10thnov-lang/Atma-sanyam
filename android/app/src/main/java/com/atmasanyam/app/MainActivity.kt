package com.atmasanyam.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Surface
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import com.atmasanyam.app.ui.MainViewModel
import com.atmasanyam.app.ui.navigation.AtmaNavHost
import com.atmasanyam.app.ui.theme.AtmaSanyamTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            AtmaSanyamTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    val hasOnboarded by viewModel.hasOnboarded.collectAsState(initial = null)
                    val onboardedValue = hasOnboarded
                    if (onboardedValue == null) {
                        CircularProgressIndicator()
                    } else {
                        AtmaNavHost(hasOnboarded = onboardedValue)
                    }
                }
            }
        }
    }
}
