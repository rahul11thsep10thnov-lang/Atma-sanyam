package com.rangepatte.app.game.spider

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.domain.model.Rank
import com.rangepatte.app.domain.model.Suit
import com.rangepatte.app.game.common.CardSlot
import com.rangepatte.app.game.common.CardView
import com.rangepatte.app.game.common.GameFrame
import com.rangepatte.app.game.common.GameResultDialog
import com.rangepatte.app.game.common.StatusLine
import com.rangepatte.app.game.common.TableauCard
import com.rangepatte.app.game.common.UndoControl
import com.rangepatte.app.game.common.UndoHistory
import com.rangepatte.app.ui.theme.GoldenGlow
import com.rangepatte.app.ui.thumbnails.CARD_ASPECT

private data class Picked(val column: Int, val index: Int)

/**
 * Spider solitaire with two decks. Build runs downward in any suit, but only a run of one suit can
 * be moved together; a full King-to-Ace run of one suit leaves the table. Tap a card to pick up it
 * and everything below it, then tap the column to put it on. Tap the stock to deal a card onto every
 * column. Easy plays with one suit, Medium with two, Hard with four.
 */
@Composable
fun SpiderScreen(
    game: GameInfo,
    difficulty: AiDifficulty,
    onBackClick: () -> Unit
) {
    val suitCount = when (difficulty) {
        AiDifficulty.EASY -> 1
        AiDifficulty.MEDIUM -> 2
        AiDifficulty.HARD -> 4
    }
    var state by remember { mutableStateOf(SpiderEngine.newGame(suitCount)) }
    var picked by remember { mutableStateOf<Picked?>(null) }
    var emptyColumnWarning by remember { mutableStateOf(false) }
    val undo = remember { UndoHistory<SpiderState>() }

    fun perform(move: SpiderMove): Boolean {
        val next = SpiderEngine.apply(state, move) ?: return false
        undo.record(state)
        state = next
        picked = null
        emptyColumnWarning = false
        return true
    }

    fun onColumnTap(column: Int, index: Int?) {
        val current = picked
        if (current != null && current.column != column && perform(SpiderMove.MoveRun(current.column, current.index, column))) return
        picked = when {
            index == null -> null
            current == Picked(column, index) -> null
            SpiderEngine.isMovableRun(state.tableau[column], index) -> Picked(column, index)
            else -> null
        }
    }

    fun startNewGame() {
        state = SpiderEngine.newGame(suitCount)
        picked = null
        emptyColumnWarning = false
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
                    picked = null
                    emptyColumnWarning = false
                }
            }
        )
    ) {
        StatusLine(
            text = stringResource(R.string.spider_status_format, state.completed, SpiderEngine.RUNS_TO_WIN, state.dealsLeft, state.moves),
            modifier = Modifier.padding(top = 2.dp)
        )
        if (emptyColumnWarning) {
            StatusLine(text = stringResource(R.string.spider_fill_columns), highlight = true)
        }
        BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
            val pad = 2.dp
            val gap = 1.dp
            val cardWidth = maxOf(30.dp, (maxWidth - pad * 2 - gap * 9) / 10)
            val cardHeight = cardWidth * CARD_ASPECT
            val downStep = cardWidth * 0.14f
            val upStep = cardWidth * 0.40f

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = pad, vertical = 4.dp)
            ) {
                // Stock on the left, cleared runs on the right.
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(cardWidth * 0.5f)) {
                    if (state.stock.size >= SpiderEngine.COLUMNS) {
                        Box(contentAlignment = Alignment.Center) {
                            CardView(
                                card = null,
                                faceDown = true,
                                modifier = Modifier.width(cardWidth),
                                onClick = {
                                    if (!perform(SpiderMove.Deal)) emptyColumnWarning = SpiderEngine.dealBlockedByEmptyColumn(state)
                                }
                            )
                            Text(
                                text = state.dealsLeft.toString(),
                                style = MaterialTheme.typography.titleMedium,
                                color = GoldenGlow
                            )
                        }
                    } else {
                        CardSlot(modifier = Modifier.width(cardWidth))
                    }
                    Box(modifier = Modifier.height(cardHeight)) {
                        repeat(state.completed) { i ->
                            CardView(
                                card = PlayingCard(Suit.SPADES, Rank.KING),
                                modifier = Modifier.width(cardWidth * 0.8f).offset(x = cardWidth * 0.35f * i)
                            )
                        }
                    }
                }

                Row(
                    horizontalArrangement = Arrangement.spacedBy(gap),
                    verticalAlignment = Alignment.Top,
                    modifier = Modifier.padding(top = 8.dp)
                ) {
                    state.tableau.forEachIndexed { columnIndex, column ->
                        val offsets = column.runningOffsets(downStep, upStep)
                        val columnHeight = if (column.isEmpty()) cardHeight else offsets.last() + cardHeight
                        Box(modifier = Modifier.width(cardWidth).height(columnHeight)) {
                            if (column.isEmpty()) {
                                CardSlot(modifier = Modifier.width(cardWidth), onClick = { onColumnTap(columnIndex, null) })
                            }
                            val current = picked?.takeIf { it.column == columnIndex }
                            column.forEachIndexed { index, tableauCard ->
                                CardView(
                                    card = tableauCard.card,
                                    faceDown = !tableauCard.faceUp,
                                    inlineIndex = true,
                                    selected = current != null && index >= current.index,
                                    modifier = Modifier.width(cardWidth).offset(y = offsets[index]),
                                    onClick = if (tableauCard.faceUp) ({ onColumnTap(columnIndex, index) }) else null
                                )
                            }
                        }
                    }
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

private fun List<TableauCard>.runningOffsets(down: Dp, up: Dp): List<Dp> {
    var y = 0.dp
    return map { card ->
        val current = y
        y += if (card.faceUp) up else down
        current
    }
}
