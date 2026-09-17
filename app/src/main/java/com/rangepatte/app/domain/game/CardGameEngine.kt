package com.rangepatte.app.domain.game

/**
 * Contract every game engine implements (Teen Patti, Rummy, Solitaire, ...). The UI layer only
 * ever talks to an engine through this interface plus its exposed [GameState] flow — it must
 * never re-implement rule logic itself (see architecture rule: UI -> ViewModel -> Engine -> State -> UI).
 */
interface CardGameEngine {

    fun startGame()

    fun restartGame()

    fun handleAction(action: GameAction)

    fun getState(): GameState

    fun isGameOver(): Boolean
}
