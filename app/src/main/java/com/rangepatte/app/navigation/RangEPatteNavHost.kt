package com.rangepatte.app.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.offset
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableStateOf
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
import com.rangepatte.app.ui.components.ImmersiveSystemBars
import com.rangepatte.app.ui.components.isLandscape
import com.rangepatte.app.ui.chrome.AppTopBar
import com.rangepatte.app.ui.components.BottomNavigationBar
import com.rangepatte.app.ui.entertainment.EntertainmentScreen
import com.rangepatte.app.ui.friends.FriendsRoute
import com.rangepatte.app.ui.friends.PersonProfileRoute
import com.rangepatte.app.ui.games.GamesScreen
import com.rangepatte.app.ui.invites.PlayRequestOverlay
import com.rangepatte.app.ui.pokes.PokeRoute
import com.rangepatte.app.ui.language.LanguageSelectionScreen
import com.rangepatte.app.ui.language.findActivity
import com.rangepatte.app.ui.membership.CheckoutScreen
import com.rangepatte.app.ui.membership.MembershipScreen
import com.rangepatte.app.ui.multiplayer.LobbyRoute
import com.rangepatte.app.ui.profile.AvatarScreen
import com.rangepatte.app.ui.profile.UsernameScreen
import com.rangepatte.app.ui.settings.SettingsScreen
import com.rangepatte.app.ui.setup.GameSetupScreen
import com.rangepatte.app.ui.table.GameTableScreen
import com.rangepatte.app.ui.notifications.NotificationCentre

private val topLevelRoutes = setOf(Routes.GAMES, Routes.ENTERTAINMENT, Routes.FRIENDS, Routes.SETTINGS)

/** Pages that have their own back header and don't show the "Remove ads? / Login" strip or banner ads. */
private val routesWithoutAppChrome = setOf(Routes.LANGUAGE_SELECT, Routes.LOGIN, Routes.MEMBERSHIP, Routes.CHECKOUT, Routes.USERNAME_PATTERN, Routes.AVATAR, Routes.PERSON_PATTERN, Routes.MY_PROFILE, Routes.BOARD_INTRO_PATTERN, Routes.BOARD_TABLE_PATTERN)

@Composable
fun RangEPatteNavHost(
    startDestination: String,
    currentLanguage: AppLanguage,
    onLanguageSelected: (AppLanguage) -> Unit
) {
    val navController = rememberNavController()
    val currentBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = currentBackStackEntry?.destination?.route
    // The Undo gate's "Become a member" button leads to the membership page.
    androidx.compose.runtime.SideEffect {
        com.rangepatte.app.game.common.UndoGate.openMembership = { navController.navigate(Routes.MEMBERSHIP) { launchSingleTop = true } }
    }
    // Sideways at a table, the game takes the whole screen: no app bar, banner or system bars.
    val atGameTable = currentRoute == Routes.GAME_TABLE_PATTERN || currentRoute == Routes.BOARD_TABLE_PATTERN
    val fullScreenTable = atGameTable && isLandscape()
    ImmersiveSystemBars(enabled = fullScreenTable)
    val showChrome = currentRoute != null && currentRoute !in routesWithoutAppChrome && !fullScreenTable

    val adFreeUntil by AppServices.membership.adFreeUntilMillis.collectAsState()
    val user by AppServices.account.currentUser.collectAsState()
    val unread by AppServices.notifications.unread.collectAsState()
    // The notification scroll (Element 12): open from the bell on the main pages; it drops from the top bar.
    var centreNewIds by remember { mutableStateOf<Set<String>?>(null) }
    // The poke shiver (Element 14): the page content is offset by this while a poke arrives.
    val pokeShake = remember { androidx.compose.animation.core.Animatable(0f) }

    Scaffold(
        topBar = {
            if (showChrome) {
                AppTopBar(
                    isAdFree = adFreeUntil > System.currentTimeMillis(),
                    showMembershipTab = AppServices.adsEnabled,
                    user = user,
                    onRemoveAdsClick = { navController.navigate(Routes.MEMBERSHIP) { launchSingleTop = true } },
                    // Signed in, the account tab opens My Profile (Element 16); signed out, the login page.
                    onAccountClick = { navController.navigate(if (user != null) Routes.MY_PROFILE else Routes.LOGIN) { launchSingleTop = true } },
                    unreadNotifications = if (user != null && currentRoute in topLevelRoutes) unread else null,
                    onBellClick = { centreNewIds = if (centreNewIds == null) AppServices.notifications.open() else null }
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
        Box(modifier = Modifier.padding(innerPadding)) {
        NavHost(
            navController = navController,
            startDestination = startDestination,
            modifier = Modifier.offset { com.rangepatte.app.ui.pokes.shakeOffset(pokeShake) }
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
                EntertainmentScreen(onPlayGame = { game -> navController.navigate(Routes.boardIntro(game.id.routeSegment)) })
            }
            composable(Routes.BOARD_INTRO_PATTERN) { backStackEntry ->
                val game = backStackEntry.arguments?.getString(Routes.ARG_BOARD)?.let(com.rangepatte.app.domain.board.BoardCatalog::byRouteSegment)
                if (game != null) when (game.id) {
                    com.rangepatte.app.domain.board.BoardGameId.LUDO -> com.rangepatte.app.ui.board.LudoSetupScreen(
                        game = game,
                        onBackClick = { navController.popBackStack() },
                        onStart = { setup, mode -> com.rangepatte.app.domain.ludo.LudoSetupStore.pending = setup; navController.navigate(Routes.boardTable(game.id.routeSegment, mode)) },
                        onOpenLobby = { setup, mode, host ->
                            com.rangepatte.app.domain.ludo.LudoSetupStore.pending = setup
                            navController.navigate(Routes.boardLobby(game.id.routeSegment, mode, host, setup.players, setup.difficulty, com.rangepatte.app.domain.ludo.LudoRules.options(setup.rules, setup.color)))
                        }
                    )
                    com.rangepatte.app.domain.board.BoardGameId.SNAKES_LADDERS -> com.rangepatte.app.ui.snakes.SnakesSetupScreen(
                        game = game,
                        onBackClick = { navController.popBackStack() },
                        onStart = { setup, mode -> com.rangepatte.app.domain.snakes.SnakesSetupStore.pending = setup; navController.navigate(Routes.boardTable(game.id.routeSegment, mode)) },
                        onOpenLobby = { setup, mode, host ->
                            com.rangepatte.app.domain.snakes.SnakesSetupStore.pending = setup
                            navController.navigate(Routes.boardLobby(game.id.routeSegment, mode, host, setup.players, setup.difficulty, setup.rules.encode()))
                        }
                    )
                }
            }
            composable(
                route = Routes.BOARD_LOBBY_PATTERN,
                arguments = listOf(
                    navArgument(Routes.ARG_PLAYERS) { type = NavType.IntType; defaultValue = 4 },
                    navArgument(Routes.ARG_DIFFICULTY) { type = NavType.StringType; defaultValue = AiDifficulty.MEDIUM.name },
                    navArgument(Routes.ARG_OPTIONS) { type = NavType.StringType; defaultValue = "" },
                    navArgument(Routes.ARG_CODE) { type = NavType.StringType; defaultValue = "" }
                )
            ) { backStackEntry ->
                val args = backStackEntry.arguments
                val game = args?.getString(Routes.ARG_BOARD)?.let(com.rangepatte.app.domain.board.BoardCatalog::byRouteSegment)
                val mode = args?.getString(Routes.ARG_MODE)?.let { runCatching { PlayMode.valueOf(it) }.getOrNull() }
                if (game != null && mode != null) {
                    val playerCount = (args?.getInt(Routes.ARG_PLAYERS) ?: game.maxPlayers).coerceIn(game.minPlayers, game.maxPlayers)
                    val difficulty = args?.getString(Routes.ARG_DIFFICULTY)?.let { runCatching { AiDifficulty.valueOf(it) }.getOrNull() } ?: AiDifficulty.MEDIUM
                    val optionsText = args?.getString(Routes.ARG_OPTIONS).orEmpty()
                    val isLudo = game.id == com.rangepatte.app.domain.board.BoardGameId.LUDO
                    val options = if (isLudo) com.rangepatte.app.domain.ludo.LudoRules.options(com.rangepatte.app.domain.ludo.LudoRules.decode(optionsText), com.rangepatte.app.domain.ludo.LudoRules.colorOf(optionsText)) else com.rangepatte.app.domain.snakes.SnakesRules.decode(optionsText).encode()
                    // The shared lobby page (Ludo stage 6, Design 1) with the token colours per seat and the house-rules line.
                    LobbyRoute(
                        game = game.asGameInfo(),
                        isHost = args?.getString(Routes.ARG_ROLE) == Routes.ROLE_HOST,
                        joinCode = args?.getString(Routes.ARG_CODE)?.takeIf { it.isNotBlank() },
                        isOnline = mode == PlayMode.ONLINE,
                        playerCount = playerCount,
                        difficulty = difficulty,
                        options = options,
                        decor = if (isLudo) com.rangepatte.app.ui.board.ludoLobbyDecor() else com.rangepatte.app.ui.snakes.snakesLobbyDecor(),
                        canInvite = true,
                        onTableReady = {
                            // The table takes everything from the session the lobby offered; the setup only matters for a solo game.
                            if (isLudo) com.rangepatte.app.domain.ludo.LudoSetupStore.pending = com.rangepatte.app.domain.ludo.LudoSetup(playerCount, com.rangepatte.app.domain.ludo.LudoRules.decode(options), difficulty, com.rangepatte.app.domain.ludo.LudoRules.colorOf(options))
                            else com.rangepatte.app.domain.snakes.SnakesSetupStore.pending = com.rangepatte.app.domain.snakes.SnakesSetup(playerCount, com.rangepatte.app.domain.snakes.SnakesRules.decode(options), difficulty)
                            navController.navigate(Routes.boardTable(game.id.routeSegment, mode)) {
                                popUpTo(Routes.BOARD_LOBBY_PATTERN) { inclusive = true }
                            }
                        },
                        onBackClick = { navController.popBackStack() }
                    )
                }
            }
            composable(Routes.BOARD_TABLE_PATTERN) { backStackEntry ->
                val game = backStackEntry.arguments?.getString(Routes.ARG_BOARD)?.let(com.rangepatte.app.domain.board.BoardCatalog::byRouteSegment)
                if (game != null) when (game.id) {
                    // Solo, or the table the lobby handed over (stage 6): LudoScreen picks whichever is waiting.
                    com.rangepatte.app.domain.board.BoardGameId.LUDO ->
                        com.rangepatte.app.ui.board.LudoScreen(game = game, setup = com.rangepatte.app.domain.ludo.LudoSetupStore.pending, onBackClick = { navController.popBackStack() })
                    com.rangepatte.app.domain.board.BoardGameId.SNAKES_LADDERS ->
                        com.rangepatte.app.ui.snakes.SnakesScreen(game = game, setup = com.rangepatte.app.domain.snakes.SnakesSetupStore.pending, onBackClick = { navController.popBackStack() })
                }
            }
            composable(Routes.FRIENDS) {
                FriendsRoute(
                    onLoginClick = { navController.navigate(Routes.LOGIN) { launchSingleTop = true } },
                    onOpenPerson = { uid -> navController.navigate(Routes.person(uid)) }
                )
            }
            composable(Routes.PERSON_PATTERN) { backStackEntry ->
                val uid = backStackEntry.arguments?.getString(Routes.ARG_UID)
                if (uid != null) PersonProfileRoute(
                    uid = uid,
                    onBackClick = { navController.popBackStack() },
                    onWatch = { game, code -> navController.navigate(joinLobbyRoute(game, PlayMode.ONLINE, code)) }
                )
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
                    onSignedIn = {
                        // A first-time player picks a username and avatar before going back.
                        if (AppServices.profile.profile.value?.isComplete == true) navController.popBackStack()
                        else navController.navigate(Routes.USERNAME) { popUpTo(Routes.LOGIN) { inclusive = true } }
                    },
                    onEditProfile = { navController.navigate(Routes.AVATAR) }
                )
            }
            composable(
                route = Routes.USERNAME_PATTERN,
                arguments = listOf(navArgument(Routes.ARG_EDIT) { type = NavType.StringType; defaultValue = "" })
            ) { backStackEntry ->
                val editing = backStackEntry.arguments?.getString(Routes.ARG_EDIT) == "true"
                UsernameScreen(
                    editing = editing,
                    onDone = {
                        if (!editing && AppServices.profile.profile.value?.avatarId == null) navController.navigate(Routes.AVATAR) { popUpTo(Routes.USERNAME_PATTERN) { inclusive = true } }
                        else navController.popBackStack()
                    },
                    onBackClick = { navController.popBackStack() }
                )
            }
            composable(Routes.MY_PROFILE) {
                com.rangepatte.app.ui.profile.MyProfileRoute(
                    onChangeAvatar = { navController.navigate(Routes.AVATAR) },
                    onChangeUsername = { navController.navigate(Routes.USERNAME_EDIT) },
                    onSignedOut = { navController.popBackStack(Routes.GAMES, inclusive = false) },
                    onBackClick = { navController.popBackStack() }
                )
            }
            composable(Routes.AVATAR) {
                AvatarScreen(onDone = { navController.popBackStack() }, onBackClick = { navController.popBackStack() })
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
                    navArgument(Routes.ARG_DIFFICULTY) { type = NavType.StringType; defaultValue = AiDifficulty.MEDIUM.name },
                    navArgument(Routes.ARG_CODE) { type = NavType.StringType; defaultValue = "" }
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
                        joinCode = args.getString(Routes.ARG_CODE)?.takeIf { it.isNotBlank() },
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
        if (user != null && centreNewIds != null && currentRoute in topLevelRoutes) {
            NotificationCentre(
                newIds = centreNewIds.orEmpty(),
                onOpenPerson = { uid -> centreNewIds = null; navController.navigate(Routes.person(uid)) },
                onJoin = { game, code -> centreNewIds = null; navController.navigate(joinLobbyRoute(game, PlayMode.ONLINE, code)) },
                onClose = { centreNewIds = null }
            )
        } else if (centreNewIds != null) {
            centreNewIds = null
        }
        if (user != null) {
            PokeRoute(
                shake = pokeShake,
                atTable = currentRoute == Routes.GAME_TABLE_PATTERN || currentRoute == Routes.BOARD_TABLE_PATTERN,
                onOpenPerson = { uid -> navController.navigate(Routes.person(uid)) }
            )
            PlayRequestOverlay(
                onJoin = { game, mode, code -> navController.navigate(joinLobbyRoute(game, mode, code)) },
                onHost = { game -> navController.navigate(hostLobbyRoute(game)) }
            )
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

/**
 * Where an accepted play request, a notification or a Watch button leads: the card games' lobby, or
 * the board lobby for a board game (Ludo stage 7). A guest's seat count and difficulty do not matter;
 * the host's settings arrive with the table.
 */
private fun joinLobbyRoute(gameRoute: String, mode: PlayMode, code: String?): String =
    if (com.rangepatte.app.domain.model.GameNames.isBoardGame(gameRoute)) {
        Routes.boardLobby(gameRoute, mode, host = false, playerCount = 4, difficulty = AiDifficulty.MEDIUM, options = "", code = code)
    } else {
        Routes.lobby(gameRoute, mode, host = false, playerCount = 4, difficulty = AiDifficulty.MEDIUM, code = code)
    }

/** The sender of a profile play request hosts a table once the friend says yes: Ludo opens with the sender's last setup. */
private fun hostLobbyRoute(gameRoute: String): String =
    if (gameRoute == com.rangepatte.app.domain.board.BoardGameId.SNAKES_LADDERS.routeSegment) {
        val setup = com.rangepatte.app.domain.snakes.SnakesSetupStore.pending
        Routes.boardLobby(gameRoute, PlayMode.ONLINE, host = true, playerCount = setup.players, difficulty = setup.difficulty, options = setup.rules.encode())
    } else if (com.rangepatte.app.domain.model.GameNames.isBoardGame(gameRoute)) {
        val setup = com.rangepatte.app.domain.ludo.LudoSetupStore.pending
        Routes.boardLobby(gameRoute, PlayMode.ONLINE, host = true, playerCount = setup.players, difficulty = setup.difficulty, options = com.rangepatte.app.domain.ludo.LudoRules.options(setup.rules, setup.color))
    } else {
        Routes.lobby(gameRoute, PlayMode.ONLINE, host = true, playerCount = 4, difficulty = AiDifficulty.MEDIUM)
    }
