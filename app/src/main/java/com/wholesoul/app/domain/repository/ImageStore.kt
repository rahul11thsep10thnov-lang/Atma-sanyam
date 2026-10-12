package com.wholesoul.app.domain.repository

/**
 * Where photos picked in the Admin Console live. Returned keys go straight into
 * `Product.imageKey` / `Category.imageKey`; the app's `ImageProvider` knows how to display them.
 */
interface ImageStore {
    /** Copies, downscales and re-encodes the picked image. Returns the key to store. */
    suspend fun importPhoto(sourceUri: String): Result<String>

    /** Removes a previously imported photo. Keys that are not imported photos are ignored. */
    fun delete(imageKey: String)
}
