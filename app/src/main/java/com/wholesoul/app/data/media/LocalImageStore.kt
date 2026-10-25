package com.wholesoul.app.data.media

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import com.wholesoul.app.core.image.isImportedPhoto
import com.wholesoul.app.data.catalog.catalogResult
import com.wholesoul.app.domain.repository.ImageStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.max

/**
 * Keeps photos picked in the Admin Console inside the app's private storage.
 *
 * A picked photo is a temporary permission to read someone else's file, and a phone photo can be
 * 12 MP, so each one is copied, shrunk to at most [MAX_EDGE_PX] on its long side, rotated upright
 * (phones store the rotation separately) and saved as a JPEG. Re-encoding also drops everything
 * embedded in the original file, such as the location phones tag photos with.
 */
@Singleton
class LocalImageStore @Inject constructor(
    @ApplicationContext private val context: Context,
) : ImageStore {

    private val directory: File get() = File(context.filesDir, "catalog_photos").apply { mkdirs() }

    override suspend fun importPhoto(sourceUri: String): Result<String> = withContext(Dispatchers.IO) {
        catalogResult {
            val uri = Uri.parse(sourceUri)
            val resolver = context.contentResolver

            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            resolver.openInputStream(uri).use { BitmapFactory.decodeStream(it, null, bounds) }
            require(bounds.outWidth > 0 && bounds.outHeight > 0) { "That file isn't a photo we can use" }

            val options = BitmapFactory.Options().apply {
                inSampleSize = sampleSizeFor(bounds.outWidth, bounds.outHeight)
            }
            val decoded = resolver.openInputStream(uri).use { BitmapFactory.decodeStream(it, null, options) }
                ?: throw IllegalArgumentException("Couldn't read that photo")

            val degrees = resolver.openInputStream(uri).use { stream ->
                if (stream == null) 0 else rotationDegrees(ExifInterface(stream))
            }
            val upright = if (degrees == 0) {
                decoded
            } else {
                Bitmap.createBitmap(decoded, 0, 0, decoded.width, decoded.height, Matrix().apply { postRotate(degrees.toFloat()) }, true)
            }

            val file = File(directory, "${UUID.randomUUID()}.jpg")
            try {
                FileOutputStream(file).use { upright.compress(Bitmap.CompressFormat.JPEG, JPEG_QUALITY, it) }
            } finally {
                if (upright !== decoded) upright.recycle()
                decoded.recycle()
            }
            Uri.fromFile(file).toString()
        }
    }

    override fun delete(imageKey: String) {
        if (!imageKey.isImportedPhoto()) return
        val path = Uri.parse(imageKey).path ?: return
        val file = File(path).canonicalFile
        // Only ever delete inside our own photo folder.
        if (file.parentFile == directory.canonicalFile) file.delete()
    }

    private fun sampleSizeFor(width: Int, height: Int): Int {
        var sample = 1
        while (max(width, height) / sample > MAX_EDGE_PX) sample *= 2
        return sample
    }

    private fun rotationDegrees(exif: ExifInterface): Int =
        when (exif.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
            ExifInterface.ORIENTATION_ROTATE_90 -> 90
            ExifInterface.ORIENTATION_ROTATE_180 -> 180
            ExifInterface.ORIENTATION_ROTATE_270 -> 270
            else -> 0
        }

    private companion object {
        const val MAX_EDGE_PX = 1600
        const val JPEG_QUALITY = 85
    }
}
