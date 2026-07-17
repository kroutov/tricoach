package com.tricoach.android.core.repository

import com.tricoach.android.core.network.AppJson
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import com.tricoach.android.core.persistence.UserEntity
import com.tricoach.android.core.persistence.UserSessionDao
import com.tricoach.android.models.User

/** Local-only, no network counterpart — mirrors iOS's SwiftDataUserSessionRepository: just remembers who's logged in between launches. */
class UserSessionRepository(private val dao: UserSessionDao) {
    suspend fun currentUser(): User? {
        val entity = dao.get() ?: return null
        return runCatching { AppJson.decodeFromString<User>(entity.payloadJson) }.getOrNull()
    }

    suspend fun save(user: User) {
        dao.clear()
        dao.insert(UserEntity(id = user.id, payloadJson = AppJson.encodeToString(user)))
    }

    suspend fun clear() {
        dao.clear()
    }
}
