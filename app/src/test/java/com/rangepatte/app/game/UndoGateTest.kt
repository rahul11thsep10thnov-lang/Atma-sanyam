package com.rangepatte.app.game

import com.rangepatte.app.game.common.RewardOutcome
import com.rangepatte.app.game.common.UndoGate
import org.junit.Assert.assertEquals
import org.junit.Test

class UndoGateTest {
    @Test
    fun anAdUnlocksUndoOnlyWhenRewardedAndAtLeastThirtySecondsLong() {
        assertEquals(RewardOutcome.EARNED, UndoGate.outcome(rewarded = true, watchedMs = 30_000L))
        assertEquals(RewardOutcome.EARNED, UndoGate.outcome(rewarded = true, watchedMs = 45_500L))
        assertEquals(RewardOutcome.TOO_SHORT, UndoGate.outcome(rewarded = true, watchedMs = 29_999L))
        assertEquals(RewardOutcome.TOO_SHORT, UndoGate.outcome(rewarded = false, watchedMs = 60_000L))
    }
}
