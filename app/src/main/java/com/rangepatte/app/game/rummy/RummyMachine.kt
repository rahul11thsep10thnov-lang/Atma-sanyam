package com.rangepatte.app.game.rummy

import com.rangepatte.app.audio.Sfx
import com.rangepatte.app.audio.SfxCue
import com.rangepatte.app.audio.SfxSequences
import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.GameId
import com.rangepatte.app.net.core.GameMachine
import com.rangepatte.app.domain.model.Suit
import com.rangepatte.app.domain.model.Rank
import com.rangepatte.app.net.core.Writer
import com.rangepatte.app.net.core.Reader
import com.rangepatte.app.net.core.MatchConfig
import kotlin.random.Random

object RummyMachine : GameMachine<RummyState, RummyAction> {
    override val gameId = GameId.RUMMY
    override val botDelayMs = 900L

    override fun start(config: MatchConfig, random: Random) = RummyEngine.newGame(config.seatNames, random)

    override fun apply(state: RummyState, action: RummyAction, seat: Int, random: Random): RummyState? {
        if (action == RummyAction.Next) {
            return if (seat == 0 && state.phase == RummyPhase.FINISHED) RummyEngine.newGame(state.players.map { it.name }, random) else null
        }
        if (seat != state.turn || state.phase == RummyPhase.FINISHED) return null
        return when (action) {
            RummyAction.DrawStock -> RummyEngine.drawFromStock(state, random)
            RummyAction.DrawDiscard -> RummyEngine.drawFromDiscard(state)
            is RummyAction.Discard -> RummyEngine.discard(state, action.cardId)
            is RummyAction.Declare -> RummyEngine.declare(state, action.cardId)
            RummyAction.Next -> null
        }
    }

    override fun seatToAct(state: RummyState): Int? = if (state.phase == RummyPhase.FINISHED) 0 else state.turn

    override fun autoStep(state: RummyState): RummyState? = null

    override fun decideForBot(state: RummyState, seat: Int, difficulty: AiDifficulty, random: Random): RummyAction? = when (state.phase) {
        RummyPhase.DRAW -> RummyAi.decideDraw(state, difficulty, random)
        RummyPhase.DISCARD -> RummyAi.decideAfterDraw(state, difficulty, random)
        RummyPhase.FINISHED -> RummyAction.Next
    }

    override fun sfx(before: RummyState, after: RummyState, action: RummyAction?): List<SfxCue> = when (action) {
        RummyAction.DrawStock -> listOf(SfxCue(Sfx.DEAL_ONE))
        RummyAction.DrawDiscard -> listOf(SfxCue(Sfx.PRESENT))
        is RummyAction.Discard -> listOf(SfxCue(Sfx.PRESENT))
        is RummyAction.Declare -> listOf(SfxCue(Sfx.HAND_REVEAL))
        RummyAction.Next -> SfxSequences.gatherAndDeal()
        null -> emptyList()
    }

    private fun Writer.rcard(c: RCard) = apply { int(c.id).nullableInt(c.suit?.ordinal).nullableInt(c.rank?.ordinal) }
    private fun Reader.rcard() = RCard(int(), nullableInt()?.let { Suit.entries[it] }, nullableInt()?.let { Rank.entries[it] })

    override fun encodeState(state: RummyState): String {
        val w = Writer()
        w.list(state.players) { p -> str(p.name); bool(p.isHuman); list(p.hand) { rcard(it) } }
        w.list(state.stock) { rcard(it) }; w.list(state.discard) { rcard(it) }
        w.int(state.wildRank.ordinal).int(state.turn).int(state.phase.ordinal)
        w.bool(state.result != null); state.result?.let { w.int(it.declarer).bool(it.validDeclaration).ints(it.points) }
        return w.toString()
    }

    override fun decodeState(text: String): RummyState? = runCatching {
        val r = Reader(text)
        RummyState(
            players = r.list { RummyPlayer(str(), bool(), list { rcard() }) },
            stock = r.list { rcard() }, discard = r.list { rcard() },
            wildRank = Rank.entries[r.int()], turn = r.int(), phase = RummyPhase.entries[r.int()],
            result = if (r.bool()) RummyResult(r.int(), r.bool(), r.ints()) else null
        )
    }.getOrNull()

    /** Other players' hands and the stock are hidden (same counts); after the round ends every hand is shown. */
    override fun redact(state: RummyState, seat: Int?): RummyState {
        if (state.phase == RummyPhase.FINISHED) return state.copy(stock = state.stock.map { HIDDEN_RCARD })
        return state.copy(
            players = state.players.mapIndexed { i, p -> if (i == seat) p else p.copy(hand = p.hand.map { HIDDEN_RCARD }) },
            stock = state.stock.map { HIDDEN_RCARD }
        )
    }
    override fun isRoundBoundary(state: RummyState) = state.phase == RummyPhase.FINISHED
    override fun rename(state: RummyState, seat: Int, name: String) =
        state.copy(players = state.players.mapIndexed { i, p -> if (i == seat) p.copy(name = name, isHuman = true) else p })

    override fun encode(action: RummyAction): String = when (action) {
        RummyAction.DrawStock -> "S"
        RummyAction.DrawDiscard -> "D"
        is RummyAction.Discard -> "X:${action.cardId}"
        is RummyAction.Declare -> "E:${action.cardId}"
        RummyAction.Next -> "N"
    }

    override fun decode(text: String): RummyAction? = runCatching {
        when (text.substringBefore(':')) {
            "S" -> RummyAction.DrawStock
            "D" -> RummyAction.DrawDiscard
            "X" -> RummyAction.Discard(text.substringAfter(':').toInt())
            "E" -> RummyAction.Declare(text.substringAfter(':').toInt())
            "N" -> RummyAction.Next
            else -> null
        }
    }.getOrNull()
}
