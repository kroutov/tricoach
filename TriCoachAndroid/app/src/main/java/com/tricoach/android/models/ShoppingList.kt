package com.tricoach.android.models

import kotlinx.serialization.Serializable

@Serializable
data class ShoppingListItem(
    val name: String,
    val amount: Double? = null,
    val unit: String? = null,
)

@Serializable
data class ShoppingListAisleGroup(
    val aisle: GroceryAisle? = null,
    val items: List<ShoppingListItem> = emptyList(),
)

@Serializable
data class ShoppingListResponse(
    val from: String,
    val to: String,
    val aisles: List<ShoppingListAisleGroup> = emptyList(),
)
