package com.rangepatte.app.domain.snakes

/**
 * The Moksha Patam board (stage 3): 100 squares in ten rows numbered back and forth from the
 * bottom-left 1 to the top-left 100, the classic nine serpents and eight ladders. Square 0 is off
 * the board, where every token starts. Shared by the engine and the renderer, so what is drawn is
 * exactly what the rules use.
 */
object SnakesBoard {
    const val SIZE = 10
    const val START = 0
    const val LAST = 100

    /** Ladder foot → top. */
    val LADDERS: Map<Int, Int> = mapOf(4 to 14, 9 to 31, 20 to 38, 28 to 84, 40 to 59, 51 to 67, 63 to 81, 71 to 91)

    /** Serpent head → tail. */
    val SNAKES: Map<Int, Int> = mapOf(17 to 7, 54 to 34, 62 to 19, 64 to 60, 87 to 24, 93 to 73, 95 to 75, 98 to 79, 99 to 78)

    /** Where a ladder or serpent on [square] leads, or null when the square is plain. */
    fun jump(square: Int): Int? = LADDERS[square] ?: SNAKES[square]

    /** The column (0 = left) and row (0 = bottom) of a square 1..100. */
    fun cellOf(square: Int): Pair<Int, Int> {
        require(square in 1..LAST) { "square $square" }
        val row = (square - 1) / SIZE
        val offset = (square - 1) % SIZE
        val col = if (row % 2 == 0) offset else SIZE - 1 - offset
        return col to row
    }

    /** The squares a token passes from [from] (exclusive) to [to] (inclusive) along the numbering. */
    fun path(from: Int, to: Int): List<Int> = if (to >= from) ((from + 1)..to).toList() else (from - 1 downTo to).toList()
}
