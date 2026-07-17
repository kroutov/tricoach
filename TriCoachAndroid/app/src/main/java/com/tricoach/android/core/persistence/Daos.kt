package com.tricoach.android.core.persistence

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface UserSessionDao {
    @Query("SELECT * FROM user_session LIMIT 1")
    suspend fun get(): UserEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: UserEntity)

    @Query("DELETE FROM user_session")
    suspend fun clear()
}

@Dao
interface ProfileDao {
    @Query("SELECT * FROM profile LIMIT 1")
    suspend fun get(): ProfileEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: ProfileEntity)

    @Query("DELETE FROM profile")
    suspend fun clear()
}

@Dao
interface AvailabilityDao {
    @Query("SELECT * FROM availability LIMIT 1")
    suspend fun get(): AvailabilityEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: AvailabilityEntity)

    @Query("DELETE FROM availability")
    suspend fun clear()
}

@Dao
interface GoalDao {
    @Query("SELECT * FROM goal")
    suspend fun getAll(): List<GoalEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: GoalEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(entities: List<GoalEntity>)

    @Query("DELETE FROM goal")
    suspend fun clear()
}

@Dao
interface CheckInDao {
    @Query("SELECT * FROM check_in")
    suspend fun getAll(): List<CheckInEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: CheckInEntity)
}

@Dao
interface TrainingPlanDao {
    @Query("SELECT * FROM training_plan LIMIT 1")
    suspend fun get(): TrainingPlanEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: TrainingPlanEntity)

    @Query("DELETE FROM training_plan")
    suspend fun clear()
}

@Dao
interface AdaptationEventDao {
    @Query("SELECT * FROM adaptation_event WHERE planId = :planId")
    suspend fun getByPlan(planId: String): List<AdaptationEventEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(entities: List<AdaptationEventEntity>)
}
