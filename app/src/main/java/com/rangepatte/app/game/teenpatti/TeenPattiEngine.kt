package com.rangepatte.app.game.teenpatti

import com.rangepatte.app.domain.game.Deck
import kotlin.random.Random

object TeenPattiEngine {
    const val BOOT = 10
    const val MAX_STAKE = 640
    const val START_CHIPS = 1000
    private const val AI_REBUY_CHIPS = 500

    fun newMatch(names: List<String>, random: Random = Random.Default): TpState {
        require(names.size in 3..6) { "Teen Patti is for 3 to 6 players" }
        val seats = names.mapIndexed { i, name -> TpSeat(name, isHuman = i == 0, chips = START_CHIPS) }
        return dealHand(seats, dealer = names.size - 1, handNumber = 1, random = random)
    }

    /** Next hand with the same chips; null if the human can no longer afford the boot (match over). */
    fun nextHand(state: TpState, random: Random = Random.Default): TpState? {
        val human = state.seats.first { it.isHuman }
        if (human.chips < BOOT) return null
        val seats = state.seats.map { if (!it.isHuman && it.chips < BOOT * 4) it.copy(chips = AI_REBUY_CHIPS) else it }
        return dealHand(seats, (state.dealer + 1) % seats.size, state.handNumber + 1, random)
    }

    private fun dealHand(seats: List<TpSeat>, dealer: Int, handNumber: Int, random: Random): TpState {
        var deck = Deck.standard().shuffled(random)
        val dealt = seats.map { seat ->
            val (cards, rest) = deck.draw(3)
            deck = rest
            seat.copy(hand = cards, seen = false, packed = false, chips = seat.chips - BOOT, invested = BOOT)
        }
        return TpState(
            seats = dealt,
            pot = BOOT * seats.size,
            stake = BOOT,
            turn = (dealer + 1) % seats.size,
            dealer = dealer,
            phase = TpPhase.BETTING,
            handNumber = handNumber
        )
    }

    /** What the player on turn pays to stay in at the current stake: full if they've seen their cards, else half. */
    fun chaalCost(state: TpState): Int = costAt(state, state.stake)

    fun raiseCost(state: TpState): Int = costAt(state, state.stake * 2)

    private fun costAt(state: TpState, stake: Int): Int = if (state.current.seen) stake else (stake + 1) / 2

    fun canSee(state: TpState): Boolean = state.phase == TpPhase.BETTING && !state.current.seen
    fun canChaal(state: TpState): Boolean = state.phase == TpPhase.BETTING && state.current.chips >= chaalCost(state)
    fun canRaise(state: TpState): Boolean =
        state.phase == TpPhase.BETTING && state.stake * 2 <= MAX_STAKE && state.current.chips >= raiseCost(state)

    /** A show is only possible with exactly two players left, and only for someone who has seen their cards. */
    fun canShow(state: TpState): Boolean =
        state.phase == TpPhase.BETTING && state.activeCount == 2 && state.current.seen

    fun see(state: TpState): TpState? {
        if (!canSee(state)) return null
        return state.copy(
            seats = state.seats.update(state.turn) { it.copy(seen = true) },
            lastAction = TpLastAction(state.turn, TpActionKind.SEE)
        )
    }

    fun chaal(state: TpState): TpState? {
        if (!canChaal(state)) return null
        val cost = chaalCost(state)
        return advance(pay(state, cost, TpLastAction(state.turn, TpActionKind.CHAAL, cost, !state.current.seen)))
    }

    fun raise(state: TpState): TpState? {
        if (!canRaise(state)) return null
        val newStake = state.stake * 2
        val cost = raiseCost(state)
        return advance(pay(state.copy(stake = newStake), cost, TpLastAction(state.turn, TpActionKind.RAISE, cost, !state.current.seen)))
    }

    fun pack(state: TpState): TpState? {
        if (state.phase != TpPhase.BETTING) return null
        val packed = state.copy(
            seats = state.seats.update(state.turn) { it.copy(packed = true) },
            lastAction = TpLastAction(state.turn, TpActionKind.PACK)
        )
        val remaining = packed.seats.indices.filter { !packed.seats[it].packed }
        return if (remaining.size == 1) finish(packed, remaining.single(), showdown = false) else advance(packed)
    }

    /**
     * Pays for a show (or all you have, if less) and compares the two remaining hands. If they tie,
     * the player who asked for the show loses.
     */
    fun show(state: TpState): TpState? {
        if (!canShow(state) && !(state.phase == TpPhase.BETTING && state.activeCount == 2 && !canChaal(state))) return null
        val asker = state.turn
        val other = state.seats.indices.first { it != asker && !state.seats[it].packed }
        val cost = minOf(chaalCost(state), state.current.chips)
        val paid = pay(state, cost, TpLastAction(asker, TpActionKind.SHOW, cost, !state.current.seen))
        val askerRank = TeenPattiRanking.evaluate(state.seats[asker].hand)
        val otherRank = TeenPattiRanking.evaluate(state.seats[other].hand)
        val winner = if (askerRank > otherRank) asker else other
        return finish(paid, winner, showdown = true)
    }

    private fun pay(state: TpState, cost: Int, action: TpLastAction): TpState = state.copy(
        seats = state.seats.update(state.turn) { it.copy(chips = it.chips - cost, invested = it.invested + cost) },
        pot = state.pot + cost,
        lastAction = action
    )

    private fun advance(state: TpState): TpState {
        var next = (state.turn + 1) % state.seats.size
        while (state.seats[next].packed) next = (next + 1) % state.seats.size
        return state.copy(turn = next)
    }

    private fun finish(state: TpState, winner: Int, showdown: Boolean): TpState = state.copy(
        seats = state.seats.update(winner) { it.copy(chips = it.chips + state.pot) },
        pot = 0,
        phase = TpPhase.ENDED,
        result = TpResult(winner, state.pot, showdown)
    )

    private fun <T> List<T>.update(index: Int, change: (T) -> T): List<T> =
        mapIndexed { i, item -> if (i == index) change(item) else item }
}
