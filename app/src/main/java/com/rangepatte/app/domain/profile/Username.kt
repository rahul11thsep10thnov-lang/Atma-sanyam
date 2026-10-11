package com.rangepatte.app.domain.profile

/**
 * The rules for a player's public username, kept pure so they run the same on the phone (live feedback
 * while typing) and in tests. The database enforces uniqueness on the [normalize]d form, so "Rahul"
 * and "rahul" are the same name.
 */
object Username {
    const val MIN_LENGTH = 3
    const val MAX_LENGTH = 16

    /** Why a name is not allowed. */
    enum class Problem { TOO_SHORT, TOO_LONG, BAD_CHARACTERS, RESERVED }

    private val allowed = Regex("[A-Za-z0-9_]+")

    /** Names nobody may take: they would look official or be confusing. */
    val reserved: Set<String> = setOf(
        "admin", "administrator", "support", "help", "moderator", "mod", "system", "root", "staff", "official",
        "indian_taash", "indiantaash", "rang_e_patte", "rangepatte", "taash", "you", "me", "guest", "player",
        "computer", "bot", "ravi", "meera", "gopal", "asha", "kiran" // the computer players' names
    )

    /** Lower-case, trimmed: the form stored and compared for uniqueness. */
    fun normalize(raw: String): String = raw.trim().lowercase()

    /** Null when the name is acceptable, otherwise the first problem with it. */
    fun validate(raw: String): Problem? {
        val name = raw.trim()
        return when {
            name.length < MIN_LENGTH -> Problem.TOO_SHORT
            name.length > MAX_LENGTH -> Problem.TOO_LONG
            !allowed.matches(name) -> Problem.BAD_CHARACTERS
            normalize(name) in reserved -> Problem.RESERVED
            else -> null
        }
    }

    /** Keeps only the characters a name may contain, as the user types. */
    fun sanitizeInput(raw: String): String = raw.filter { it.isLetterOrDigit() && it.code < 128 || it == '_' }.take(MAX_LENGTH)

    /** A few alternatives to offer when [base] is taken; all valid, none equal to [base]. */
    fun suggestions(base: String, taken: (String) -> Boolean = { false }): List<String> {
        val stem = sanitizeInput(base).trim('_').take(MAX_LENGTH - 3).ifEmpty { "player" }
        val candidates = listOf("${stem}_ace", "${stem}29", "${stem}_taash", "${stem}_1", "${stem}7", "the_$stem")
        return candidates.filter { validate(it) == null && normalize(it) != normalize(base) && !taken(it) }.take(3)
    }
}
