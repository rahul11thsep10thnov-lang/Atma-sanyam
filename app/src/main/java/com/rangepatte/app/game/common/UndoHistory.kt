package com.rangepatte.app.game.common

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.setValue

/**
 * The "Undo" feature: remembers the state each time the player is about to act, and lets them step
 * back — at most [maxUses] times per game. [usesLeft] is Compose state so the button re-renders as
 * it counts down. Only offered when playing alone or against the computer (never against people).
 */
class UndoHistory<T>(private val maxUses: Int = 3) {
    private val snapshots = ArrayDeque<T>()
    var usesLeft by mutableIntStateOf(maxUses)
        private set
    private var size by mutableIntStateOf(0)

    val canUndo: Boolean get() = usesLeft > 0 && size > 0

    /** Call with the state as it is *before* the player's move is applied. */
    fun record(state: T) {
        snapshots.addLast(state)
        if (snapshots.size > MAX_SNAPSHOTS) snapshots.removeFirst()
        size = snapshots.size
    }

    /** Returns the state to go back to, or null if no undo is available. Uses up one of the allowed undos. */
    fun undo(): T? {
        if (!canUndo) return null
        val previous = snapshots.removeLast()
        usesLeft -= 1
        size = snapshots.size
        return previous
    }

    fun reset() {
        snapshots.clear()
        size = 0
        usesLeft = maxUses
    }

    private companion object {
        const val MAX_SNAPSHOTS = 200
    }
}
