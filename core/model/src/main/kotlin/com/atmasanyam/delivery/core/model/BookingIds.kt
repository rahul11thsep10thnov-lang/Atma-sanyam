package com.atmasanyam.delivery.core.model

import kotlin.random.Random

/** Client-side placeholder booking ids in the WS-<year>-<sequence> format; the backend issues real ones in Phase 12. */
object BookingIds {
    fun generate(year: Int, random: Random = Random.Default): String =
        "WS-%d-%06d".format(year, random.nextInt(1, 1_000_000))
}
