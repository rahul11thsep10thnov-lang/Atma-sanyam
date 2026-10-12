package com.rangepatte.app.ui.multiplayer

import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.collectAsState
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
import com.rangepatte.app.domain.friends.Relation
import com.rangepatte.app.domain.invites.InviteCandidate
import com.rangepatte.app.domain.invites.InviteList
import com.rangepatte.app.domain.model.GameInfo
import com.rangepatte.app.domain.presence.Activity
import com.rangepatte.app.domain.presence.GameCapabilities
import com.rangepatte.app.domain.presence.Presence
import com.rangepatte.app.ui.invites.InviteFriendsSheet
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
    onBackClick: () -> Unit,
    /** Game-specific settings for the match (Ludo's house rules); empty for the card games. */
    options: String = "",
    /** Seat colours and the house-rules line for a board game's lobby (Ludo stage 6, Design 1); null for the card games. */
    decor: LobbyDecor? = null,
    /** Offers the host an Invite friends button (Ludo stage 7): play requests that carry the room code. */
    canInvite: Boolean = false
) {
    val context = LocalContext.current
    val controller = remember(game.id, isHost, isOnline) {
        LobbyController(
            context = context,
            gameId = game.id,
            isHost = isHost,
            isOnline = isOnline,
            seatsToOffer = TableSessions.seatsFor(game.id, playerCount),
            difficulty = difficulty,
            hostOptions = options
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

    // Stage 7: the Invite friends sheet — friends online and free first; each Invite sends a play request with the room code.
    var inviting by remember { mutableStateOf(false) }
    val roomCode = controller.roomCode
    if (inviting && roomCode != null) {
        val me = AppServices.account.currentUser.collectAsState().value?.uid
        val relations by AppServices.friends.relations.collectAsState()
        val people by AppServices.friends.people.collectAsState()
        val presenceMap by AppServices.presence.friends.collectAsState()
        val clock by AppServices.presence.clock.collectAsState()
        val requests by AppServices.playRequests.all.collectAsState()
        val now by AppServices.playRequests.now.collectAsState()
        val candidates = if (me == null) emptyList() else InviteList.rank(
            relations.filter { it.kind == Relation.Kind.FRIENDS && it.involves(me) }.mapNotNull { r ->
                val uid = r.other(me)
                val person = people[uid] ?: return@mapNotNull null
                InviteCandidate(
                    uid = uid, username = person.username, avatarId = person.avatarId,
                    state = Presence.stateOf(presenceMap[uid], clock, GameCapabilities::canJoinLate),
                    sent = requests.any { it.from == me && it.to == uid && it.isPendingAt(now) }
                )
            }
        )
        val refused = stringResource(R.string.invite_refused)
        InviteFriendsSheet(
            candidates = candidates,
            onInvite = { uid ->
                AppServices.playRequests.send(uid, game.id, tableCode = roomCode) { r ->
                    val text = if (r.isSuccess) context.getString(R.string.invite_sent_format, people[uid]?.username.orEmpty()) else refused
                    android.widget.Toast.makeText(context, text, android.widget.Toast.LENGTH_SHORT).show()
                }
            },
            onDismiss = { inviting = false }
        )
    }

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
        },
        decor = decor,
        onInviteFriends = if (canInvite && isHost && isOnline) ({ inviting = true }) else null
    )
}
