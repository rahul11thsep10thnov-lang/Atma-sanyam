package com.rangepatte.app.domain.model

/**
 * How a table is being played. [VS_COMPUTER] is purely local. [NEARBY] (Bluetooth/Wi-Fi, no internet)
 * and [ONLINE] (a shared room code) seat other people through the lobby — see `net/` — and the
 * computer plays any seat nobody takes. [PASS_AND_PLAY] is shown locked ("coming soon").
 */
enum class PlayMode {
    VS_COMPUTER,
    PASS_AND_PLAY,
    NEARBY,
    ONLINE;

    /** Undo is only offered when a player is only competing against AI, never against other humans. */
    val allowsUndo: Boolean get() = this == VS_COMPUTER
}
