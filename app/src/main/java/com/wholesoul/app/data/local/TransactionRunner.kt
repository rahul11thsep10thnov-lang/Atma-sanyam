package com.wholesoul.app.data.local

import androidx.room.withTransaction
import javax.inject.Inject
import javax.inject.Singleton

/** Runs several catalog writes as one all-or-nothing step. Tests run the block directly. */
interface TransactionRunner {
    suspend fun <T> run(block: suspend () -> T): T
}

@Singleton
class RoomTransactionRunner @Inject constructor(
    private val database: CatalogDatabase,
) : TransactionRunner {
    override suspend fun <T> run(block: suspend () -> T): T = database.withTransaction { block() }
}
