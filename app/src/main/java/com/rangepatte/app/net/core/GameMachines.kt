package com.rangepatte.app.net.core

import com.rangepatte.app.domain.model.GameId
import com.rangepatte.app.game.coatpiece.CoatPieceMachine
import com.rangepatte.app.game.dehlapakad.DehlaPakadMachine
import com.rangepatte.app.game.lakadi.LakadiMachine
import com.rangepatte.app.game.rummy.RummyMachine
import com.rangepatte.app.game.teenpatti.TeenPattiMachine
import com.rangepatte.app.game.twentynine.TwentyNineMachine

/** The games that can be played with other people (and, in solo play, run through the same machinery). */
object GameMachines {
    val multiplayerGames: Set<GameId> = setOf(
        GameId.RUMMY, GameId.TEEN_PATTI, GameId.TWENTY_NINE, GameId.COAT_PIECE, GameId.DEHLA_PAKAD, GameId.LAKADI
    )

    @Suppress("UNCHECKED_CAST")
    fun forGame(id: GameId): GameMachine<Any, Any>? = when (id) {
        GameId.RUMMY -> RummyMachine
        GameId.TEEN_PATTI -> TeenPattiMachine
        GameId.TWENTY_NINE -> TwentyNineMachine
        GameId.COAT_PIECE -> CoatPieceMachine
        GameId.DEHLA_PAKAD -> DehlaPakadMachine
        GameId.LAKADI -> LakadiMachine
        else -> null
    } as GameMachine<Any, Any>?
}
