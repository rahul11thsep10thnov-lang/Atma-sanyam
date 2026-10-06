package com.rangepatte.app.navigation

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.navArgument
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.rangepatte.app.AppServices
import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.AppLanguage
import com.rangepatte.app.domain.model.GameCatalog
import com.rangepatte.app.domain.model.PlayMode
import com.rangepatte.app.ui.account.LoginScreen
import com.rangepatte.app.ui.ads.BannerAdSlot
import com.rangepatte.app.ui.chrome.AppTopBar
import com.rangepatte.app.ui.components.BottomNavigationBar
import com.rangepatte.app.ui.entertainment.EntertainmentScreen
import com.rangepatte.app.ui.games.GamesScreen
import com.rangepatte.app.ui.language.LanguageSelectionScreen
import com.rangepatte.app.ui.language.findActivity
import com.rangepatte.app.ui.membership.CheckoutScreen
import com.rangepatte.app.ui.membership.MembershipScreen
import com.rangepatte.app.ui.multiplayer.LobbyRoute
import com.rangepatte.app.ui.settings.SettingsScreen
import com.rangepatte.app.ui.setup.GameSetupScreen
import com.rangepatte.app.ui.table.GameTableScreen

private val topLevelRoutes = setOf(Routes.GAMES, Routes.ENTERTAINMENT, Routes.SETTINGS)

/** Pages that have their own back header and don't show the "Remove ads? / Login" strip or banner ads. */
private val routesWithoutAppChrome = setOf(Routes.LANGUAGE_SELECT, Routes.LOGIN, Routes.MEMBERSHIP, Routes.CHECKOUT)

@Composable
fun RangEPatteNavHost(
    startDestination: String,
    currentLanguage: AppLanguage,
    onLanguageSelected: (AppLanguage) -> Unit
) {
    val navController = rememberNavController()
    val currentBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = currentBackStackEntry?.destination?.route
    val showChrome = currentRoute != null && currentRoute !in routesWithoutAppChrome

    val adFreeUntil by AppServices.membership.adFreeUntilMillis.collectAsState()
    val user by AppServices.account.currentUser.collectAsState()

    Scaffold(
        topBar = {
            if (showChrome) {
                AppTopBar(
                    isAdFree = adFreeUntil > System.currentTimeMillis(),
                    user = user,
                    onRemoveAdsClick = { navController.navigate(Routes.MEMBERSHIP) { launchSingleTop = true } },
                    onAccountClick = { navController.navigate(Routes.LOGIN) { launchSingleTop = true } }
                )
            }
        },
        bottomBar = {
            val showTabs = currentRoute in topLevelRoutes
            if (showChrome || showTabs) {
                // The tab bar pads itself above the system navigation bar; without it, pad here.
                Column(modifier = if (showTabs) Modifier else Modifier.navigationBarsPadding()) {
                    if (showChrome) BannerAdSlot()
                    if (showTabs) {
                        BottomNavigationBar(
                            currentRoute = currentRoute,
                            onItemSelected = { item -> navController.navigateToTab(item.route) }
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = startDestination,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Routes.LANGUAGE_SELECT) {
                LanguageSelectionScreen(
                    initialSelection = currentLanguage.takeIf { navController.previousBackStackEntry != null },
                    onLanguageChosen = { language ->
                        onLanguageSelected(language)
                        AppServices.account.syncUser(language.localeTag, AppServices.membership.adFreeUntilMillis.value)
                        if (navController.previousBackStackEntry != null) {
                            navController.popBackStack()
                        } else {
                            // First launch: the language picker is replaced by the Khel page.
                            navController.navigate(Routes.GAMES) {
                                popUpTo(Routes.LANGUAGE_SELECT) { inclusive = true }
                            }
                        }
                    }
                )
            }
            composable(Routes.GAMES) {
                GamesScreen(onPlayGame = { game ->
                    navController.navigate(Routes.setup(game.id.routeSegment))
                })
            }
            composable(Routes.ENTERTAINMENT) {
                EntertainmentScreen()
            }
            composable(Routes.SETTINGS) {
                SettingsScreen(
                    currentLanguage = currentLanguage,
                    onChangeLanguageClick = { navController.navigate(Routes.LANGUAGE_SELECT) }
                )
            }
            composable(Routes.LOGIN) {
                LoginScreen(
                    onBackClick = { navController.popBackStack() },
                    onSignedIn = { navController.popBackStack() }
                )
            }
            composable(Routes.MEMBERSHIP) {
                MembershipScreen(
                    onBackClick = { navController.popBackStack() },
                    onLoginClick = { navController.navigate(Routes.LOGIN) },
                    onPayClick = { navController.navigate(Routes.CHECKOUT) }
                )
            }
            composable(Routes.CHECKOUT) {
                CheckoutScreen(
                    onBackClick = { navController.popBackStack() },
                    onDone = {
                        navController.navigate(Routes.GAMES) {
                            popUpTo(Routes.GAMES) { inclusive = false }
                            launchSingleTop = true
                        }
                    }
                )
            }
            composable(Routes.SETUP_PATTERN) { backStackEntry ->
                val segment = backStackEntry.arguments?.getString(Routes.ARG_GAME_ID)
                val game = segment?.let(GameCatalog::byRouteSegment)
                if (game != null) {
                    GameSetupScreen(
                        game = game,
                        onBackClick = { navController.popBackStack() },
                        onStartGame = { playerCount, difficulty, mode ->
                            navController.navigate(Routes.gameTable(game.id.routeSegment, mode, playerCount, difficulty))
                        },
                        onOpenLobby = { playerCount, difficulty, mode, host ->
                            navController.navigate(Routes.lobby(game.id.routeSegment, mode, host, playerCount, difficulty))
                        }
                    )
                }
            }
            composable(
                route = Routes.LOBBY_PATTERN,
                arguments = listOf(
                    navArgument(Routes.ARG_PLAYERS) { type = NavType.IntType; defaultValue = 4 },
                    navArgument(Routes.ARG_DIFFICULTY) { type = NavType.StringType; defaultValue = AiDifficulty.MEDIUM.name }
                )
            ) { backStackEntry ->
                val args = backStackEntry.arguments
                val game = args?.getString(Routes.ARG_GAME_ID)?.let(GameCatalog::byRouteSegment)
                val mode = args?.getString(Routes.ARG_MODE)?.let { runCatching { PlayMode.valueOf(it) }.getOrNull() }
                if (game != null && mode != null) {
                    val playerCount = args.getInt(Routes.ARG_PLAYERS)
                    val difficulty = args.getString(Routes.ARG_DIFFICULTY)
                        ?.let { runCatching { AiDifficulty.valueOf(it) }.getOrNull() }
                        ?: AiDifficulty.MEDIUM
                    LobbyRoute(
                        game = game,
                        isHost = args.getString(Routes.ARG_ROLE) == Routes.ROLE_HOST,
                        isOnline = mode == PlayMode.ONLINE,
                        playerCount = playerCount,
                        difficulty = difficulty,
                        onTableReady = {
                            navController.navigate(Routes.gameTable(game.id.routeSegment, mode, playerCount, difficulty)) {
                                popUpTo(Routes.LOBBY_PATTERN) { inclusive = true }
                            }
                        },
                        onBackClick = { navController.popBackStack() }
                    )
                }
            }
            composable(
                route = Routes.GAME_TABLE_PATTERN,
                arguments = listOf(
                    navArgument(Routes.ARG_PLAYERS) { type = NavType.IntType; defaultValue = 4 },
                    navArgument(Routes.ARG_DIFFICULTY) { type = NavType.StringType; defaultValue = AiDifficulty.MEDIUM.name }
                )
            ) { backStackEntry ->
                val context = LocalContext.current
                val segment = backStackEntry.arguments?.getString(Routes.ARG_GAME_ID)
                val game = segment?.let(GameCatalog::byRouteSegment)
                val playerCount = backStackEntry.arguments?.getInt(Routes.ARG_PLAYERS) ?: game?.minPlayers ?: 4
                val difficulty = backStackEntry.arguments?.getString(Routes.ARG_DIFFICULTY)
                    ?.let { runCatching { AiDifficulty.valueOf(it) }.getOrNull() }
                    ?: AiDifficulty.MEDIUM
                if (game != null) {
                    GameTableScreen(
                        game = game,
                        playerCount = playerCount,
                        difficulty = difficulty,
                        onBackClick = {
                            // Leaving a table is the natural break for a full-screen ad (if one is due).
                            val activity = context.findActivity()
                            if (activity != null) {
                                AppServices.ads.onGameExit(activity) { navController.popBackStack() }
                            } else {
                                navController.popBackStack()
                            }
                        }
                    )
                }
            }
        }
    }
}

/** Switches bottom tabs, keeping Khel as the single root so Back from any tab returns there. */
private fun NavHostController.navigateToTab(route: String) {
    navigate(route) {
        popUpTo(Routes.GAMES) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}
