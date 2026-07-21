package com.tricoach.android.features.shared

/** Strips a redundant ".0" for whole numbers (ingredient/shopping-list quantities) — "2" not "2.0", but "1.5" stays "1.5". */
fun formatQuantity(amount: Double): String =
    if (amount == amount.toLong().toDouble()) amount.toLong().toString() else amount.toString()
