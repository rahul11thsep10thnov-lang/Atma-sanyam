package com.wholesoul.app.core.util

/** "Fresh Dairy & Eggs" -> "fresh-dairy-eggs". Used to build readable placeholder image keys. */
fun String.toSlug(): String = lowercase().replace(Regex("[^a-z0-9]+"), "-").trim('-')
