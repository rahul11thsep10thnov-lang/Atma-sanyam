package com.rangepatte.app.profile

import com.rangepatte.app.domain.notifications.Notice
import com.rangepatte.app.domain.notifications.NoticeBook
import com.rangepatte.app.domain.notifications.NoticeKind
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NoticeBookTest {
    private val day = 24 * 60 * 60 * 1000L
    private val now = 100 * day

    @Test fun knownIdsKeepTheirReadFlagAndNewOnesAreUnread() {
        val kept = listOf(Notice("fr:a", NoticeKind.FRIEND_REQUEST, "a", now - 1000, read = true))
        val derived = listOf(Notice("fr:a", NoticeKind.FRIEND_REQUEST, "a", now), Notice("fr:b", NoticeKind.FRIEND_REQUEST, "b", now))
        val merged = NoticeBook.merge(kept, derived, emptySet(), now)
        assertEquals(2, merged.size)
        assertTrue(merged.first { it.id == "fr:a" }.read)
        assertEquals(now - 1000, merged.first { it.id == "fr:a" }.at) // first seen time is kept
        assertEquals(1, NoticeBook.unreadCount(merged))
    }

    @Test fun aRequestThatWasAnsweredStaysListedWithoutItsAction() {
        val kept = listOf(Notice("fr:a", NoticeKind.FRIEND_REQUEST, "a", now - 1000))
        val merged = NoticeBook.merge(kept, emptyList(), emptySet(), now)
        assertEquals(1, merged.size)
        assertFalse(merged[0].live)
        // A posted (non-derived) notice is never switched off by absence.
        val poke = listOf(Notice("poke:x", NoticeKind.POKE, "a", now - 1000))
        assertTrue(NoticeBook.merge(poke, emptyList(), emptySet(), now)[0].live)
    }

    @Test fun dismissedOldAndOverflowAreDropped() {
        val many = (0 until 60).map { Notice("n$it", NoticeKind.POKE, "a", now - it * 1000L) }
        val old = Notice("old", NoticeKind.POKE, "a", now - 8 * day)
        val merged = NoticeBook.merge(many + old, emptyList(), setOf("n3"), now)
        assertEquals(NoticeBook.MAX_ITEMS, merged.size)
        assertTrue(merged.none { it.id == "n3" || it.id == "old" })
        assertEquals("n0", merged.first().id) // newest first
    }

    @Test fun openingMarksEverythingReadAndSplitsNewFromEarlier() {
        val list = listOf(Notice("a", NoticeKind.POKE, "x", now), Notice("b", NoticeKind.POKE, "y", now - 1, read = true))
        val newIds = list.filter { !it.read }.map { it.id }.toSet()
        val read = NoticeBook.markAllRead(list)
        assertEquals(0, NoticeBook.unreadCount(read))
        val (fresh, earlier) = NoticeBook.split(read, newIds)
        assertEquals(listOf("a"), fresh.map { it.id })
        assertEquals(listOf("b"), earlier.map { it.id })
    }
}
