package com.rangepatte.app.domain.model

/**
 * Structured rules for the royal-scroll rules dialog: a short objective plus three bulleted
 * sections (setup / play / scoring) rather than one wall of text.
 *
 * Content is English-only for now — sourced from each game's well-established rules (Pagat.com,
 * Wikipedia, and established rummy/card-game rule sites; see the commit that introduced this file
 * for the research). Translating ~150 rule bullets into all 8 app languages accurately would need
 * native-speaker review this environment can't provide, so — unlike the rest of the UI — this
 * content is deliberately scoped to English until that review happens. See README.
 */
data class GameRules(
    val objective: String,
    val setup: List<String>,
    val play: List<String>,
    val scoring: List<String>
)

object RulesContent {

    private val teenPatti = GameRules(
        objective = "Bet and bluff to hold the best three-card hand — or make everyone else fold before the cards are ever shown.",
        setup = listOf(
            "A standard 52-card deck, no jokers, for 3 to 6 players.",
            "Every player pays a fixed \"boot\" (ante) into the pot before dealing.",
            "The dealer deals three cards face-down to each player, one at a time."
        ),
        play = listOf(
            "Play \"blind\" without looking at your cards, or go \"seen\" after checking your hand — blind players bet at half the current stake.",
            "On your turn, bet at least the current stake, raise it, or fold.",
            "A seen player can call for a \"show\" against the last remaining opponent to compare hands privately.",
            "Betting continues clockwise until only one player remains — they take the pot without needing to show."
        ),
        scoring = listOf(
            "Hand ranking, highest to lowest: Trail (three of a kind) → Pure Sequence (straight flush) → Sequence (straight) → Colour (flush) → Pair → High Card.",
            "Within the same hand type, higher cards win; Ace ranks high.",
            "The last player standing — or the winner of a called show — takes the entire pot."
        )
    )

    private val flush = GameRules(
        objective = "The same three-card showdown as Teen Patti, played under its other well-known regional name — build a strong hand and outlast the table.",
        setup = listOf(
            "A standard 52-card deck for 3 to 6 players.",
            "Every player antes a boot into the pot before the deal.",
            "Three cards are dealt face-down to each player."
        ),
        play = listOf(
            "The same blind/seen betting structure as Teen Patti applies — blind players bet half the current stake.",
            "Betting passes clockwise; each player bets, raises, or folds on their turn.",
            "A show can be called once only two players remain."
        ),
        scoring = listOf(
            "Hands rank exactly as in Teen Patti: Trail → Pure Sequence → Sequence → Colour → Pair → High Card.",
            "The remaining player, or the winner of the final show, takes the pot."
        )
    )

    private val coatPiece = GameRules(
        objective = "Win at least 7 of the 13 tricks in a hand to score a \"court\"; be the first team to reach the target number of courts.",
        setup = listOf(
            "Four players in two fixed partnerships, partners sitting opposite, with a full 52-card deck.",
            "Deal and play move anticlockwise.",
            "The dealer deals five cards to each player first."
        ),
        play = listOf(
            "Looking only at their five cards, the trump-caller privately chooses and announces the trump suit.",
            "The dealer then deals out the rest of the deck in batches of four, so everyone ends with 13 cards.",
            "Follow the suit led if you can; if you can't, play any card, including trump.",
            "The highest card of the suit led wins the trick, unless a trump was played — then the highest trump wins.",
            "Whoever wins a trick leads the next one."
        ),
        scoring = listOf(
            "A team that wins 7 or more of the 13 tricks in a hand scores one court.",
            "First team to reach the agreed number of courts wins the match."
        )
    )

    private val twentyNine = GameRules(
        objective = "Bid for the right to name trump, then work with your partner to win enough card points to make your bid.",
        setup = listOf(
            "Four players in two fixed partnerships, partners sitting opposite, using a 32-card deck (7 through Ace only).",
            "The dealer deals four cards to each player first."
        ),
        play = listOf(
            "Based on those four cards, players bid a number of points they promise their side will win (minimum 15, maximum 28).",
            "The highest bidder secretly chooses trump, marking it face-down among the unused cards without revealing it.",
            "The dealer deals out the rest of the cards so everyone has eight.",
            "Follow suit if you can — the trump suit stays hidden until a player who can't follow suit asks for it to be revealed.",
            "The highest card of the suit led wins the trick, unless trumped."
        ),
        scoring = listOf(
            "Card points: each Jack = 3, each 9 = 2, each Ace = 1, each 10 = 1 — 28 points in the deck total, with a bonus point for the last trick in some variants (the game's namesake).",
            "If the bidding side reaches their bid in points, they score; otherwise, the other side scores instead."
        )
    )

    private val rummy = GameRules(
        objective = "Be the first to arrange all 13 cards into valid sequences and sets, then declare.",
        setup = listOf(
            "2 to 6 players, using one or two standard decks plus jokers depending on player count.",
            "Each player is dealt 13 cards; one card starts the discard pile and a wild joker rank is drawn at random."
        ),
        play = listOf(
            "On your turn, draw one card (from the closed deck or the discard pile), then discard one card.",
            "Arrange your hand into sequences (consecutive same-suit cards) and sets (same rank, different suits).",
            "At least one sequence must be a \"pure sequence\" — three or more consecutive same-suit cards with no joker.",
            "A second sequence is also required — pure, or using a joker — before you can declare."
        ),
        scoring = listOf(
            "A valid declaration with every card correctly grouped wins the hand for zero points.",
            "An invalid declaration (a \"wrong show\") costs the maximum penalty, typically 80 points.",
            "Other players are scored by the point value of the cards left unmatched in their hand (face cards and 10s count 10, Ace counts 1, others their face value)."
        )
    )

    private val dehlaPakad = GameRules(
        objective = "Capture as many of the four tens as possible — taking all four instantly wins the hand as a \"Kot.\"",
        setup = listOf(
            "Four players in two fixed partnerships, partners sitting opposite, with a full 52-card deck.",
            "Deal and play move anticlockwise."
        ),
        play = listOf(
            "Follow the suit led if you can; the highest card of the suit led wins the trick, unless trumped.",
            "Cards won in a trick are only \"banked\" by a partnership once the same player on that side wins two tricks in a row — until then, won cards stay face-up on the table.",
            "Whoever wins a trick leads the next one."
        ),
        scoring = listOf(
            "A partnership that captures all four tens wins an instant Kot.",
            "If the tens are split, the side holding the majority of them wins the hand.",
            "A team can also win by taking seven consecutive hands outright."
        )
    )

    private val lakadi = GameRules(
        objective = "Bid how many tricks you'll win each hand, then hit that number exactly — overshooting or undershooting both cost you.",
        setup = listOf(
            "Four players, each playing for themselves (no partnerships), with a standard 52-card deck.",
            "Spades are always trump for every hand.",
            "Each player is dealt 13 cards; the game runs five hands, with the deal passing to the right each time."
        ),
        play = listOf(
            "After seeing your hand, bid the number of tricks (1 to 13) you expect to win that round.",
            "Follow the suit led if you can; the highest card of the suit led wins, unless a spade is played — then the highest spade wins."
        ),
        scoring = listOf(
            "Making your bid exactly scores 1 point per trick bid.",
            "Each extra trick beyond your bid adds only 0.1 points.",
            "Falling short of your bid costs you that many points as a penalty.",
            "After five hands, the highest total score wins."
        )
    )

    private val solitaire = GameRules(
        objective = "Move every card onto four foundation piles, sorted by suit from Ace up to King.",
        setup = listOf(
            "A single 52-card deck, for one player.",
            "Seven tableau columns are dealt with 1 to 7 cards each — only the top card of each is face-up.",
            "The rest of the deck becomes the face-down stock pile."
        ),
        play = listOf(
            "Build tableau columns downward in alternating colours (for example, a red 7 on a black 8).",
            "A face-down card turns face-up automatically once nothing covers it.",
            "Only a King — or a run starting with one — can fill an empty column.",
            "Turn cards from the stock to the waste pile to bring new cards into play.",
            "Move any available card onto a foundation as soon as it fits, starting with the Ace of each suit."
        ),
        scoring = listOf(
            "The game is won once all 52 cards sit correctly on the four foundations.",
            "No opponent is involved — it's a race against the shuffle."
        )
    )

    private val spiderSolitaire = GameRules(
        objective = "Clear the board by building and removing eight complete King-to-Ace runs.",
        setup = listOf(
            "Two 52-card decks (104 cards total), for one player.",
            "Ten tableau columns are dealt — the first four get six cards, the rest five — only the top card of each is face-up.",
            "The remaining cards form the stock, dealt out later in rounds of ten."
        ),
        play = listOf(
            "Build tableau columns downward in any suit — but only a same-suit run in strictly descending order can be moved together as a group.",
            "When you're stuck, deal another round from the stock: one card goes to every column, so no column may be empty when you do.",
            "A completed King-to-Ace run of one suit in a single column is removed from play automatically."
        ),
        scoring = listOf(
            "The game is won once all eight suit-runs have been cleared from the board.",
            "Easier games use one suit repeated across both decks; harder ones use two or four different suits."
        )
    )

    private val byGame: Map<GameId, GameRules> = mapOf(
        GameId.TEEN_PATTI to teenPatti,
        GameId.FLUSH to flush,
        GameId.COAT_PIECE to coatPiece,
        GameId.TWENTY_NINE to twentyNine,
        GameId.RUMMY to rummy,
        GameId.DEHLA_PAKAD to dehlaPakad,
        GameId.LAKADI to lakadi,
        GameId.SOLITAIRE to solitaire,
        GameId.SPIDER_SOLITAIRE to spiderSolitaire
    )

    fun forGame(gameId: GameId): GameRules? = byGame[gameId]
}
