package com.rangepatte.app.game.dehlapakad

import com.rangepatte.app.audio.SfxCue
import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.GameId
import com.rangepatte.app.game.tricks.TrickAction
import com.rangepatte.app.game.tricks.TrickActionCodec
import com.rangepatte.app.game.tricks.TrickEngine
import com.rangepatte.app.game.tricks.TrickSfx
import com.rangepatte.app.game.tricks.cardInHand
import com.rangepatte.app.net.core.GameMachine
import com.rangepatte.app.game.tricks.TrickCodec
import com.rangepatte.app.net.core.Writer
import com.rangepatte.app.net.core.Reader
import com.rangepatte.app.net.core.MatchConfig
import kotlin.random.Random

object DehlaPakadMachine : GameMachine<DpState, TrickAction> {
    override val gameId = GameId.DEHLA_PAKAD
    override val botDelayMs = 1_500L

    override fun start(config: MatchConfig, random: Random) = DehlaPakadEngine.newMatch(random)

    override fun apply(state: DpState, action: TrickAction, seat: Int, random: Random): DpState? = when (action) {
        is TrickAction.Play -> {
            val card = cardInHand(state.round.hands[seat], action.cardId)
            if (card == null || state.phase != DpPhase.PLAYING || state.round.turn != seat) null else DehlaPakadEngine.play(state, card)
        }
        // Naming trump is the move of the first player who cannot follow suit.
        is TrickAction.Trump ->
            if (state.phase == DpPhase.PLAYING && seat == state.round.turn && DehlaPakadEngine.needsTrumpCall(state)) DehlaPakadEngine.callTrump(state, action.suit) else null
        TrickAction.Next -> when {
            seat != 0 -> null
            state.phase == DpPhase.ROUND_OVER -> DehlaPakadEngine.nextRound(state, random)
            state.phase == DpPhase.MATCH_OVER -> DehlaPakadEngine.newMatch(random)
            else -> null
        }
        is TrickAction.Bid -> null
    }

    override fun seatToAct(state: DpState): Int? = when (state.phase) {
        DpPhase.PLAYING -> if (TrickEngine.isTrickComplete(state.round)) null else state.round.turn
        else -> 0
    }

    override fun autoStep(state: DpState): DpState? =
        if (state.phase == DpPhase.PLAYING && TrickEngine.isTrickComplete(state.round)) DehlaPakadEngine.resolveTrick(state) else null

    override fun decideForBot(state: DpState, seat: Int, difficulty: AiDifficulty, random: Random): TrickAction? = when {
        state.phase != DpPhase.PLAYING -> TrickAction.Next
        DehlaPakadEngine.needsTrumpCall(state) -> TrickAction.Trump(DehlaPakadAi.chooseTrump(state))
        else -> TrickAction.Play(DehlaPakadAi.chooseCard(state, difficulty, random).id)
    }

    override fun sfx(before: DpState, after: DpState, action: TrickAction?): List<SfxCue> =
        TrickSfx.cues(action, before.round, after.round, before.phase.over(), after.phase.over(), before.phase == DpPhase.MATCH_OVER)

    override fun encodeState(state: DpState): String {
        val w = Writer().int(state.dealer).int(state.phase.ordinal)
        TrickCodec.write(w, state.round)
        w.cards(state.pile).nullableInt(state.lastWinner).ints(state.teamTens).ints(state.teamCards).ints(state.handsWon).nullableInt(state.streakTeam).int(state.streak)
        w.bool(state.result != null); state.result?.let { w.int(it.winnerTeam).bool(it.kot).ints(it.tens).ints(it.cards) }
        return w.toString()
    }

    override fun decodeState(text: String): DpState? = runCatching {
        val r = Reader(text)
        DpState(
            dealer = r.int(), phase = DpPhase.entries[r.int()], round = TrickCodec.read(r), pile = r.cards(), lastWinner = r.nullableInt(),
            teamTens = r.ints(), teamCards = r.ints(), handsWon = r.ints(), streakTeam = r.nullableInt(), streak = r.int(),
            result = if (r.bool()) DpResult(r.int(), r.bool(), r.ints(), r.ints()) else null
        )
    }.getOrNull()

    override fun redact(state: DpState, seat: Int?) = state.copy(round = TrickCodec.redact(state.round, seat))
    override fun isRoundBoundary(state: DpState) = state.phase == DpPhase.ROUND_OVER || state.phase == DpPhase.MATCH_OVER
    override fun stepsLeftInRound(state: DpState): Int? = if (isRoundBoundary(state)) 0 else state.round.hands.maxOf { it.size }

    override fun encode(action: TrickAction) = TrickActionCodec.encode(action)
    override fun decode(text: String) = TrickActionCodec.decode(text)
}

private fun DpPhase.over() = this == DpPhase.ROUND_OVER || this == DpPhase.MATCH_OVER
