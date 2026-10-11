package com.rangepatte.app.domain.profile

/** The rules of a player's own profile (Element 16): how often a name may change, how a phone is shown. */
object ProfileRules {
    /** A username may be changed once every 30 days. */
    const val USERNAME_CHANGE_MS = 30L * 24 * 60 * 60 * 1000
    /** A name given up stays reserved for its old owner this long, so nobody can grab it at once. */
    const val NAME_RELEASE_MS = 30L * 24 * 60 * 60 * 1000

    fun canChangeUsername(lastChangedAt: Long, now: Long): Boolean = lastChangedAt <= 0 || now - lastChangedAt >= USERNAME_CHANGE_MS

    /** Whole days (rounded up) until the next change is allowed; 0 when allowed now. */
    fun daysUntilUsernameChange(lastChangedAt: Long, now: Long): Int {
        if (canChangeUsername(lastChangedAt, now)) return 0
        val left = lastChangedAt + USERNAME_CHANGE_MS - now
        return ((left + 86_399_999L) / 86_400_000L).toInt()
    }

    /** A released reservation is free once its hold has run out. */
    fun isNameFree(exists: Boolean, releasedAt: Long?, now: Long): Boolean =
        !exists || (releasedAt != null && now - releasedAt >= NAME_RELEASE_MS)

    /** "•••• 4321": only the last four digits are ever shown. */
    fun maskPhone(phoneE164: String): String {
        val digits = phoneE164.filter { it.isDigit() }
        return "•••• " + digits.takeLast(4)
    }
}
