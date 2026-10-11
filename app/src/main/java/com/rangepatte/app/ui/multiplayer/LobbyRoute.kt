package com.rangepatte.app.ui.multiplayer

import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import com.rangepatte.app.AppServices
import com.rangepatte.app.R
import com.rangepatte.app.data.local.PlayerNamePreferences
import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.GameInfo
import com.rangepatte.app.domain.presence.Activity
import com.rangepatte.app.net.TableSessions
import com.rangepatte.app.net.nearby.NearbyPermissions

/**
 * The lobby page: creates the [LobbyController] for this visit, asks for Bluetooth/Wi-Fi permissions
 * when playing nearby, remembers the player's name, shares the room code, and opens the table when
 * the host starts the game.
 */
@Composable
fun LobbyRoute(
    game: GameInfo,
    isHost: Boolean,
    isOnline: Boolean,
    playerCount: Int,
    /** A room code to join straight away (from an accepted play request). */
    joinCode: String? = null,
    difficulty: AiDifficulty,
    onTableReady: () -> Unit,
    onBackClick: () -> Unit
) {
    val context = LocalContext.current
    val controller = remember(game.id, isHost, isOnline) {
        LobbyController(
            context = context,
            gameId = game.id,
            isHost = isHost,
            isOnline = isOnline,
            seatsToOffer = TableSessions.seatsFor(game.id, playerCount),
            difficulty = difficulty
        )
    }
    SideEffect { controller.onTableReady = onTableReady }

    DisposableEffect(controller) { onDispose { controller.dispose() } }
    // Friends see the host's open table and how many seats are free.
    if (isHost) {
        val seatsFree = (controller.totalSeats - controller.names.size).coerceAtLeast(0)
        LaunchedEffect(seatsFree, controller.stage) {
            AppServices.presence.setActivity(Activity(game.id, tableCode = controller.roomCode ?: "nearby", seatsFree = seatsFree))
        }
        DisposableEffect(Unit) { onDispose { AppServices.presence.setActivity(null) } }
    }

    var permissionsGranted by remember { mutableStateOf(NearbyPermissions.allGranted(context)) }
    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        permissionsGranted = NearbyPermissions.allGranted(context)
    }

    val initialName = remember {
        PlayerNamePreferences.get(context) ?: AppServices.profile.profile.value?.username ?: AppServices.account.currentUser.value?.displayName.orEmpty()
    }
    if (joinCode != null && !isHost && isOnline) {
        LaunchedEffect(joinCode) { controller.begin(initialName); controller.joinOnline(joinCode) }
    }
    val gameName = stringResource(game.nameRes)

    LobbyScreen(
        game = game,
        lobby = controller,
        initialName = initialName,
        permissionsGranted = permissionsGranted,
        onRequestPermissions = { permissionLauncher.launch(NearbyPermissions.required()) },
        onNameChange = { PlayerNamePreferences.set(context, it) },
        onShareCode = { code ->
            val send = Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_TEXT, context.getString(R.string.net_share_message, gameName, code))
            }
            context.startActivity(Intent.createChooser(send, null))
        },
        onBackClick = {
            controller.dispose()
            onBackClick()
        }
    )
}
