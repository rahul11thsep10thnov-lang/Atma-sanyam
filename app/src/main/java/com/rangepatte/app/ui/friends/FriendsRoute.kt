package com.rangepatte.app.ui.friends

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.res.stringResource
import com.rangepatte.app.AppServices
import com.rangepatte.app.R
import com.rangepatte.app.data.friends.FriendsRepository
import com.rangepatte.app.data.friends.Person
import com.rangepatte.app.domain.friends.Relation
import com.rangepatte.app.domain.friends.RelationAction
import com.rangepatte.app.domain.friends.RelationStatus
import com.rangepatte.app.domain.presence.FriendState
import com.rangepatte.app.domain.presence.GameCapabilities
import com.rangepatte.app.domain.presence.Presence
import kotlinx.coroutines.delay

/** The Friends tab wired to the repositories: gate when signed out, otherwise live lists and search. */
@Composable
fun FriendsRoute(onLoginClick: () -> Unit, onOpenPerson: (String) -> Unit) {
    val user by AppServices.account.currentUser.collectAsState()
    val me = user?.uid
    if (me == null) { FriendsGate(onLoginClick); return }

    val friends = AppServices.friends
    val relations by friends.relations.collectAsState()
    val people by friends.people.collectAsState()
    var tab by remember { mutableStateOf(FriendsTab.FRIENDS) }
    var find by remember { mutableStateOf(FindPeopleState()) }
    val presenceMap by AppServices.presence.friends.collectAsState()
    val clock by AppServices.presence.clock.collectAsState()
    val gameNames = com.rangepatte.app.domain.model.GameCatalog.all.associate { it.id to stringResource(it.nameRes) }
    val sOnline = stringResource(R.string.profile_online); val sOffline = stringResource(R.string.profile_offline)
    val sPlaying = stringResource(R.string.presence_playing_format); val sCanJoin = stringResource(R.string.presence_can_join); val sFull = stringResource(R.string.presence_table_full)
    fun presenceOf(uid: String): Triple<Boolean, FriendState, String> {
        val rec = presenceMap[uid]
        val state = Presence.stateOf(rec, clock, GameCapabilities::canJoinLate)
        val online = Presence.isOnline(rec, clock)
        val game = rec?.activity?.gameId?.let { gameNames[it] }
        val text = when {
            !online -> sOffline
            game == null -> sOnline
            state == FriendState.FULL -> sPlaying.format(game) + " · " + sFull
            rec.activity?.tableCode != null -> sPlaying.format(game) + " · " + sCanJoin
            else -> sPlaying.format(game)
        }
        return Triple(online, state, text)
    }
    val noneFound = stringResource(R.string.friends_none_found)
    val searchError = stringResource(R.string.friends_search_error)
    // Element 17: loading, error and offline states, action failures as toasts, sends parked when offline.
    val loaded by friends.loaded.collectAsState()
    val loadError by friends.error.collectAsState()
    val online by AppServices.connectivity.online.collectAsState()
    val offline = AppServices.isFirebaseConnected && !online
    val context = androidx.compose.ui.platform.LocalContext.current
    val shimmer = remember { runCatching { android.provider.Settings.Global.getFloat(context.contentResolver, android.provider.Settings.Global.ANIMATOR_DURATION_SCALE, 1f) != 0f }.getOrDefault(true) }
    val sNoConnection = stringResource(R.string.state_offline_action); val sFailed = stringResource(R.string.state_action_failed)
    val sPermission = stringResource(R.string.state_error_permission); val sServer = stringResource(R.string.state_error_server); val sNet = stringResource(R.string.state_error_network)
    fun describe(t: Throwable?): String = when {
        t == null -> sServer
        !online -> sNet
        t.message?.contains("PERMISSION", ignoreCase = true) == true -> sPermission
        else -> sServer
    }
    fun guarded(block: ((Result<Unit>) -> Unit) -> Unit) {
        if (offline) { android.widget.Toast.makeText(context, sNoConnection, android.widget.Toast.LENGTH_SHORT).show(); return }
        block { r -> if (r.isFailure) android.widget.Toast.makeText(context, sFailed, android.widget.Toast.LENGTH_SHORT).show() }
    }
    val rateLimited = stringResource(R.string.friends_rate_limited)

    val pokePrefs by AppServices.pokePrefs.value.collectAsState()
    fun ui(p: Person, status: RelationStatus): PersonUi {
        // Presence is shown for friends only; strangers in search results get no dot or mark.
        if (status != RelationStatus.FRIENDS) return PersonUi(p.uid, p.username, p.avatarId, status)
        val (online, state, text) = presenceOf(p.uid)
        return PersonUi(p.uid, p.username, p.avatarId, status, online, text, state, favourite = p.uid in pokePrefs.favourites, muted = p.uid in pokePrefs.muted)
    }
    fun list(kind: (Relation) -> Boolean) = relations.filter(kind).mapNotNull { r -> people[r.other(me)]?.let { ui(it, r.statusFor(me)) } }
    val state = FriendsState(
        friends = list { it.kind == Relation.Kind.FRIENDS },
        incoming = list { it.statusFor(me) == RelationStatus.INCOMING },
        outgoing = list { it.statusFor(me) == RelationStatus.OUTGOING },
        find = find,
        offline = offline,
        loading = !loaded,
        error = loadError?.let(::describe),
        shimmer = shimmer
    )

    // Username search: wait 400 ms after the last keystroke.
    LaunchedEffect(find.query, find.mode) {
        if (find.mode != SearchMode.USERNAME) return@LaunchedEffect
        if (find.query.length < 2) { find = find.copy(results = emptyList(), searching = false, message = null); return@LaunchedEffect }
        find = find.copy(searching = true, message = null)
        delay(400)
        val q = find.query
        friends.search(q) { r ->
            if (q != find.query) return@search
            find = r.fold(
                onSuccess = { list -> list.forEach(friends::remember); find.copy(searching = false, results = list.map { ui(it, friends.statusOf(it.uid)) }, message = if (list.isEmpty()) noneFound else null) },
                onFailure = { find.copy(searching = false, results = emptyList(), message = describe(it), isError = true, onRetry = { find = find.copy(query = find.query + "") }) }
            )
        }
    }
    // Keep result rows' buttons in step with relation changes (e.g. a request accepted meanwhile).
    LaunchedEffect(relations) { find = find.copy(results = find.results.map { it.copy(status = friends.statusOf(it.uid)) }) }

    FriendsScreen(
        state = state, tab = tab, onTab = { tab = it },
        onFindMode = { find = FindPeopleState(mode = it) },
        onFindQuery = { q -> find = find.copy(query = if (find.mode == SearchMode.PHONE) q.filter(Char::isDigit).take(15) else q.take(16)) },
        onFindPhone = {
            find = find.copy(searching = true, message = null, results = emptyList())
            friends.lookupByPhone("+" + find.query) { r ->
                find = r.fold(
                    onSuccess = { p -> p?.let(friends::remember); find.copy(searching = false, results = listOfNotNull(p?.let { ui(it, friends.statusOf(it.uid)) }), message = if (p == null) noneFound else null) },
                    onFailure = { e -> find.copy(searching = false, message = if (e is FriendsRepository.RateLimited) rateLimited else searchError) }
                )
            }
        },
        onAction = { person, action -> guarded { cb -> friends.act(person.uid, action, cb) } },
        onRetry = friends::retry,
        onMenu = { person, item ->
            when (item) {
                FriendMenu.REMOVE -> guarded { cb -> friends.act(person.uid, RelationAction.REMOVE_FRIEND, cb) }
                FriendMenu.BLOCK -> guarded { cb -> friends.act(person.uid, RelationAction.BLOCK, cb) }
                FriendMenu.FAVOURITE -> AppServices.pokePrefs.setFavourite(person.uid, !person.favourite)
                FriendMenu.MUTE -> AppServices.pokePrefs.setMuted(person.uid, !person.muted)
            }
        },
        onOpen = { onOpenPerson(it.uid) }
    )
}

/** The profile of one other player, from the repositories. */
@Composable
fun PersonProfileRoute(uid: String, onBackClick: () -> Unit, onWatch: (gameRoute: String, code: String) -> Unit = { _, _ -> }) {
    val friends = AppServices.friends
    val relations by friends.relations.collectAsState()
    val people by friends.people.collectAsState()
    val person = people[uid]
    val relation = relations.firstOrNull { it.involves(uid) }
    val me = AppServices.account.currentUser.collectAsState().value?.uid ?: return
    if (person == null) { LaunchedEffect(uid) { friends.loadPerson(uid) }; return }
    val status = relation?.statusFor(me) ?: RelationStatus.NONE
    val presenceMap by AppServices.presence.friends.collectAsState()
    val clock by AppServices.presence.clock.collectAsState()
    val rec = if (status == RelationStatus.FRIENDS) presenceMap[uid] else null
    val state = Presence.stateOf(rec, clock, GameCapabilities::canJoinLate)
    val online = Presence.isOnline(rec, clock)
    val gameName = rec?.activity?.gameId?.let { id -> com.rangepatte.app.domain.model.GameCatalog.all.firstOrNull { it.id == id }?.let { stringResource(it.nameRes) } }
    val detail = when {
        !online -> null
        gameName == null -> stringResource(R.string.profile_online)
        state == FriendState.FULL -> stringResource(R.string.presence_playing_format, gameName) + " · " + stringResource(R.string.presence_table_full)
        else -> stringResource(R.string.presence_playing_format, gameName)
    }
    val since = stringResource(R.string.profile_friends_since)
    val facts = buildList {
        if (status == RelationStatus.FRIENDS && relation != null && relation.since > 0) {
            add(ProfileFact(since, java.text.DateFormat.getDateInstance(java.text.DateFormat.MEDIUM).format(java.util.Date(relation.since))))
        }
    }
    val reported = stringResource(R.string.profile_reported)
    val context = androidx.compose.ui.platform.LocalContext.current
    var pickGame by remember { mutableStateOf(false) }
    val sent = stringResource(R.string.invite_sent_format, person.username)
    val refused = stringResource(R.string.invite_refused)
    if (pickGame) {
        val games = com.rangepatte.app.ui.invites.invitableGames().map { id -> id.routeSegment to stringResource(com.rangepatte.app.domain.model.GameCatalog.byId(id).nameRes) }
        com.rangepatte.app.ui.invites.GamePickerDialog(games, onPick = { seg ->
            pickGame = false
            val gameId = com.rangepatte.app.domain.model.GameCatalog.byRouteSegment(seg)?.id ?: return@GamePickerDialog
            AppServices.playRequests.send(uid, gameId, tableCode = null) { r ->
                android.widget.Toast.makeText(context, if (r.isSuccess) sent else refused, android.widget.Toast.LENGTH_SHORT).show()
            }
        }, onDismiss = { pickGame = false })
    }
    // A friend at a full online table can be watched (Element 10): their presence carries the room code.
    val watchable = rec?.activity?.takeIf { state == FriendState.FULL && GameCapabilities.canSpectate(it.gameId) }
        ?.takeIf { it.tableCode != null && it.tableCode != "nearby" && it.tableCode != "table" }
    // Element 13: one poke per friend every ten minutes; the button counts down, a parchment line confirms.
    val sentTo by AppServices.pokes.sentTo.collectAsState()
    val pokedAt = sentTo[uid]
    // A one-second tick while the countdown runs (the presence clock only ticks every 25 s).
    var tick by remember { mutableStateOf(System.currentTimeMillis()) }
    LaunchedEffect(pokedAt) {
        while (pokedAt != null && com.rangepatte.app.domain.pokes.Pokes.cooldownLeft(pokedAt, System.currentTimeMillis()) > 0) {
            tick = System.currentTimeMillis(); delay(1000)
        }
        tick = System.currentTimeMillis()
    }
    val cooldown = pokedAt?.let { com.rangepatte.app.domain.pokes.Pokes.cooldownLeft(it, tick) }?.takeIf { it > 0 }
    val pokedLine = if (pokedAt != null && tick - pokedAt < 60 * 60_000L) stringResource(R.string.poke_sent_format, person.username) else null
    val haptics = androidx.compose.ui.platform.LocalHapticFeedback.current
    val myPokePrefs by AppServices.pokePrefs.value.collectAsState()
    val notTaking = stringResource(R.string.poke_not_taking_format, person.username)
    PersonProfileScreen(
        person = PersonUi(person.uid, person.username, person.avatarId, status, online, detail, state, favourite = uid in myPokePrefs.favourites, muted = uid in myPokePrefs.muted),
        onToggleFavourite = { AppServices.pokePrefs.setFavourite(uid, uid !in myPokePrefs.favourites) },
        onToggleMute = { AppServices.pokePrefs.setMuted(uid, uid !in myPokePrefs.muted) },
        facts = facts,
        canPlayRequest = state == FriendState.AVAILABLE,
        canPoke = status == RelationStatus.FRIENDS && online && cooldown == null && AppServices.pokes.canPoke(uid, tick),
        pokeCountdown = cooldown?.let(com.rangepatte.app.domain.pokes.Pokes::countdown),
        pokedLine = pokedLine,
        onPlayRequest = { pickGame = true },
        onPoke = {
            haptics.performHapticFeedback(androidx.compose.ui.hapticfeedback.HapticFeedbackType.LongPress)
            com.rangepatte.app.audio.GameAudio.play(com.rangepatte.app.audio.Sfx.PRESENT)
            AppServices.pokes.poke(uid) { r ->
                if (r.exceptionOrNull() is com.rangepatte.app.data.pokes.NotTakingPokes) android.widget.Toast.makeText(context, notTaking, android.widget.Toast.LENGTH_SHORT).show()
            }
        },
        onWatch = watchable?.let { a -> { onWatch(a.gameId.routeSegment, a.tableCode!!) } },
        onAction = { action -> friends.act(uid, action) { if (action == RelationAction.BLOCK || action == RelationAction.REMOVE_FRIEND) onBackClick() } },
        onReport = { friends.report(uid, "abuse") { android.widget.Toast.makeText(context, reported, android.widget.Toast.LENGTH_SHORT).show() } },
        onBackClick = onBackClick
    )
}
