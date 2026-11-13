package com.wholesoul.app.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.wholesoul.app.data.local.entity.AddressEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface AddressDao {
    @Query("SELECT * FROM addresses ORDER BY isDefault DESC")
    fun observeAll(): Flow<List<AddressEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(address: AddressEntity)

    @Update
    suspend fun update(address: AddressEntity)

    @Query("DELETE FROM addresses WHERE id = :id")
    suspend fun delete(id: String)

    @Query("UPDATE addresses SET isDefault = 0")
    suspend fun clearDefault()

    @Query("UPDATE addresses SET isDefault = 1 WHERE id = :id")
    suspend fun setDefault(id: String)

    @Query("SELECT * FROM addresses WHERE isDefault = 1 LIMIT 1")
    suspend fun getDefault(): AddressEntity?

    @Query("SELECT COUNT(*) FROM addresses")
    suspend fun count(): Int
}
