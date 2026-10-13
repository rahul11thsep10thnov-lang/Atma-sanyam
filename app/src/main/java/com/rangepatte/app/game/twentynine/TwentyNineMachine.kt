package com.rangepatte.app.game.twentynine

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

object TwentyNineMachine : GameMachine<T9State, TrickAction> {
    override val gameId = GameId.TWENTY_NINE
    override val botDelayMs = 1_500L

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

    override fun sfx(before: T9State, after: T9State, action: TrickAction?): List<SfxCue> =
        TrickSfx.cues(action, before.round, after.round, before.phase.over(), after.phase.over(), before.phase == T9Phase.MATCH_OVER)

    override fun encodeState(state: T9State): String {
        val w = Writer().int(state.dealer).int(state.phase.ordinal)
        w.list(state.firstHands) { cards(it) }; w.list(state.secondHands) { cards(it) }
        w.ints(state.bids).int(state.bidTurn).int(state.highBid).int(state.highBidder).nullableSuit(state.trump)
        w.bool(state.round != null); state.round?.let { TrickCodec.write(w, it) }
        w.ints(state.teamPoints).ints(state.gameScore)
        w.bool(state.result != null); state.result?.let { w.int(it.bidder).int(it.bid).int(it.bidderTeamPoints).bool(it.made) }
        return w.toString()
    }

    override fun decodeState(text: String): T9State? = runCatching {
        val r = Reader(text)
        T9State(
            dealer = r.int(), phase = T9Phase.entries[r.int()],
            firstHands = r.list { cards() }, secondHands = r.list { cards() },
            bids = r.ints(), bidTurn = r.int(), highBid = r.int(), highBidder = r.int(), trump = r.nullableSuit(),
            round = if (r.bool()) TrickCodec.read(r) else null,
            teamPoints = r.ints(), gameScore = r.ints(),
            result = if (r.bool()) T9Result(r.int(), r.int(), r.int(), r.bool()) else null
        )
    }.getOrNull()

    override fun redact(state: T9State, seat: Int?): T9State {
        fun hide(hands: List<List<com.rangepatte.app.domain.model.PlayingCard>>) = hands.mapIndexed { s, h -> if (s == seat) h else h.map { com.rangepatte.app.net.core.HIDDEN_CARD } }
        // The secret trump stays secret until the engine reveals it.
        val trump = if (state.phase == T9Phase.PLAYING && state.round?.trumpActive != true && seat != state.highBidder) null else state.trump
        return state.copy(firstHands = hide(state.firstHands), secondHands = hide(state.secondHands), trump = trump, round = state.round?.let { TrickCodec.redact(it, seat) })
    }
    override fun isRoundBoundary(state: T9State) = state.phase == T9Phase.ROUND_OVER || state.phase == T9Phase.MATCH_OVER
    override fun stepsLeftInRound(state: T9State): Int? = if (isRoundBoundary(state)) 0 else state.round?.hands?.maxOf { it.size } ?: 8

    override fun encode(action: TrickAction) = TrickActionCodec.encode(action)
    override fun decode(text: String) = TrickActionCodec.decode(text)
}

private fun T9Phase.over() = this == T9Phase.ROUND_OVER || this == T9Phase.MATCH_OVER
