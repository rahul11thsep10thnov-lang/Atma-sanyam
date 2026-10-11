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
    val noneFound = stringResource(R.string.friends_none_found)
    val searchError = stringResource(R.string.friends_search_error)
    val rateLimited = stringResource(R.string.friends_rate_limited)

    fun ui(p: Person, status: RelationStatus) = PersonUi(p.uid, p.username, p.avatarId, status)
    fun list(kind: (Relation) -> Boolean) = relations.filter(kind).mapNotNull { r -> people[r.other(me)]?.let { ui(it, r.statusFor(me)) } }
    val state = FriendsState(
        friends = list { it.kind == Relation.Kind.FRIENDS },
        incoming = list { it.statusFor(me) == RelationStatus.INCOMING },
        outgoing = list { it.statusFor(me) == RelationStatus.OUTGOING },
        find = find
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
                onFailure = { find.copy(searching = false, results = emptyList(), message = searchError) }
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
        onAction = { person, action -> friends.act(person.uid, action) },
        onMenu = { person, item -> friends.act(person.uid, if (item == FriendMenu.REMOVE) RelationAction.REMOVE_FRIEND else RelationAction.BLOCK) },
        onOpen = { onOpenPerson(it.uid) }
    )
}

/** The profile of one other player, from the repositories. */
@Composable
fun PersonProfileRoute(uid: String, onBackClick: () -> Unit) {
    val friends = AppServices.friends
    val relations by friends.relations.collectAsState()
    val people by friends.people.collectAsState()
    val person = people[uid]
    val relation = relations.firstOrNull { it.involves(uid) }
    val me = AppServices.account.currentUser.collectAsState().value?.uid ?: return
    if (person == null) { LaunchedEffect(uid) { friends.loadPerson(uid) }; return }
    val status = relation?.statusFor(me) ?: RelationStatus.NONE
    val since = stringResource(R.string.profile_friends_since)
    val facts = buildList {
        if (status == RelationStatus.FRIENDS && relation != null && relation.since > 0) {
            add(ProfileFact(since, java.text.DateFormat.getDateInstance(java.text.DateFormat.MEDIUM).format(java.util.Date(relation.since))))
        }
    }
    val reported = stringResource(R.string.profile_reported)
    val context = androidx.compose.ui.platform.LocalContext.current
    PersonProfileScreen(
        person = PersonUi(person.uid, person.username, person.avatarId, status),
        facts = facts,
        canPlayRequest = false, // presence and play requests arrive with Elements 8 and 9
        canPoke = false,
        onPlayRequest = {}, onPoke = {},
        onAction = { action -> friends.act(uid, action) { if (action == RelationAction.BLOCK || action == RelationAction.REMOVE_FRIEND) onBackClick() } },
        onReport = { friends.report(uid, "abuse") { android.widget.Toast.makeText(context, reported, android.widget.Toast.LENGTH_SHORT).show() } },
        onBackClick = onBackClick
    )
}
