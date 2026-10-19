package com.rangepatte.app.domain.ludo

/** The four colours in clockwise order of their yards: top-left, top-right, bottom-right, bottom-left. */
enum class LudoColor(val suit: String) {
    RED("♥"), GREEN("♣"), YELLOW("♦"), BLUE("♠");

    /** Where this colour's tokens enter the track (an index into [LudoBoard.TRACK]). */
    val startIndex: Int get() = ordinal * 13
}

/** A point on the board in board units (a cell's top-left is its column and row). */
data class BoardPoint(val x: Float, val y: Float)

/** A cell of the 15×15 board: column and row, 0-based from the top-left. */
data class Cell(val col: Int, val row: Int)

/**
 * The geometry every board design shares (stage 3): the 52-square track clockwise from red's start,
 * each colour's five-cell home column, the yards and the eight safe stars. Pure data; the engine and
 * the renderer both read it, so a token can never be drawn where the rules say it is not.
 */
object LudoBoard {
    const val SIZE = 15
    const val TRACK_LENGTH = 52
    /** A token's relative position: -1 in the yard, 0..50 on the track, 51..55 in the home column, 56 home. */
    const val YARD = -1
    const val LAST_TRACK = 50
    const val FIRST_COLUMN = 51
    const val HOME = 56

    val TRACK: List<Cell> = buildList {
        for (c in 1..5) add(Cell(c, 6))
        for (r in 5 downTo 0) add(Cell(6, r))
        add(Cell(7, 0))
        for (r in 0..5) add(Cell(8, r))
        for (c in 9..14) add(Cell(c, 6))
        add(Cell(14, 7))
        for (c in 14 downTo 9) add(Cell(c, 8))
        for (r in 9..14) add(Cell(8, r))
        add(Cell(7, 14))
        for (r in 14 downTo 9) add(Cell(6, r))
        for (c in 5 downTo 0) add(Cell(c, 8))
        add(Cell(0, 7))
        add(Cell(0, 6))
    }

    /** The five home-column cells for each colour, in walking order towards the centre. */
    fun homeColumn(color: LudoColor): List<Cell> = when (color) {
        LudoColor.RED -> (1..5).map { Cell(it, 7) }
        LudoColor.GREEN -> (1..5).map { Cell(7, it) }
        LudoColor.YELLOW -> (13 downTo 9).map { Cell(it, 7) }
        LudoColor.BLUE -> (13 downTo 9).map { Cell(7, it) }
    }

    val CENTRE = Cell(7, 7)

    /** The top-left cell of each colour's 6×6 yard. */
    fun yardOrigin(color: LudoColor): Cell = when (color) {
        LudoColor.RED -> Cell(0, 0); LudoColor.GREEN -> Cell(9, 0); LudoColor.YELLOW -> Cell(9, 9); LudoColor.BLUE -> Cell(0, 9)
    }

    /** Where the four tokens rest inside the yard. */
    fun yardNests(color: LudoColor): List<Cell> {
        val o = yardOrigin(color)
        return listOf(Cell(o.col + 1, o.row + 1), Cell(o.col + 4, o.row + 1), Cell(o.col + 1, o.row + 4), Cell(o.col + 4, o.row + 4))
    }

    /**
     * Where a token rests in its yard on the printed board: the four circles of a 2 × 2 grid round the
     * centre of the yard's white square (0.9 of a cell either side). Returned as the point to add 0.5 to
     * for the circle's centre — the same convention as a [Cell] — so it moves like a cell does.
     * [token] 0..3 runs top-left, top-right, bottom-left, bottom-right of the yard.
     */
    fun nestPoint(color: LudoColor, token: Int): BoardPoint {
        val o = yardOrigin(color)
        val sx = if (token % 2 == 0) -1f else 1f
        val sy = if (token < 2) -1f else 1f
        return BoardPoint(o.col + 3f + sx * NEST_SPREAD - 0.5f, o.row + 3f + sy * NEST_SPREAD - 0.5f)
    }

    const val NEST_SPREAD = 0.9f

    /** The eight safe stars: every start square and the square eight ahead of it. */
    val SAFE_INDICES: Set<Int> = LudoColor.values().flatMap { listOf(it.startIndex, it.startIndex + 8) }.toSet()

    fun isSafe(trackIndex: Int) = trackIndex in SAFE_INDICES

    /** The absolute track index of a token at relative position [p] (0..50) for [color]. */
    fun trackIndex(color: LudoColor, p: Int): Int = (color.startIndex + p) % TRACK_LENGTH

    /** The cell a token of [color] occupies at relative position [p]; null in the yard (use the nest). */
    fun cellOf(color: LudoColor, p: Int): Cell? = when {
        p == YARD -> null
        p <= LAST_TRACK -> TRACK[trackIndex(color, p)]
        p < HOME -> homeColumn(color)[p - FIRST_COLUMN]
        else -> CENTRE
    }
}
