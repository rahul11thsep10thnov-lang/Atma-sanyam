package com.rangepatte.app.ui.multiplayer

import androidx.annotation.StringRes

enum class LobbyStage {
    /** Nothing started yet (waiting for the player to confirm their name / allow permissions / enter a code). */
    IDLE,
    /** Looking for tables, creating a room, or connecting. */
    WORKING,
    /** At the table, waiting for the host to start. */
    AT_TABLE
}

/** A table another phone is offering nearby. */
data class FoundTable(val endpointId: String, val hostName: String)

/** One seat's colour and its spoken name, for a board game's lobby rows. */
data class SeatColour(val color: androidx.compose.ui.graphics.Color, val name: String)

/**
 * What a board game adds to the shared lobby page (Ludo stage 6, Design 1): the seat colours for each
 * possible table size (index = seat; the host's row is seat 0 and guests take
 * [com.rangepatte.app.net.core.LobbyHost.guestSeatOrder]) and a line summing up the house rules from
 * the table's [LobbyUi.options]. Both depend on what the host announces, so they are functions.
 */
data class LobbyDecor(
    val seatsFor: (totalSeats: Int, options: String) -> List<SeatColour>,
    val rulesLine: (options: String) -> String
)

/** Something went wrong: a message from the app's strings, with an optional extra detail to put in it. */
data class LobbyError(@StringRes val messageRes: Int, val detail: String? = null)

/**
 * What the lobby screen shows and can ask for. A host lobby offers a table (nearby or online) and
 * lists who has joined; a guest lobby finds a table to join. The Android-specific part lives in
 * [LobbyController], which implements this.
 */
interface LobbyUi {
    val isHost: Boolean
    val isOnline: Boolean
    val stage: LobbyStage
    val totalSeats: Int
    /** Everyone at the table, host first. */
    val names: List<String>
    val foundTables: List<FoundTable>
    /** The room code to share (online host). */
    val roomCode: String?
    /** The game's settings (Ludo's house rules): the host's own, or as the host announced them. */
    val options: String get() = ""
    val error: LobbyError?

    /** Host: start offering the table / create the room. Guest (nearby): start looking for tables. */
    fun begin(myName: String)

    fun joinNearby(endpointId: String)
    fun joinOnline(code: String)

    /** Host: close the lobby and begin the game. */
    fun startGame()

    /** Guest: the table was full; true while watching it instead is on offer (stage 8). */
    val canWatch: Boolean get() = false
    /** Guest: we asked to watch a full table once it starts. */
    val watching: Boolean get() = false
    fun watch() {}
}
