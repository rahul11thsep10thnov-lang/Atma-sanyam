package com.wholesoul.app.presentation.admin

import com.wholesoul.app.data.repository.RoomAdminCatalogRepository
import com.wholesoul.app.fakes.DirectTransactionRunner
import com.wholesoul.app.fakes.InMemoryCatalog
import com.wholesoul.app.fakes.NoopCatalogSeeding
import com.wholesoul.app.fakes.RecordingCatalogChanges

/** A small shop on in-memory storage, wired the way the app wires it. */
class AdminShop {
    val catalog = InMemoryCatalog().apply {
        addCategory("fruits", "Fruits")
        addCategory("sweets", "Sweets")
        addProduct("mango", "fruits", name = "Mango", price = 80.0, mrp = 100.0, stock = 12)
        addProduct("apple", "fruits", name = "Apple", price = 120.0, mrp = 140.0, stock = 4)
        addProduct("laddu", "sweets", name = "Laddu", price = 40.0, mrp = 50.0, stock = 0, isActive = false)
    }
    val changes = RecordingCatalogChanges()
    val repository = RoomAdminCatalogRepository(
        productDao = catalog.productDao,
        categoryDao = catalog.categoryDao,
        transactions = DirectTransactionRunner(),
        changes = changes,
        seeding = NoopCatalogSeeding(),
    )
}
