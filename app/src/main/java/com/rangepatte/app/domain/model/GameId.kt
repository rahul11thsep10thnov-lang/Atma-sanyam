package com.rangepatte.app.domain.model

/** Stable identifier for each game — used as the navigation route segment and history key. */
enum class GameId(val routeSegment: String) {
    /** Teen Patti and "Flush" (Flash) are the same game under two regional names, so they share one entry. */
    TEEN_PATTI("teenPatti"),
    COAT_PIECE("coatPiece"),
    TWENTY_NINE("twentyNine"),
    RUMMY("rummy"),
    DEHLA_PAKAD("dehlaPakad"),
    LAKADI("lakadi"),
    SOLITAIRE("solitaire"),
    SPIDER_SOLITAIRE("spiderSolitaire")
}
