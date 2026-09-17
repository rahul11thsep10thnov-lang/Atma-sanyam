package com.rangepatte.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.rangepatte.app.navigation.RangEPatteNavHost
import com.rangepatte.app.ui.theme.RangEPatteTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            RangEPatteApp()
        }
    }
}

@Composable
private fun RangEPatteApp() {
    RangEPatteTheme {
        Surface(modifier = Modifier.fillMaxSize()) {
            RangEPatteNavHost()
        }
    }
}
