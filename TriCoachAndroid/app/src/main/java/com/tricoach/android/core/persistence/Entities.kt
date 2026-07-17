package com.tricoach.android.core.persistence

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Envelope pattern, mirroring iOS's SwiftData PersistenceModels.swift: a
 * handful of indexable columns plus the full domain object serialized to
 * JSON in [payloadJson]. Simpler than modeling every nested relation as its
 * own Room table, and keeps the cache shape decoupled from the wire shape.
 */
@Entity(tableName = "user_session")
data class UserEntity(
    @PrimaryKey val id: String,
    val payloadJson: String,
)

@Entity(tableName = "profile")
data class ProfileEntity(
    @PrimaryKey val id: String,
    val payloadJson: String,
)

@Entity(tableName = "availability")
data class AvailabilityEntity(
    @PrimaryKey val id: String,
    val payloadJson: String,
)

@Entity(tableName = "goal")
data class GoalEntity(
    @PrimaryKey val id: String,
    val payloadJson: String,
)

@Entity(tableName = "check_in")
data class CheckInEntity(
    @PrimaryKey val id: String,
    val payloadJson: String,
)

@Entity(tableName = "training_plan")
data class TrainingPlanEntity(
    @PrimaryKey val id: String,
    val payloadJson: String,
)

@Entity(tableName = "adaptation_event")
data class AdaptationEventEntity(
    @PrimaryKey val id: String,
    val planId: String,
    val payloadJson: String,
)
