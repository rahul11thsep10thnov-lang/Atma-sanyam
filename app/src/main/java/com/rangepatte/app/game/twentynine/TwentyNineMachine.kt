package com.rangepatte.app.game.twentynine

import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.GameId
import com.rangepatte.app.game.tricks.TrickAction
import com.rangepatte.app.game.tricks.TrickActionCodec
import com.rangepatte.app.game.tricks.TrickEngine
import com.rangepatte.app.game.tricks.cardInHand
import com.rangepatte.app.net.core.GameMachine
import com.rangepatte.app.net.core.MatchConfig
import kotlin.random.Random

object TwentyNineMachine : GameMachine<T9State, TrickAction> {
    override val gameId = GameId.TWENTY_NINE
    override val botDelayMs = 800L

    override fun start(config: MatchConfig, random: Random) = TwentyNineEngine.newMatch(random)

    override fun apply(state: T9State, action: TrickAction, seat: Int, random: Random): T9State? = when (action) {
        is TrickAction.Bid -> if (state.phase == T9Phase.BIDDING && seat == state.bidTurn) TwentyNineEngine.bid(state, action.amount) else null
        is TrickAction.Trump ->
            if (state.phase == T9Phase.TRUMP_CHOICE && seat == state.highBidder) TwentyNineEngine.chooseTrump(state, action.suit) else null
        is TrickAction.Play -> {
            val round = state.round
            val card = round?.let { cardInHand(it.hands[seat], action.cardId) }
            if (card == null || state.phase != T9Phase.PLAYING || round.turn != seat) null else TwentyNineEngine.play(state, card)
        }
        TrickAction.Next -> when {
            seat != 0 -> null
            state.phase == T9Phase.ROUND_OVER -> TwentyNineEngine.nextRound(state, random)
            state.phase == T9Phase.MATCH_OVER -> TwentyNineEngine.newMatch(random)
            else -> null
        }
    }

    override fun seatToAct(state: T9State): Int? = when (state.phase) {
        T9Phase.BIDDING -> state.bidTurn
        T9Phase.TRUMP_CHOICE -> state.highBidder
        T9Phase.PLAYING -> state.round?.takeIf { !TrickEngine.isTrickComplete(it) }?.turn
        T9Phase.ROUND_OVER, T9Phase.MATCH_OVER -> 0
    }

    override fun autoStep(state: T9State): T9State? {
        val round = state.round ?: return null
        return if (state.phase == T9Phase.PLAYING && TrickEngine.isTrickComplete(round)) TwentyNineEngine.resolveTrick(state) else null
    }

    override fun decideForBot(state: T9State, seat: Int, difficulty: AiDifficulty, random: Random): TrickAction? = when (state.phase) {
        T9Phase.BIDDING -> TrickAction.Bid(TwentyNineAi.bid(state, difficulty, random))
        T9Phase.TRUMP_CHOICE -> TrickAction.Trump(TwentyNineAi.chooseTrump(state))
        T9Phase.PLAYING -> TrickAction.Play(TwentyNineAi.chooseCard(state, difficulty, random).id)
        else -> TrickAction.Next
    }

    override fun encode(action: TrickAction) = TrickActionCodec.encode(action)
    override fun decode(text: String) = TrickActionCodec.decode(text)
}
