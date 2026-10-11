package com.rangepatte.app.game.tricks

import com.rangepatte.app.net.core.HIDDEN_CARD
import com.rangepatte.app.net.core.Reader
import com.rangepatte.app.net.core.Writer

/** Encoding and redaction shared by the four trick-taking games. */
object TrickCodec {
    fun write(w: Writer, r: TrickRound) {
        w.list(r.hands) { cards(it) }
        w.list(r.plays) { p -> int(p.seat); card(p.card) }
        w.int(r.turn).nullableSuit(r.trumpSuit).bool(r.trumpActive)
        w.list(r.completed) { t -> list(t.plays) { p -> int(p.seat); card(p.card) }; int(t.winner) }
    }

    fun read(r: Reader): TrickRound = TrickRound(
        hands = r.list { cards() },
        plays = r.list { TrickPlay(int(), card()) },
        turn = r.int(), trumpSuit = r.nullableSuit(), trumpActive = r.bool(),
        completed = r.list { CompletedTrick(list { TrickPlay(int(), card()) }, int()) }
    )

    /** Every hand except [keepSeat]'s becomes the same number of hidden cards (null keeps none). */
    fun redact(round: TrickRound, keepSeat: Int?): TrickRound =
        round.copy(hands = round.hands.mapIndexed { seat, hand -> if (seat == keepSeat) hand else hand.map { HIDDEN_CARD } })
}
