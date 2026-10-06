package com.rangepatte.app.game.common

import com.rangepatte.app.domain.model.PlayingCard

/** A card lying in a solitaire column — face-down until uncovered. */
data class TableauCard(val card: PlayingCard, val faceUp: Boolean)

/** Colours of the four suits, used by Klondike's alternating-colour rule. */
val PlayingCard.isRedCard: Boolean get() = suit.isRed
