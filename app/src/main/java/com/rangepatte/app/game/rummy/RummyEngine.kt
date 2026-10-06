package com.rangepatte.app.game.rummy

import com.rangepatte.app.domain.model.Rank
import com.rangepatte.app.domain.model.Suit
import kotlin.random.Random

/** One way of grouping a hand: card indices in each meld, the indices left over, and the total cost. */
class MeldSolution(val cost: Int, val melds: List<List<Int>>, val leftover: List<Int>)

/**
 * Finds the best way to arrange up to ~14 rummy cards into melds.
 *
 * A meld is a **pure sequence** (3+ running cards of one suit, no jokers), an **impure sequence**
 * (same, with jokers filling gaps) or a **set** (3–4 cards of one rank, different suits, jokers
 * allowed). Printed Jokers and cards of the [wildRank] can stand in for anything. To declare you
 * need every card in a meld, at least one pure sequence and at least two sequences in all.
 *
 * Every candidate meld is found once (one bit per card in a mask), then a memoised search over
 * "which cards are used so far" picks the cheapest arrangement.
 */
class MeldSession(val cards: List<RCard>, private val wildRank: Rank) {
    private class Meld(val mask: Int, val kind: Int)

    private val n = cards.size
    private val melds: List<Meld>
    private val meldsByCard: List<List<Meld>>

    init {
        require(n <= 16) { "too many cards for the meld search" }
        val found = ArrayList<Meld>()
        for (mask in 1 until (1 shl n)) {
            val size = Integer.bitCount(mask)
            if (size < 3 || size > 13) continue
            val kinds = classify(cards.filterIndexed { i, _ -> mask and (1 shl i) != 0 })
            if (kinds and PURE != 0) found += Meld(mask, PURE)
            if (kinds and IMPURE != 0) found += Meld(mask, IMPURE)
            if (kinds and SET != 0) found += Meld(mask, SET)
        }
        melds = found
        meldsByCard = List(n) { i -> found.filter { it.mask and (1 shl i) != 0 } }
    }

    private fun isWildCard(c: RCard) = c.isPrintedJoker || c.rank == wildRank

    private fun classify(cs: List<RCard>): Int {
        val size = cs.size
        val printed = cs.count { it.isPrintedJoker }
        val naturals = cs.filter { !isWildCard(it) }
        var kinds = 0
        if (printed == 0 && isRun(cs)) kinds = kinds or PURE
        if (kinds and PURE == 0 && naturals.isNotEmpty() && naturals.size < size && fitsSequence(naturals, size)) kinds = kinds or IMPURE
        if (size <= 4 && printed < size && naturals.map { it.rank }.toSet().size <= 1 &&
            naturals.map { it.suit }.toSet().size == naturals.size
        ) kinds = kinds or SET
        return kinds
    }

    /** All the same suit, no repeated rank, and consecutive (Ace counts low or high, never both). */
    private fun isRun(cs: List<RCard>): Boolean {
        val suit = cs.first().suit
        if (cs.any { it.suit != suit }) return false
        val low = cs.map { it.rank!!.value }
        if (low.toSet().size != low.size) return false
        fun consecutive(values: List<Int>) = values.max() - values.min() == values.size - 1
        if (consecutive(low)) return true
        return 1 in low && consecutive(low.map { if (it == 1) 14 else it })
    }

    /** Can [naturals] (same suit, distinct ranks) be completed into a run of [length] cards using jokers? */
    private fun fitsSequence(naturals: List<RCard>, length: Int): Boolean {
        val suit = naturals.first().suit
        if (naturals.any { it.suit != suit } || length > 13) return false
        val low = naturals.map { it.rank!!.value }
        if (low.toSet().size != low.size) return false
        fun fits(values: List<Int>, lo: Int, hi: Int): Boolean {
            val min = values.min()
            val max = values.max()
            if (max - min + 1 > length) return false
            return maxOf(lo, max - length + 1) <= minOf(min, hi - length + 1)
        }
        if (fits(low, 1, 13)) return true
        return 1 in low && fits(low.map { if (it == 1) 14 else it }, 2, 14)
    }

    /** Cheapest arrangement of the cards, ignoring none. See [solve] for the scoring. */
    private fun solve(exclude: Int, allowSets: Boolean, terminal: (pure: Int, sequences: Int) -> Int): MeldSolution {
        val full = (1 shl n) - 1
        val memo = IntArray((1 shl n) * 6) { UNSET }
        val choice = IntArray((1 shl n) * 6) { UNSET }

        fun cost(mask: Int, flags: Int): Int {
            if (mask == full) return terminal(flags / 3, flags % 3)
            val key = mask * 6 + flags
            if (memo[key] != UNSET) return memo[key]
            val i = Integer.numberOfTrailingZeros(mask.inv())
            var best = cards[i].points + cost(mask or (1 shl i), flags)
            var bestChoice = -1
            for ((index, meld) in meldsByCard[i].withIndex()) {
                if (meld.mask and mask != 0 || (!allowSets && meld.kind == SET)) continue
                var pure = flags / 3
                var seq = flags % 3
                if (meld.kind == PURE) { pure = 1; seq = minOf(2, seq + 1) }
                if (meld.kind == IMPURE) seq = minOf(2, seq + 1)
                val c = cost(mask or meld.mask, pure * 3 + seq)
                if (c < best) { best = c; bestChoice = index }
            }
            memo[key] = best
            choice[key] = bestChoice
            return best
        }

        val total = cost(exclude, 0)
        val groups = ArrayList<List<Int>>()
        val leftover = ArrayList<Int>()
        var mask = exclude
        var flags = 0
        while (mask != full) {
            val i = Integer.numberOfTrailingZeros(mask.inv())
            val picked = choice[mask * 6 + flags]
            if (picked == -1 || picked == UNSET) {
                leftover += i
                mask = mask or (1 shl i)
            } else {
                val meld = meldsByCard[i][picked]
                groups += (0 until n).filter { meld.mask and (1 shl it) != 0 }
                if (meld.kind == PURE) { flags = 3 + minOf(2, flags % 3 + 1) }
                if (meld.kind == IMPURE) { flags = (flags / 3) * 3 + minOf(2, flags % 3 + 1) }
                mask = mask or meld.mask
            }
        }
        return MeldSolution(total, groups, leftover)
    }

    /**
     * A friendly arrangement with a smooth cost for the computer's decisions: ungrouped points, plus a
     * penalty for having no pure sequence or fewer than two sequences. Optionally leaves out the
     * cards in [exclude] (a bit mask) — "what if I threw these away?".
     */
    fun arrange(exclude: Int = 0): MeldSolution =
        solve(exclude, allowSets = true) { pure, seq -> (if (pure == 0) NO_PURE_PENALTY else 0) + (if (seq < 2) NO_SECOND_SEQ_PENALTY else 0) }

    /** True if the cards (minus [exclude]) can be declared: all grouped, a pure sequence and two sequences. */
    fun canDeclare(exclude: Int = 0): Boolean =
        solve(exclude, allowSets = true) { pure, seq -> if (pure >= 1 && seq >= 2) 0 else INF }.cost == 0

    /**
     * The penalty points this hand costs at the end of a round, capped at 80. With no pure sequence
     * the whole hand counts; with a pure sequence but no second sequence, only the pure sequence is safe.
     */
    fun penaltyPoints(): Int {
        val full = solve(0, allowSets = true) { pure, seq -> if (pure >= 1 && seq >= 2) 0 else INF }.cost
        val pureOnly = solve(0, allowSets = false) { pure, _ -> if (pure >= 1) 0 else INF }.cost
        return minOf(MAX_PENALTY, full, pureOnly)
    }

    companion object {
        private const val PURE = 1
        private const val IMPURE = 2
        private const val SET = 4
        private const val UNSET = Int.MIN_VALUE
        private const val INF = 1_000_000
        private const val NO_PURE_PENALTY = 25
        private const val NO_SECOND_SEQ_PENALTY = 12
        const val MAX_PENALTY = 80
    }
}

object RummyEngine {
    const val HAND_SIZE = 13

    /** Two decks plus two printed Jokers, shuffled and dealt; player 0 (the human) starts. */
    fun newGame(names: List<String>, random: Random = Random.Default): RummyState {
        require(names.size in 2..6) { "rummy is for 2 to 6 players" }
        var id = 0
        val cards = buildList {
            repeat(2) { Suit.entries.forEach { suit -> Rank.entries.forEach { rank -> add(RCard(id++, suit, rank)) } } }
            repeat(2) { add(RCard(id++, null, null)) }
        }.shuffled(random)
        var next = 0
        val players = names.mapIndexed { i, name ->
            RummyPlayer(name, isHuman = i == 0, hand = List(HAND_SIZE) { cards[next++] })
        }
        return RummyState(
            players = players,
            stock = cards.drop(next + 1),
            discard = listOf(cards[next]),
            wildRank = Rank.entries.random(random),
            turn = 0,
            phase = RummyPhase.DRAW
        )
    }

    fun drawFromStock(state: RummyState, random: Random = Random.Default): RummyState? {
        if (state.phase != RummyPhase.DRAW) return null
        var stock = state.stock
        var discard = state.discard
        if (stock.isEmpty()) {
            if (discard.size < 2) return null
            stock = discard.dropLast(1).shuffled(random)
            discard = discard.takeLast(1)
        }
        val card = stock.last()
        return state.copy(
            stock = stock.dropLast(1),
            discard = discard,
            players = state.players.withHand(state.turn) { it + card },
            phase = RummyPhase.DISCARD
        )
    }

    fun drawFromDiscard(state: RummyState): RummyState? {
        if (state.phase != RummyPhase.DRAW) return null
        val card = state.discard.lastOrNull() ?: return null
        return state.copy(
            discard = state.discard.dropLast(1),
            players = state.players.withHand(state.turn) { it + card },
            phase = RummyPhase.DISCARD
        )
    }

    fun discard(state: RummyState, cardId: Int): RummyState? {
        if (state.phase != RummyPhase.DISCARD) return null
        val card = state.current.hand.firstOrNull { it.id == cardId } ?: return null
        return state.copy(
            discard = state.discard + card,
            players = state.players.withHand(state.turn) { hand -> hand.filter { it.id != cardId } },
            turn = (state.turn + 1) % state.players.size,
            phase = RummyPhase.DRAW
        )
    }

    /** Ends the round: [cardId] is the card put face-down to finish; the other 13 must form a valid hand. */
    fun declare(state: RummyState, cardId: Int): RummyState? {
        if (state.phase != RummyPhase.DISCARD) return null
        val hand = state.current.hand
        val finishIndex = hand.indexOfFirst { it.id == cardId }
        if (finishIndex < 0) return null
        val valid = MeldSession(hand, state.wildRank).canDeclare(exclude = 1 shl finishIndex)
        val points = state.players.mapIndexed { i, player ->
            when {
                i == state.turn -> if (valid) 0 else MeldSession.MAX_PENALTY
                valid -> MeldSession(player.hand, state.wildRank).penaltyPoints()
                else -> 0
            }
        }
        return state.copy(
            phase = RummyPhase.FINISHED,
            result = RummyResult(declarer = state.turn, validDeclaration = valid, points = points)
        )
    }

    private fun List<RummyPlayer>.withHand(index: Int, change: (List<RCard>) -> List<RCard>): List<RummyPlayer> =
        mapIndexed { i, p -> if (i == index) p.copy(hand = change(p.hand)) else p }
}
