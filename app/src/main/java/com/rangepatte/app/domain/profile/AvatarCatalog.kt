package com.rangepatte.app.domain.profile

/**
 * The twenty profile pictures a player can choose from. [id] is what the profile stores (stable
 * forever, even if the artwork is replaced); [resName] is the drawable that holds the artwork
 * (`res/drawable/avatar_01_focused_strategist.png` …); [discColor] is the coloured disc the picture
 * sits on, also used as a stand-in while the artwork has not been added to the project yet.
 */
data class Avatar(val id: String, val resName: String, val title: String, val discColor: Long)

object AvatarCatalog {
    val all: List<Avatar> = listOf(
        Avatar("av_01", "avatar_01_focused_strategist", "Focused Strategist", 0xFFF5C542),
        Avatar("av_02", "avatar_02_cheerful_friend", "Cheerful Friend", 0xFFFF7F7F),
        Avatar("av_03", "avatar_03_confident_gamer", "Confident Gamer", 0xFFC8A2FF),
        Avatar("av_04", "avatar_04_calm_intellectual", "Calm Intellectual", 0xFF9FE2BF),
        Avatar("av_05", "avatar_05_playful_trickster", "Playful Trickster", 0xFF40E0D0),
        Avatar("av_06", "avatar_06_quiet_artist", "Quiet Artist", 0xFF87CEEB),
        Avatar("av_07", "avatar_07_athletic_challenger", "Athletic Challenger", 0xFFE64FA8),
        Avatar("av_08", "avatar_08_gentle_introvert", "Gentle Introvert", 0xFFFFC9A3),
        Avatar("av_09", "avatar_09_cool_music_lover", "Cool Music Lover", 0xFF5B3FA6),
        Avatar("av_10", "avatar_10_mature_mentor_male", "Mature Mentor", 0xFFFF9A3C),
        Avatar("av_11", "avatar_11_bright_optimist", "Bright Optimist", 0xFFB0E0FF),
        Avatar("av_12", "avatar_12_competitive_gamer", "Competitive Gamer", 0xFFF4A6C4),
        Avatar("av_13", "avatar_13_creative_dreamer", "Creative Dreamer", 0xFF2E9E6B),
        Avatar("av_14", "avatar_14_calm_thinker", "Calm Thinker", 0xFFF6EFD8),
        Avatar("av_15", "avatar_15_energetic_friend", "Energetic Friend", 0xFF7A1E3A),
        Avatar("av_16", "avatar_16_elegant_introvert", "Elegant Introvert", 0xFF7FE5E0),
        Avatar("av_17", "avatar_17_bold_challenger", "Bold Challenger", 0xFFD9A441),
        Avatar("av_18", "avatar_18_nature_lover", "Nature Lover", 0xFFC9A6E8),
        Avatar("av_19", "avatar_19_anime_enthusiast", "Anime Enthusiast", 0xFF2A8C8C),
        Avatar("av_20", "avatar_20_mature_mentor_female", "Mature Mentor", 0xFFE0563A)
    )

    fun byId(id: String?): Avatar? = all.firstOrNull { it.id == id }
}
