package com.tricoach.android.core.persistence

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [
        UserEntity::class,
        ProfileEntity::class,
        AvailabilityEntity::class,
        GoalEntity::class,
        CheckInEntity::class,
        TrainingPlanEntity::class,
        AdaptationEventEntity::class,
    ],
    version = 1,
    exportSchema = false,
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun userSessionDao(): UserSessionDao
    abstract fun profileDao(): ProfileDao
    abstract fun availabilityDao(): AvailabilityDao
    abstract fun goalDao(): GoalDao
    abstract fun checkInDao(): CheckInDao
    abstract fun trainingPlanDao(): TrainingPlanDao
    abstract fun adaptationEventDao(): AdaptationEventDao

    companion object {
        fun build(context: Context): AppDatabase =
            Room.databaseBuilder(context, AppDatabase::class.java, "tricoach.db").build()
    }
}
