package com.rangepatte.app.domain.rules

import com.rangepatte.app.domain.model.AppLanguage
import com.rangepatte.app.domain.model.GameId

/**
 * Structured rules for the royal-scroll rules dialog: a short objective plus three bulleted
 * sections (setup / play / scoring) rather than one wall of text.
 */
data class GameRules(
    val objective: String,
    val setup: List<String>,
    val play: List<String>,
    val scoring: List<String>
)

/** All rules in one language, with that language's section headings. */
class RulesBook(
    val objectiveHeading: String,
    val setupHeading: String,
    val playHeading: String,
    val scoringHeading: String,
    val games: Map<GameId, GameRules>
)

/**
 * Rules for every game in every app language. The English book is sourced from each game's
 * well-established rules (Pagat.com, Wikipedia and established Indian card-game sites); the other
 * languages are translations of it. Translations should get a native speaker's review before
 * release — see README.
 */
object RulesContent {
    private val books: Map<AppLanguage, RulesBook> = mapOf(
        AppLanguage.ENGLISH to englishRules,
        AppLanguage.HINDI to hindiRules,
        AppLanguage.MARATHI to marathiRules,
        AppLanguage.BENGALI to bengaliRules,
        AppLanguage.PUNJABI to punjabiRules,
        AppLanguage.TAMIL to tamilRules,
        AppLanguage.TELUGU to teluguRules,
        AppLanguage.KANNADA to kannadaRules
    )

    fun book(language: AppLanguage): RulesBook = books[language] ?: englishRules

    fun forGame(gameId: GameId, language: AppLanguage): GameRules? =
        book(language).games[gameId] ?: englishRules.games[gameId]
}
