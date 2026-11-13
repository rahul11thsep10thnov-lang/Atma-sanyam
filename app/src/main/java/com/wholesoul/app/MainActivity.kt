package com.wholesoul.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.CompositionLocalProvider
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.wholesoul.app.core.designsystem.WholesoulTheme
import com.wholesoul.app.core.image.ImageProvider
import com.wholesoul.app.core.image.LocalImageProvider
import com.wholesoul.app.navigation.WholesoulApp
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject lateinit var imageProvider: ImageProvider

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            WholesoulTheme {
                CompositionLocalProvider(LocalImageProvider provides imageProvider) {
                    WholesoulApp()
                }
            }
        }
    }
}
