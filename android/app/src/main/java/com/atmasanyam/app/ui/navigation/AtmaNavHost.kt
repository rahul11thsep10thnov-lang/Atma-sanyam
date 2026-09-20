package com.atmasanyam.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.atmasanyam.app.ui.home.HomeScreen
import com.atmasanyam.app.ui.location.LocationFilterScreen
import com.atmasanyam.app.ui.onboarding.LanguageSelectionScreen
import com.atmasanyam.app.ui.player.StoryDetailScreen
import com.atmasanyam.app.ui.player.VideoPlayerScreen
import com.atmasanyam.app.ui.search.SearchScreen
import com.atmasanyam.app.ui.settings.SettingsScreen

@Composable
fun AtmaNavHost(hasOnboarded: Boolean) {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = if (hasOnboarded) NavRoutes.HOME else NavRoutes.LANGUAGE_ONBOARDING,
    ) {
        composable(NavRoutes.LANGUAGE_ONBOARDING) {
            LanguageSelectionScreen(
                onLanguageSelected = {
                    navController.navigate(NavRoutes.HOME) {
                        popUpTo(NavRoutes.LANGUAGE_ONBOARDING) { inclusive = true }
                    }
                },
            )
        }

        composable(NavRoutes.HOME) {
            HomeScreen(
                onOpenVideo = { videoId -> navController.navigate(NavRoutes.player(videoId)) },
                onOpenSearch = { navController.navigate(NavRoutes.SEARCH) },
                onOpenLocationFilter = { navController.navigate(NavRoutes.LOCATION_FILTER) },
                onOpenSettings = { navController.navigate(NavRoutes.SETTINGS) },
            )
        }

        composable(NavRoutes.PLAYER) {
            VideoPlayerScreen(
                onOpenStoryDetail = { storyId -> navController.navigate(NavRoutes.storyDetail(storyId)) },
                onBack = { navController.popBackStack() },
            )
        }

        composable(NavRoutes.STORY_DETAIL) {
            StoryDetailScreen(onBack = { navController.popBackStack() })
        }

        composable(NavRoutes.SEARCH) {
            SearchScreen(
                onOpenVideo = { videoId -> navController.navigate(NavRoutes.player(videoId)) },
                onBack = { navController.popBackStack() },
            )
        }

        composable(NavRoutes.LOCATION_FILTER) {
            LocationFilterScreen(onDone = { navController.popBackStack() })
        }

        composable(NavRoutes.SETTINGS) {
            SettingsScreen(onBack = { navController.popBackStack() })
        }
    }
}
