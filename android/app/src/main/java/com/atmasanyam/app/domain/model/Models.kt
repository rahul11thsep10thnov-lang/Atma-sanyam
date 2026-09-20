package com.atmasanyam.app.domain.model

data class Language(
    val code: String,
    val englishName: String,
    val nativeName: String,
)

data class Category(
    val key: String,
    val label: String,
)

data class IndianState(val name: String, val isUnionTerritory: Boolean)

data class LocationFilter(
    val state: String? = null,
    val district: String? = null,
) {
    val isAllIndia: Boolean get() = state == null
}

data class VideoCard(
    val videoId: String,
    val masterStoryId: String,
    val title: String,
    val thumbnailUrl: String?,
    val durationSeconds: Int?,
    val category: String,
    val state: String?,
    val district: String?,
    val publishedAt: String?,
    val sourceNames: List<String>,
)

data class VideoManifest(
    val videoId: String,
    val masterStoryId: String,
    val playbackUrl: String?,
    val thumbnailUrl: String?,
    val durationSeconds: Int?,
    val languageCode: String,
    val subtitleUrl: String?,
    val title: String,
    val location: String,
    val sourceNames: List<String>,
    val aiDisclosure: String,
)

data class StoryDetail(
    val id: String,
    val title: String,
    val summary: String,
    val category: String,
    val state: String?,
    val district: String?,
    val legalStatus: String?,
    val currentStatus: String?,
    val availableLanguages: List<String>,
    val sourceNames: List<String>,
    val disclaimer: String,
)
