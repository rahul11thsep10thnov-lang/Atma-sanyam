package com.wholesoul.app.core.util

import java.text.NumberFormat
import java.util.Locale

private val inrFormat: NumberFormat = NumberFormat.getNumberInstance(Locale("en", "IN")).apply {
    maximumFractionDigits = 0
}

fun formatRupees(amount: Double): String = "₹${inrFormat.format(amount)}"
