package com.rangepatte.app.ui.background

/**
 * Heritage background scenes selectable in Settings. Real photography/illustration assets are not
 * available in this environment (network access to fetch or generate them is not permitted here),
 * so [BackgroundManager] renders each type as a gradient + pattern placeholder. Drop real images
 * into res/drawable/backgrounds/ (named bg_<lowercase_type>) and BackgroundManager will need only
 * that one lookup updated — screens never reference drawables directly.
 */
enum class BackgroundType {
    GARDEN_BALCONY,
    CLASSICAL_LIVING_ROOM,
    MOUNTAIN_VALLEY,
    WOODEN_VERANDA,
    COURTYARD,
    EVENING_BALCONY
}
