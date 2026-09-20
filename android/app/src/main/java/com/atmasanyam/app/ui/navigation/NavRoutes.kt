package com.atmasanyam.app.ui.navigation

object NavRoutes {
    const val LANGUAGE_ONBOARDING = "onboarding/language"
    const val HOME = "home"
    const val PLAYER = "player/{videoId}"
    const val STORY_DETAIL = "story/{storyId}"
    const val SEARCH = "search"
    const val LOCATION_FILTER = "location"
    const val SETTINGS = "settings"

    fun player(videoId: String) = "player/$videoId"
    fun storyDetail(storyId: String) = "story/$storyId"
}
