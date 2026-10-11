package com.rangepatte.app.profile

import com.rangepatte.app.domain.friends.Relation
import com.rangepatte.app.domain.friends.RelationAction
import com.rangepatte.app.domain.friends.RelationStatus
import com.rangepatte.app.domain.friends.Relations
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class RelationsTest {
    private val me = "u_a"; private val you = "u_b"
    private fun after(cur: Relation?, who: String, other: String, action: RelationAction) = Relations.apply(cur, who, other, action)

    @Test fun pairIdIsTheSameFromBothSides() = assertEquals(Relations.pairId(me, you), Relations.pairId(you, me))

    @Test fun fullLifecycle() {
        val sent = after(null, me, you, RelationAction.ADD_FRIEND)!!.relation!!
        assertEquals(RelationStatus.OUTGOING, sent.statusFor(me)); assertEquals(RelationStatus.INCOMING, sent.statusFor(you))
        assertNull("cannot send twice", after(sent, me, you, RelationAction.ADD_FRIEND))
        assertNull("sender cannot accept own request", after(sent, me, you, RelationAction.ACCEPT))
        val friends = after(sent, you, me, RelationAction.ACCEPT)!!.relation!!
        assertEquals(RelationStatus.FRIENDS, friends.statusFor(me))
        assertNull("friends cannot be asked again", after(friends, you, me, RelationAction.ADD_FRIEND))
        assertNull(after(friends, me, you, RelationAction.REMOVE_FRIEND)!!.relation)
    }

    @Test fun declineAndCancelDeleteTheRequest() {
        val sent = after(null, me, you, RelationAction.ADD_FRIEND)!!.relation
        assertNull(after(sent, you, me, RelationAction.DECLINE)!!.relation)
        assertNull(after(sent, me, you, RelationAction.CANCEL_REQUEST)!!.relation)
        assertNull("receiver cannot cancel", after(sent, you, me, RelationAction.CANCEL_REQUEST))
    }

    @Test fun simultaneousRequestsBecomeFriends() {
        val sent = after(null, me, you, RelationAction.ADD_FRIEND)!!.relation
        val both = after(sent, you, me, RelationAction.ADD_FRIEND)!!.relation!!
        assertEquals(Relation.Kind.FRIENDS, both.kind)
    }

    @Test fun blockingWinsAndOnlyTheBlockerCanUndo() {
        val friends = Relation(me, you, Relation.Kind.FRIENDS, me)
        val blocked = after(friends, you, me, RelationAction.BLOCK)!!.relation!!
        assertEquals(RelationStatus.BLOCKED_BY_ME, blocked.statusFor(you)); assertEquals(RelationStatus.BLOCKED_ME, blocked.statusFor(me))
        assertNull("blocked user cannot ask", after(blocked, me, you, RelationAction.ADD_FRIEND))
        assertNull("blocked user cannot unblock", after(blocked, me, you, RelationAction.UNBLOCK))
        assertNull("blocked user cannot block back", after(blocked, me, you, RelationAction.BLOCK))
        assertNull(after(blocked, you, me, RelationAction.UNBLOCK)!!.relation)
    }

    @Test fun cannotFriendYourself() = assertNull(after(null, me, me, RelationAction.ADD_FRIEND))
}
