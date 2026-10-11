package com.rangepatte.app.audio

/**
 * Everything the player can set about sound. [master] scales both categories; [gameSounds] and [music]
 * switch the categories on and off independently; each category has its own volume. Defaults follow
 * the mixing advice for this app: quiet background music (~20%) under clear card effects (~80%).
 */
data class AudioSettings(
    val master: Float = DEFAULT_MASTER,
    val gameSoundsOn: Boolean = true,
    val gameSoundVolume: Float = DEFAULT_GAME_SOUND_VOLUME,
    val musicOn: Boolean = true,
    val musicVolume: Float = DEFAULT_MUSIC_VOLUME
) {
    /** The loudness card effects should actually play at: master × effects volume, or 0 when switched off. */
    val effectiveGameSoundVolume: Float
        get() = if (gameSoundsOn) clamp(master) * clamp(gameSoundVolume) else 0f

    /** The loudness the music should actually play at: master × music volume, or 0 when switched off. */
    val effectiveMusicVolume: Float
        get() = if (musicOn) clamp(master) * clamp(musicVolume) else 0f

    companion object {
        const val DEFAULT_MASTER = 1.0f
        const val DEFAULT_GAME_SOUND_VOLUME = 0.8f
        const val DEFAULT_MUSIC_VOLUME = 0.2f

        fun clamp(value: Float): Float = if (value.isNaN()) 0f else value.coerceIn(0f, 1f)
    }
}
