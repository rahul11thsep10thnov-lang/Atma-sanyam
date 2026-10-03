package com.rangepatte.app.domain.rules

import com.rangepatte.app.domain.model.GameId

internal val englishRules = RulesBook(
    objectiveHeading = "Objective",
    setupHeading = "Setup",
    playHeading = "How to Play",
    scoringHeading = "Scoring",
    games = mapOf(
        GameId.TEEN_PATTI to GameRules(
            objective = "Hold the best three-card hand, or make everyone else fold before the cards are shown. Teen Patti is also called Flush (or Flash) in many regions — it is the same game.",
            setup = listOf(
                "A standard 52-card deck, no jokers, for 3 to 6 players.",
                "Every player puts a fixed \"boot\" (entry stake) of points into the pot before the deal.",
                "The dealer deals three cards face-down to each player, one at a time."
            ),
            play = listOf(
                "Play \"blind\" without looking at your cards, or go \"seen\" after checking them — a blind player stakes half of what a seen player must.",
                "On your turn, match the current stake, raise it, or fold.",
                "When only two players remain, a seen player can ask for a \"show\" and both hands are compared.",
                "Play continues clockwise until one player remains or a show decides the winner."
            ),
            scoring = listOf(
                "Hands from highest to lowest: Trail (three of a kind) → Pure Sequence (straight flush) → Sequence (straight) → Colour (flush) → Pair → High Card.",
                "Within the same type, higher cards win; Ace is the highest card.",
                "The last player in, or the winner of the show, takes all the points in the pot."
            )
        ),
        GameId.COAT_PIECE to GameRules(
            objective = "With your partner, win at least 7 of the 13 tricks in a hand to score a \"court\"; the first team to the target number of courts wins.",
            setup = listOf(
                "Four players in two partnerships, partners sitting opposite, with a full 52-card deck.",
                "Dealing and play go anticlockwise.",
                "The dealer first gives five cards to each player."
            ),
            play = listOf(
                "Looking only at their first five cards, the trump caller chooses the trump suit.",
                "The rest of the deck is then dealt in batches of four, so everyone holds 13 cards.",
                "Follow the suit that was led if you can; if you cannot, play any card, including a trump.",
                "The highest card of the suit led wins the trick, unless a trump is played — then the highest trump wins.",
                "The winner of a trick leads the next one."
            ),
            scoring = listOf(
                "A team that wins 7 or more of the 13 tricks scores one court.",
                "The first team to reach the agreed number of courts wins the match."
            )
        ),
        GameId.TWENTY_NINE to GameRules(
            objective = "Bid for the right to choose trump, then win enough card points with your partner to make your bid.",
            setup = listOf(
                "Four players in two partnerships, partners opposite, using 32 cards (7 up to Ace of each suit).",
                "The dealer first deals four cards to each player."
            ),
            play = listOf(
                "Looking at those four cards, players bid the points their side will win (from 15 up to 28).",
                "The highest bidder secretly chooses the trump suit and keeps it hidden.",
                "The remaining cards are dealt so that everyone holds eight.",
                "Follow suit if you can; a player who cannot follow may ask for the hidden trump to be revealed.",
                "The highest card of the suit led wins the trick, unless it is trumped."
            ),
            scoring = listOf(
                "Card points: each Jack 3, each 9 two, each Ace 1, each 10 one — 28 points in all (29 with the last-trick bonus in some variants, which gives the game its name).",
                "If the bidding side makes its bid, it scores; if not, the other side scores instead."
            )
        ),
        GameId.RUMMY to GameRules(
            objective = "Be the first to arrange all 13 of your cards into valid sequences and sets, then declare.",
            setup = listOf(
                "2 to 6 players, using one or two decks with jokers depending on the number of players.",
                "Each player gets 13 cards; one card starts the open discard pile and a wild-joker rank is chosen at random."
            ),
            play = listOf(
                "On your turn, pick one card — from the closed deck or the open pile — then throw one card away.",
                "Group your cards into sequences (running cards of one suit) and sets (the same rank in different suits).",
                "You need at least one \"pure sequence\": three or more running cards of one suit with no joker.",
                "You also need a second sequence (pure or with a joker) before you can declare."
            ),
            scoring = listOf(
                "A correct declaration wins the hand with zero points.",
                "A wrong declaration costs the maximum penalty, usually 80 points.",
                "Other players lose the value of their ungrouped cards: picture cards and 10s count 10, Ace 1, others their number."
            )
        ),
        GameId.DEHLA_PAKAD to GameRules(
            objective = "Capture as many of the four tens as you can — winning all four is an instant \"Kot\".",
            setup = listOf(
                "Four players in two partnerships, partners sitting opposite, with a full 52-card deck.",
                "Dealing and play go anticlockwise."
            ),
            play = listOf(
                "Follow the suit led if you can; the highest card of that suit wins the trick, unless it is trumped.",
                "Won cards are collected by a team only when the same player wins two tricks in a row; until then they stay on the table.",
                "The winner of a trick leads the next one."
            ),
            scoring = listOf(
                "A team that captures all four tens wins at once with a Kot.",
                "Otherwise the team holding more of the tens wins the hand.",
                "A team that wins seven hands in a row also wins."
            )
        ),
        GameId.LAKADI to GameRules(
            objective = "Bid how many tricks you will win in each hand, then make exactly that many.",
            setup = listOf(
                "Four players, each playing alone, with a standard 52-card deck.",
                "Spades are always the trump suit.",
                "Each player gets 13 cards; a game is five hands, and the deal passes to the right after each."
            ),
            play = listOf(
                "After seeing your cards, bid the number of tricks (1 to 13) you expect to win.",
                "Follow the suit led if you can; the highest card of that suit wins, unless a spade is played — then the highest spade wins."
            ),
            scoring = listOf(
                "Making your bid exactly scores 1 point for each trick bid.",
                "Each extra trick over your bid adds only 0.1 point.",
                "Falling short loses as many points as you bid.",
                "After five hands, the highest total wins."
            )
        ),
        GameId.SOLITAIRE to GameRules(
            objective = "Move every card to the four foundation piles, one per suit, from Ace up to King.",
            setup = listOf(
                "One 52-card deck, for one player.",
                "Seven columns are dealt with 1 to 7 cards; only the top card of each is face-up.",
                "The rest of the cards form the face-down stock."
            ),
            play = listOf(
                "Build columns downward in alternating colours, such as a red 7 on a black 8.",
                "A face-down card turns over when nothing is left on top of it.",
                "Only a King, or a run starting with a King, can fill an empty column.",
                "Turn cards from the stock to bring new cards into play.",
                "Move cards to the foundations whenever they fit, starting with each Ace."
            ),
            scoring = listOf(
                "You win when all 52 cards are on the four foundations.",
                "There is no opponent — it is you against the shuffle."
            )
        ),
        GameId.SPIDER_SOLITAIRE to GameRules(
            objective = "Clear the table by building eight complete King-to-Ace runs, each in one suit.",
            setup = listOf(
                "Two 52-card decks (104 cards), for one player.",
                "Ten columns are dealt — the first four get six cards, the others five; only the top card of each is face-up.",
                "The remaining cards form the stock, dealt later ten at a time."
            ),
            play = listOf(
                "Place any card on a card one rank higher, of any suit — but only a run of one suit moves together.",
                "When stuck, deal from the stock: one card to every column (no column may be empty).",
                "A finished King-to-Ace run of one suit is removed automatically."
            ),
            scoring = listOf(
                "You win when all eight runs have been cleared.",
                "Easier games use one suit only; harder ones use two or all four suits."
            )
        )
    )
)
