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
    HAND_REVEAL("sfx_hand_reveal", 950)
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
