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

    /**
     * Ladder foot → top. Every ladder leans (none runs straight up a column), their lengths differ, and
     * only one starts in the first row (3 → 22).
     */
    val LADDERS: Map<Int, Int> = mapOf(3 to 22, 15 to 44, 21 to 42, 28 to 84, 36 to 57, 51 to 67, 71 to 92, 80 to 99)

    /**
     * Serpent head → tail. Every serpent lies slanted or sideways, their lengths differ, and no head is
     * in the first row (1–10), so a fresh token is never bitten at once. [BREEDS] gives each its kind.
     */
    val SNAKES: Map<Int, Int> = mapOf(32 to 10, 48 to 26, 62 to 16, 64 to 60, 74 to 53, 87 to 24, 93 to 70, 95 to 77, 98 to 79)

    /** The kinds of serpent drawn on the board: each looks like its breed, not just a colour. */
    enum class Breed { COBRA, PYTHON, KRAIT, VIPER, RAT_SNAKE, TREE_SNAKE, CORAL, BOA, SEA_KRAIT }

    /** Which breed lies at each serpent's head. */
    val BREEDS: Map<Int, Breed> = mapOf(
        32 to Breed.TREE_SNAKE, 48 to Breed.KRAIT, 62 to Breed.PYTHON, 64 to Breed.CORAL, 74 to Breed.VIPER,
        87 to Breed.COBRA, 93 to Breed.RAT_SNAKE, 95 to Breed.SEA_KRAIT, 98 to Breed.BOA
    )

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
