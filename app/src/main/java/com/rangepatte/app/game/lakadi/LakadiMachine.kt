package com.rangepatte.app.game.lakadi

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

object LakadiMachine : GameMachine<LkState, TrickAction> {
    override val gameId = GameId.LAKADI
    override val botDelayMs = 800L

    override fun start(config: MatchConfig, random: Random) = LakadiEngine.newGame(random)

    override fun apply(state: LkState, action: TrickAction, seat: Int, random: Random): LkState? = when (action) {
        is TrickAction.Bid -> if (state.phase == LkPhase.BIDDING && seat == state.bidTurn) LakadiEngine.bid(state, action.amount) else null
        is TrickAction.Play -> {
            val card = cardInHand(state.round.hands[seat], action.cardId)
            if (card == null || state.phase != LkPhase.PLAYING || state.round.turn != seat) null else LakadiEngine.play(state, card)
        }
        TrickAction.Next -> when {
            seat != 0 -> null
            state.phase == LkPhase.HAND_OVER -> LakadiEngine.nextHand(state, random)
            state.phase == LkPhase.GAME_OVER -> LakadiEngine.newGame(random)
            else -> null
        }
        is TrickAction.Trump -> null
    }

    override fun seatToAct(state: LkState): Int? = when (state.phase) {
        LkPhase.BIDDING -> state.bidTurn
        LkPhase.PLAYING -> if (TrickEngine.isTrickComplete(state.round)) null else state.round.turn
        LkPhase.HAND_OVER, LkPhase.GAME_OVER -> 0
    }

    override fun autoStep(state: LkState): LkState? =
        if (state.phase == LkPhase.PLAYING && TrickEngine.isTrickComplete(state.round)) LakadiEngine.resolveTrick(state) else null

    override fun decideForBot(state: LkState, seat: Int, difficulty: AiDifficulty, random: Random): TrickAction? = when (state.phase) {
        LkPhase.BIDDING -> TrickAction.Bid(LakadiAi.bid(state, difficulty, random))
        LkPhase.PLAYING -> TrickAction.Play(LakadiAi.chooseCard(state, difficulty, random).id)
        else -> TrickAction.Next
    }

    override fun sfx(before: LkState, after: LkState, action: TrickAction?): List<SfxCue> =
        TrickSfx.cues(action, before.round, after.round, before.phase.over(), after.phase.over(), before.phase == LkPhase.GAME_OVER)

    override fun encodeState(state: LkState): String = Writer().int(state.dealer).int(state.handNumber).int(state.phase.ordinal).ints(state.bids).int(state.bidTurn)
        .also { TrickCodec.write(it, state.round) }.ints(state.scoresTenths).ints(state.lastDeltaTenths).toString()

    override fun decodeState(text: String): LkState? = runCatching {
        val r = Reader(text)
        LkState(r.int(), r.int(), LkPhase.entries[r.int()], r.ints(), r.int(), TrickCodec.read(r), r.ints(), r.ints())
    }.getOrNull()

    override fun redact(state: LkState, seat: Int?) = state.copy(round = TrickCodec.redact(state.round, seat))
    override fun isRoundBoundary(state: LkState) = state.phase == LkPhase.HAND_OVER || state.phase == LkPhase.GAME_OVER
    override fun stepsLeftInRound(state: LkState): Int? = if (isRoundBoundary(state)) 0 else state.round.hands.maxOf { it.size }

    override fun encode(action: TrickAction) = TrickActionCodec.encode(action)
    override fun decode(text: String) = TrickActionCodec.decode(text)
}

private fun LkPhase.over() = this == LkPhase.HAND_OVER || this == LkPhase.GAME_OVER
