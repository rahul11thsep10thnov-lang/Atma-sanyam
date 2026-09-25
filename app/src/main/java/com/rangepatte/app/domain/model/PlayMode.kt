package com.rangepatte.app.domain.model

/**
 * How a table is being played. Only [VS_COMPUTER] and [PASS_AND_PLAY] are functional today — both
 * are purely local and need no networking. [NEARBY] and [ONLINE] are UI-visible but disabled
 * ("coming soon"): real WiFi-Direct/Bluetooth and internet play need their own dedicated
 * implementation (see `domain/multiplayer/` for the interfaces that work is designed against) and
 * are out of scope for this pass.
 */
enum class PlayMode {
    VS_COMPUTER,
    PASS_AND_PLAY,
    NEARBY,
    ONLINE;

    /** Undo is only offered when a player is only competing against AI, never against other humans. */
    val allowsUndo: Boolean get() = this == VS_COMPUTER
}
