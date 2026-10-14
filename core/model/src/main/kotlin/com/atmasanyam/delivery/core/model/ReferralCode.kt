package com.atmasanyam.delivery.core.model

/**
 * The code a user shares in "Refer and Earn". Derived from the phone number so it is stable
 * across reinstalls and needs no storage; the backend will own real referral codes and
 * redemption later. Same alphabet rules as the sign-in code: uppercase letters and digits,
 * minus the look-alikes 0/O and 1/I.
 */
object ReferralCode {
    const val LENGTH = 6
    private const val ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

    fun forPhone(phoneNumber: String): String {
        val digits = phoneNumber.filter { it.isDigit() }
        // FNV-1a over the digits, then a small LCG to spread it over six characters.
        var hash = 2166136261L
        for (c in digits) {
            hash = (hash xor c.code.toLong()) and 0xFFFFFFFFL
            hash = (hash * 16777619L) and 0xFFFFFFFFL
        }
        val chars = CharArray(LENGTH)
        var state = hash
        for (i in 0 until LENGTH) {
            state = (state * 1103515245L + 12345L) and 0x7FFFFFFFL
            chars[i] = ALPHABET[((state shr 8) % ALPHABET.length).toInt()]
        }
        return String(chars)
    }
}
