package com.wholesoul.app.data.catalog

import com.wholesoul.app.domain.repository.CatalogChanges
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Runs a catalog read after making sure the starter catalog exists, and turns failures into a
 * [Result]. Cancellation is re-thrown on purpose: a screen that restarts its load (because the
 * catalog changed) cancels the old one, and that must not surface as an error state.
 */
internal suspend fun <T> catalogCall(seeding: CatalogSeeding, block: suspend () -> T): Result<T> {
    seeding.ensureSeeded()
    return catalogResult(block)
}

internal suspend fun <T> catalogResult(block: suspend () -> T): Result<T> =
    try {
        Result.success(block())
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        Result.failure(e)
    }

@Singleton
class CatalogChangeBus @Inject constructor() : CatalogChanges {
    private val bus = MutableSharedFlow<Unit>(extraBufferCapacity = 1, onBufferOverflow = BufferOverflow.DROP_OLDEST)

    override val events: Flow<Unit> = bus.asSharedFlow()

    override fun notifyChanged() {
        bus.tryEmit(Unit)
    }
}
