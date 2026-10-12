package com.rangepatte.app.audio

/**
 * The eight card sound effects. [resName] is the file in `res/raw` (lowercase, no leading digit, as
 * Android requires): `sfx_shuffle_cards.wav` is the pack's `01_shuffle_cards.wav`, and so on.
 * [durationMs] is the length of the recording, used to space sequences and to duck the music.
 *
 * Pure Kotlin on purpose — the game machines decide which effect an event deserves and are tested on
 * the JVM, away from Android.
 */
enum class Sfx(val resName: String, val durationMs: Long) {
    /** Standard deck shuffle when a new round or hand is prepared. */
    SHUFFLE("sfx_shuffle_cards", 1650),
    /** Riffle shuffle — the opening shuffle of a fresh match. */
    RIFFLE("sfx_riffle_shuffle", 1350),
    /** One card dealt (drawn from the stock). */
    DEAL_ONE("sfx_deal_single_card", 420),
    /** A whole hand's worth of cards distributed. */
    DEAL_MANY("sfx_deal_multiple_cards", 1450),
    /** A card slid onto the table or placed on a pile. */
    PRESENT("sfx_slide_present_card", 620),
    /** A face-down card turned over. */
    REVEAL("sfx_flip_reveal_card", 580),
    /** Cards gathered up and cleared from the table. */
    COLLECT("sfx_collect_cards", 720),
    /** A finished hand shown. */
    HAND_REVEAL("sfx_hand_reveal", 950),

    // -- The board-game pack (Ludo stage 9; the Snakes & Ladders files follow with that game) --------
    /** A match opens. */
    GAME_START("sfx_game_start", 464),
    /** The die starts spinning. */
    DICE_ROLL("sfx_dice_roll", 950),
    /** The die settles on its value. */
    DICE_LAND("sfx_dice_land", 134),
    /** A six: one more roll. */
    BONUS_ROLL("sfx_bonus_roll", 240),
    /** A token leaves its yard. */
    TOKEN_ENTERS("sfx_token_enters_board", 240),
    /** A token sets off along the track. */
    TOKEN_MOVE("sfx_token_move", 104),
    /** One square of a short glide. */
    TOKEN_STEP("sfx_token_step", 94),
    /** An opponent's token sent home. */
    TOKEN_CAPTURE("sfx_token_capture", 324),
    /** A token turns into its home column. */
    NEAR_FINISH("sfx_near_finish", 260),
    /** A token reaches the centre. */
    TOKEN_HOME("sfx_token_reaches_home", 464),
    /** Another player brought all four home. */
    FINISH_SQUARE("sfx_finish_square", 464),
    /** This phone's player won. */
    LUDO_VICTORY("sfx_ludo_victory", 1539),
    /** This phone's player did not win. */
    LUDO_DEFEAT("sfx_ludo_defeat", 749),
    /** The match is over. */
    MATCH_COMPLETE("sfx_match_complete", 699),
    /** It is this phone's turn. */
    YOUR_TURN("sfx_your_turn", 269),
    /** A forfeit, or a tap the engine refused. */
    INVALID_MOVE("sfx_invalid_move", 324),
    /** A table-talk message arrived. */
    SOFT_NOTIFICATION("sfx_soft_notification", 249),
    /** The Roll button. */
    UI_TAP("sfx_ui_button_tap", 50),
    /** The talk tray opens. */
    UI_OPEN("sfx_ui_panel_open", 220),
    /** The talk tray closes. */
    UI_CLOSE("sfx_ui_panel_close", 200)
}

/** One effect to play [delayMs] after the event that caused it, so a sequence follows the action. */
data class SfxCue(val sfx: Sfx, val delayMs: Long = 0)

/** The sequences that more than one game uses, so every game sounds the same for the same moment. */
object SfxSequences {
    /** A brand-new table: riffle shuffle, then the deal. */
    fun freshMatch(): List<SfxCue> = listOf(SfxCue(Sfx.RIFFLE), SfxCue(Sfx.DEAL_MANY, 1200))

    /** The next round or hand: shuffle, then the deal. */
    fun newRound(): List<SfxCue> = listOf(SfxCue(Sfx.SHUFFLE), SfxCue(Sfx.DEAL_MANY, 1500))

    /** Next hand when the old cards are still on the table: gather them first. */
    fun gatherAndDeal(): List<SfxCue> =
        listOf(SfxCue(Sfx.COLLECT), SfxCue(Sfx.SHUFFLE, 550), SfxCue(Sfx.DEAL_MANY, 1950))
}
