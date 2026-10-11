package com.rangepatte.app.data.notifications

import android.content.Context
import androidx.core.content.edit
import com.rangepatte.app.data.friends.FriendsRepository
import com.rangepatte.app.data.invites.PlayRequestRepository
import com.rangepatte.app.domain.friends.Relation
import com.rangepatte.app.domain.friends.RelationStatus
import com.rangepatte.app.domain.notifications.Notice
import com.rangepatte.app.domain.notifications.NoticeBook
import com.rangepatte.app.domain.notifications.NoticeKind
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch

/**
 * The notification centre's list (Element 12, Design 1). Notices are *derived* from what the app
 * already watches — relations (requests received, requests accepted) and play requests — plus the
 * one-off notices other features post ([post]: a poke, "you have a seat"). What was read or dismissed
 * is remembered on the phone, per account, so the bell count survives a restart. No server-side
 * inbox is needed; a device push (FCM) can later point at the same records (see README).
 */
class NotificationRepository(
    context: Context,
    private val friends: FriendsRepository,
    private val playRequests: PlayRequestRepository
) {
    private val prefs = context.applicationContext.getSharedPreferences("notifications", Context.MODE_PRIVATE)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var job: Job? = null
    private var me: String? = null
    private var posted: List<Notice> = emptyList()
    private var dismissed: Set<String> = emptySet()
    private var readIds: Set<String> = emptySet()

    private val _notices = MutableStateFlow<List<Notice>>(emptyList())
    val notices: StateFlow<List<Notice>> = _notices.asStateFlow()
    private val _unread = MutableStateFlow(0)
    val unread: StateFlow<Int> = _unread.asStateFlow()

    fun start(uid: String) {
        me = uid
        load(uid)
        job?.cancel()
        job = scope.launch {
            combine(friends.relations, playRequests.all) { relations, requests -> derive(uid, relations, requests) }
                .collect { derived -> fold(derived) }
        }
    }

    fun stopWatching() {
        job?.cancel(); job = null
        me = null
        posted = emptyList(); dismissed = emptySet(); readIds = emptySet()
        _notices.value = emptyList(); _unread.value = 0
    }

    /** Other features post a one-off notice here (a poke received, a seat given at a watched table). */
    fun post(notice: Notice) {
        if (me == null) return
        posted = posted.filter { it.id != notice.id } + notice
        fold(null)
    }

    /** The centre was opened: everything becomes read. Returns the ids that were new, for the "New" group. */
    fun open(): Set<String> {
        val fresh = _notices.value.filter { !it.read }.map { it.id }.toSet()
        if (fresh.isNotEmpty()) {
            readIds = readIds + fresh
            fold(null)
        }
        return fresh
    }

    fun dismiss(id: String) {
        dismissed = dismissed + id
        fold(null)
    }

    fun clearAll() {
        dismissed = dismissed + _notices.value.map { it.id }
        fold(null)
    }

    private var lastDerived: List<Notice> = emptyList()

    private fun fold(derived: List<Notice>?) {
        if (derived != null) lastDerived = derived
        val now = System.currentTimeMillis()
        val merged = NoticeBook.merge(_notices.value, lastDerived + posted, dismissed, now)
            .map { if (it.id in readIds) it.copy(read = true) else it }
        _notices.value = merged
        _unread.value = NoticeBook.unreadCount(merged)
        save()
    }

    private fun derive(me: String, relations: List<Relation>, requests: List<com.rangepatte.app.domain.invites.PlayRequest>): List<Notice> = buildList {
        relations.forEach { r ->
            val other = r.other(me)
            when (r.statusFor(me)) {
                RelationStatus.INCOMING -> add(Notice("fr:$other", NoticeKind.FRIEND_REQUEST, other, r.since.takeIf { it > 0 } ?: System.currentTimeMillis()))
                // They accepted a request we sent (the record says who acted last).
                RelationStatus.FRIENDS -> if (r.by == other && r.since > 0) add(Notice("acc:$other", NoticeKind.REQUEST_ACCEPTED, other, r.since))
                else -> Unit
            }
        }
        val now = System.currentTimeMillis()
        requests.filter { it.to == me }.forEach { q ->
            add(Notice("pr:${q.id}", NoticeKind.PLAY_REQUEST, q.from, q.createdAt, live = q.isPendingAt(now), ref = q.id))
        }
    }

    // -- On-phone memory, per account: "id|kind|uid|at|live|ref" lines, plus the read and dismissed ids.
    private fun key(name: String) = "$name:${me}"

    private fun load(uid: String) {
        me = uid
        readIds = prefs.getStringSet(key("read"), emptySet()).orEmpty().toSet()
        dismissed = prefs.getStringSet(key("dismissed"), emptySet()).orEmpty().toSet()
        posted = prefs.getStringSet(key("posted"), emptySet()).orEmpty().mapNotNull { line ->
            val p = line.split("|")
            runCatching { Notice(p[0], NoticeKind.valueOf(p[1]), p[2], p[3].toLong(), live = p[4].toBoolean(), ref = p.getOrNull(5)?.takeIf { it.isNotEmpty() }) }.getOrNull()
        }
        _notices.value = prefs.getStringSet(key("kept"), emptySet()).orEmpty().mapNotNull { line ->
            val p = line.split("|")
            runCatching { Notice(p[0], NoticeKind.valueOf(p[1]), p[2], p[3].toLong(), read = p[0] in readIds, live = p[4].toBoolean(), ref = p.getOrNull(5)?.takeIf { it.isNotEmpty() }) }.getOrNull()
        }
        fold(null)
    }

    private fun save() {
        if (me == null) return
        fun line(n: Notice) = "${n.id}|${n.kind.name}|${n.uid}|${n.at}|${n.live}|${n.ref.orEmpty()}"
        prefs.edit {
            putStringSet(key("read"), readIds)
            putStringSet(key("dismissed"), dismissed)
            putStringSet(key("posted"), posted.map(::line).toSet())
            putStringSet(key("kept"), _notices.value.map(::line).toSet())
        }
    }
}
