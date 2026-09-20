package com.atmasanyam.app.data.remote.dto

import kotlinx.serialization.Serializable

@Serializable
data class LanguageDto(
    val code: String,
    val englishName: String,
    val nativeName: String,
    val isEnabled: Boolean,
    val isDefault: Boolean,
)

@Serializable
data class LanguagesResponse(val languages: List<LanguageDto>)

@Serializable
data class CategoryDto(
    val key: String,
    val label: String,
    val isFeedFilter: Boolean,
    val isSensitive: Boolean,
)

@Serializable
data class CategoriesResponse(val categories: List<CategoryDto>)

@Serializable
data class StateDto(val name: String, val isUnionTerritory: Boolean)

@Serializable
data class StatesResponse(val states: List<StateDto>)

@Serializable
data class DistrictsResponse(val state: String, val districts: List<String>)

@Serializable
data class FeedVideoDto(
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

@Serializable
data class FeedResponse(val videos: List<FeedVideoDto>, val nextCursor: String?)

@Serializable
data class SearchResultDto(
    val videoId: String,
    val masterStoryId: String,
    val title: String,
    val thumbnailUrl: String?,
    val category: String,
    val state: String?,
    val district: String?,
    val publishedAt: String?,
)

@Serializable
data class SearchResponse(val results: List<SearchResultDto>)

@Serializable
data class SourceDto(val name: String, val url: String)

@Serializable
data class StoryDetailDto(
    val id: String,
    val title: String,
    val summary: String,
    val category: String,
    val state: String?,
    val district: String?,
    val eventDate: String?,
    val legalStatus: String?,
    val currentStatus: String?,
    val videos: List<StoryVideoRefDto>,
    val sources: List<SourceDto>,
    val disclaimer: String,
)

@Serializable
data class StoryVideoRefDto(val languageCode: String, val videoId: String, val durationSeconds: Int?)

@Serializable
data class VideoManifestDto(
    val videoId: String,
    val masterStoryId: String,
    val playbackUrl: String?,
    val thumbnailUrl: String?,
    val durationSeconds: Int?,
    val resolution: String,
    val languageCode: String,
    val subtitleUrl: String?,
    val title: String,
    val location: String,
    val sources: List<SourceDto>,
    val aiDisclosure: String,
)

@Serializable
data class AnonymousAuthRequest(val deviceId: String, val preferredLanguageCode: String)

@Serializable
data class AuthResponse(val token: String, val userId: String)

@Serializable
data class UserPreferenceDto(
    val categories: List<String> = emptyList(),
    val states: List<String> = emptyList(),
    val notificationsEnabled: Boolean = true,
)

@Serializable
data class UserPreferenceResponse(val preference: UserPreferenceDto)

@Serializable
data class EngagementRequest(
    val videoAssetId: String,
    val watchSeconds: Int? = null,
    val channel: String? = null,
    val reason: String? = null,
    val notes: String? = null,
)

@Serializable
data class DeviceRegisterRequest(val fcmToken: String)
