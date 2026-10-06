package com.rangepatte.app.game.solitaire

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.rangepatte.app.R
import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.GameInfo
import com.rangepatte.app.domain.model.Suit
import com.rangepatte.app.game.common.CardSlot
import com.rangepatte.app.game.common.CardView
import com.rangepatte.app.game.common.GameFrame
import com.rangepatte.app.game.common.GameResultDialog
import com.rangepatte.app.game.common.StatusLine
import com.rangepatte.app.game.common.TableauCard
import com.rangepatte.app.game.common.UndoControl
import com.rangepatte.app.game.common.UndoHistory
import com.rangepatte.app.ui.components.royal.RoyalButton
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.thumbnails.CARD_ASPECT

private sealed interface Selection {
    data object Waste : Selection
    data class Tableau(val column: Int, val index: Int) : Selection
    data class Foundation(val suit: Suit) : Selection
}

/**
 * Klondike solitaire. Tap a card to pick it up (it glows), then tap where it should go — another
 * column, an empty column (Kings only) or a foundation. Tap a picked-up card again to send it
 * to its foundation. Tap the stock to turn cards; tap it when empty to turn the waste back over.
 * Easy turns one card at a time, Medium and Hard turn three.
 */
@Composable
fun SolitaireScreen(
    game: GameInfo,
    difficulty: AiDifficulty,
    onBackClick: () -> Unit
) {
    val drawCount = if (difficulty == AiDifficulty.EASY) 1 else 3
    var state by remember { mutableStateOf(SolitaireEngine.newGame(drawCount)) }
    var selection by remember { mutableStateOf<Selection?>(null) }
    val undo = remember { UndoHistory<SolitaireState>() }

    fun perform(move: SolitaireMove): Boolean {
        val next = SolitaireEngine.apply(state, move) ?: return false
        undo.record(state)
        state = next
        selection = null
        return true
    }

    fun moveSelectionToFoundation() {
        when (val s = selection) {
            Selection.Waste -> perform(SolitaireMove.WasteToFoundation)
            is Selection.Tableau -> if (s.index == state.tableau[s.column].lastIndex) perform(SolitaireMove.TableauToFoundation(s.column))
            else -> Unit
        }
    }

    fun moveSelectionToColumn(to: Int): Boolean = when (val s = selection) {
        Selection.Waste -> perform(SolitaireMove.WasteToTableau(to))
        is Selection.Tableau -> perform(SolitaireMove.TableauToTableau(s.column, s.index, to))
        is Selection.Foundation -> perform(SolitaireMove.FoundationToTableau(s.suit, to))
        null -> false
    }

    fun onTableauTap(column: Int, index: Int) {
        val current = selection
        when {
            current == null -> selection = Selection.Tableau(column, index)
            current == Selection.Tableau(column, index) -> {
                moveSelectionToFoundation()
                selection = null
            }
            moveSelectionToColumn(column) -> Unit
            else -> selection = Selection.Tableau(column, index)
        }
    }

    fun startNewGame() {
        state = SolitaireEngine.newGame(drawCount)
        selection = null
        undo.reset()
    }

    GameFrame(
        game = game,
        onBackClick = onBackClick,
        undo = UndoControl(
            usesLeft = undo.usesLeft,
            enabled = undo.canUndo && !state.isWon,
            onUndo = {
                undo.undo()?.let {
                    state = it
                    selection = null
                }
            }
        )
    ) {
        StatusLine(
            text = stringResource(R.string.game_moves_format, state.moves),
            modifier = Modifier.padding(top = 2.dp)
        )
        BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
            val pad = 8.dp
            val gap = 4.dp
            val cardWidth = (maxWidth - pad * 2 - gap * 6) / 7
            val cardHeight = cardWidth * CARD_ASPECT
            val downStep = cardWidth * 0.16f
            val upStep = cardWidth * 0.38f

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = pad, vertical = 4.dp)
            ) {
                // Stock, waste (two slots wide so a three-card fan fits) and the four foundations.
                Row(horizontalArrangement = Arrangement.spacedBy(gap)) {
                    if (state.stock.isNotEmpty()) {
                        CardView(card = null, faceDown = true, modifier = Modifier.width(cardWidth), onClick = { perform(SolitaireMove.Draw) })
                    } else {
                        CardSlot(
                            modifier = Modifier.width(cardWidth),
                            onClick = if (state.waste.isNotEmpty()) ({ perform(SolitaireMove.Draw) }) else null
                        ) {
                            if (state.waste.isNotEmpty()) {
                                Icon(Icons.Filled.Refresh, contentDescription = null, tint = GoldBevelLight, modifier = Modifier.align(Alignment.Center).size(cardWidth * 0.5f))
                            }
                        }
                    }
                    Box(modifier = Modifier.width(cardWidth * 2 + gap).height(cardHeight)) {
                        val shown = state.waste.takeLast(if (drawCount == 3) 3 else 1)
                        if (shown.isEmpty()) {
                            CardSlot(modifier = Modifier.width(cardWidth))
                        }
                        shown.forEachIndexed { i, card ->
                            val isTop = i == shown.lastIndex
                            CardView(
                                card = card,
                                modifier = Modifier.width(cardWidth).offset(x = cardWidth * 0.32f * i),
                                selected = isTop && selection == Selection.Waste,
                                onClick = if (isTop) ({
                                    if (selection == Selection.Waste) {
                                        moveSelectionToFoundation()
                                        selection = null
                                    } else {
                                        selection = Selection.Waste
                                    }
                                }) else null
                            )
                        }
                    }
                    Suit.entries.forEach { suit ->
                        val pile = state.foundations[suit.ordinal]
                        val top = pile.lastOrNull()
                        if (top == null) {
                            CardSlot(
                                modifier = Modifier.width(cardWidth),
                                onClick = { moveSelectionToFoundation() }
                            ) {
                                Text(
                                    text = suit.symbol,
                                    color = GoldBevelLight.copy(alpha = 0.45f),
                                    modifier = Modifier.align(Alignment.Center),
                                    style = MaterialTheme.typography.titleLarge
                                )
                            }
                        } else {
                            CardView(
                                card = top,
                                modifier = Modifier.width(cardWidth),
                                selected = selection == Selection.Foundation(suit),
                                onClick = {
                                    val s = selection
                                    if (s == null) selection = Selection.Foundation(suit)
                                    else if (s == Selection.Foundation(suit)) selection = null
                                    else moveSelectionToFoundation()
                                }
                            )
                        }
                    }
                }

                Row(
                    horizontalArrangement = Arrangement.spacedBy(gap),
                    verticalAlignment = Alignment.Top,
                    modifier = Modifier.padding(top = 10.dp)
                ) {
                    state.tableau.forEachIndexed { columnIndex, column ->
                        val offsets = column.runningOffsets(downStep, upStep)
                        val columnHeight = if (column.isEmpty()) cardHeight else offsets.last() + cardHeight
                        Box(modifier = Modifier.width(cardWidth).height(columnHeight)) {
                            if (column.isEmpty()) {
                                CardSlot(modifier = Modifier.width(cardWidth), onClick = { moveSelectionToColumn(columnIndex) })
                            }
                            val picked = (selection as? Selection.Tableau)?.takeIf { it.column == columnIndex }
                            column.forEachIndexed { index, tableauCard ->
                                CardView(
                                    card = tableauCard.card,
                                    faceDown = !tableauCard.faceUp,
                                    inlineIndex = true,
                                    selected = picked != null && index >= picked.index,
                                    modifier = Modifier.width(cardWidth).offset(y = offsets[index]),
                                    onClick = if (tableauCard.faceUp) ({ onTableauTap(columnIndex, index) }) else null
                                )
                            }
                        }
                    }
                }

                if (SolitaireEngine.canAutoFinish(state)) {
                    RoyalButton(
                        text = stringResource(R.string.sol_auto_finish),
                        onClick = {
                            undo.record(state)
                            state = SolitaireEngine.autoFinish(state)
                            selection = null
                        },
                        modifier = Modifier.fillMaxWidth().padding(top = 16.dp)
                    )
                }
            }
        }
    }

    if (state.isWon) {
        GameResultDialog(
            title = stringResource(R.string.game_you_won),
            lines = listOf(stringResource(R.string.game_moves_format, state.moves)),
            primaryText = stringResource(R.string.game_new_game),
            onPrimary = ::startNewGame,
            secondaryText = stringResource(R.string.game_back_to_khel),
            onSecondary = onBackClick
        )
    }
}

/** Top-edge offset of each card in a column: face-down cards are squeezed tight, face-up ones show their index. */
private fun List<TableauCard>.runningOffsets(down: Dp, up: Dp): List<Dp> {
    var y = 0.dp
    return map { card ->
        val current = y
        y += if (card.faceUp) up else down
        current
    }
}
