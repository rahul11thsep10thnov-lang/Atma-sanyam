package com.rangepatte.app.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.compose.runtime.getValue
import com.rangepatte.app.domain.model.GameCatalog
import com.rangepatte.app.ui.components.BottomNavigationBar
import com.rangepatte.app.ui.games.GamesScreen
import com.rangepatte.app.ui.history.HistoryScreen
import com.rangepatte.app.ui.home.HomeScreen
import com.rangepatte.app.ui.rules.RulesScreen
import com.rangepatte.app.ui.settings.SettingsScreen
import com.rangepatte.app.ui.setup.GameSetupScreen
import com.rangepatte.app.ui.table.GameTableScreen

private val topLevelRoutes = setOf(Routes.HOME, Routes.GAMES, Routes.HISTORY, Routes.SETTINGS)

@Composable
fun RangEPatteNavHost() {
    val navController = rememberNavController()
    val currentBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = currentBackStackEntry?.destination?.route

    Scaffold(
        bottomBar = {
            if (currentRoute in topLevelRoutes) {
                BottomNavigationBar(
                    currentRoute = currentRoute,
                    onItemSelected = { item ->
                        navController.navigate(item.route) {
                            popUpTo(navController.graph.findStartDestination().id) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                )
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Routes.HOME,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Routes.HOME) {
                HomeScreen(onPlayGame = { game ->
                    navController.navigate(Routes.setup(game.id.routeSegment))
                })
            }
            composable(Routes.GAMES) {
                GamesScreen(onPlayGame = { game ->
                    navController.navigate(Routes.setup(game.id.routeSegment))
                })
            }
            composable(Routes.HISTORY) {
                HistoryScreen()
            }
            composable(Routes.SETTINGS) {
                SettingsScreen()
            }
            composable(Routes.SETUP_PATTERN) { backStackEntry ->
                val segment = backStackEntry.arguments?.getString(Routes.ARG_GAME_ID)
                val game = segment?.let(GameCatalog::byRouteSegment)
                if (game != null) {
                    GameSetupScreen(
                        game = game,
                        onBackClick = { navController.popBackStack() },
                        onStartGame = { _, _ ->
                            navController.navigate(Routes.gameTable(game.id.routeSegment))
                        }
                    )
                }
            }
            composable(Routes.GAME_TABLE_PATTERN) { backStackEntry ->
                val segment = backStackEntry.arguments?.getString(Routes.ARG_GAME_ID)
                val game = segment?.let(GameCatalog::byRouteSegment)
                if (game != null) {
                    GameTableScreen(
                        game = game,
                        onBackClick = { navController.popBackStack() },
                        onRulesClick = { navController.navigate(Routes.rules(game.id.routeSegment)) }
                    )
                }
            }
            composable(Routes.RULES_PATTERN) { backStackEntry ->
                val segment = backStackEntry.arguments?.getString(Routes.ARG_GAME_ID)
                val game = segment?.let(GameCatalog::byRouteSegment)
                if (game != null) {
                    RulesScreen(game = game, onBackClick = { navController.popBackStack() })
                }
            }
        }
    }
}
