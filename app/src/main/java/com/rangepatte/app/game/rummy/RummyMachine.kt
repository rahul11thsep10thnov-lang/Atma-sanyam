package com.rangepatte.app.game.rummy

import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.GameId
import com.rangepatte.app.net.core.GameMachine
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
