package com.atmasanyam.app.data.remote

import com.atmasanyam.app.data.remote.dto.*
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * The Android app only ever talks to our own backend (never News/AI/TTS
 * vendors directly) — see spec §27/§37. All expensive AI/video processing
 * happens server-side; this client is a thin REST consumer.
 */
interface ApiService {

    @GET("languages")
    suspend fun getLanguages(): LanguagesResponse

    @GET("categories")
    suspend fun getCategories(): CategoriesResponse

    @GET("locations/states")
    suspend fun getStates(): StatesResponse

    @GET("locations/states/{state}/districts")
    suspend fun getDistricts(@Path("state") state: String): DistrictsResponse

    @GET("feed")
    suspend fun getFeed(
        @Query("lang") lang: String,
        @Query("category") category: String? = null,
        @Query("state") state: String? = null,
        @Query("district") district: String? = null,
        @Query("cursor") cursor: String? = null,
        @Query("limit") limit: Int = 20,
    ): FeedResponse

    @GET("stories/{id}")
    suspend fun getStory(@Path("id") id: String, @Query("lang") lang: String): StoryDetailDto

    @GET("videos/{id}/manifest")
    suspend fun getVideoManifest(@Path("id") id: String): VideoManifestDto

    @GET("search")
    suspend fun search(
        @Query("q") query: String,
        @Query("lang") lang: String,
        @Query("state") state: String? = null,
        @Query("category") category: String? = null,
    ): SearchResponse

    @POST("auth/anonymous")
    suspend fun anonymousAuth(@Body request: AnonymousAuthRequest): AuthResponse

    @GET("me/preferences")
    suspend fun getPreferences(): UserPreferenceResponse

    @PUT("me/preferences")
    suspend fun updatePreferences(@Body body: UserPreferenceDto): UserPreferenceResponse

    @POST("engagement/view")
    suspend fun recordView(@Body body: EngagementRequest)

    @POST("engagement/like")
    suspend fun recordLike(@Body body: EngagementRequest)

    @POST("engagement/share")
    suspend fun recordShare(@Body body: EngagementRequest)

    @POST("engagement/save")
    suspend fun recordSave(@Body body: EngagementRequest)

    @POST("engagement/report")
    suspend fun recordReport(@Body body: EngagementRequest)

    @POST("devices/register")
    suspend fun registerDevice(@Body body: DeviceRegisterRequest)
}
