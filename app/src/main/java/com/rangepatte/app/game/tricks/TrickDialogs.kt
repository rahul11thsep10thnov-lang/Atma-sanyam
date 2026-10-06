package com.rangepatte.app.game.tricks

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.rangepatte.app.R
import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.domain.model.Suit
import com.rangepatte.app.game.common.CardView
import com.rangepatte.app.ui.components.royal.RoyalButton
import com.rangepatte.app.ui.components.royal.RoyalButtonStyle
import com.rangepatte.app.ui.components.royal.RoyalPanel
import com.rangepatte.app.ui.theme.GoldenGlow
import com.rangepatte.app.ui.theme.ParchmentTextDim

/** "♠ Spades" in the player's language. */
@Composable
fun suitLabel(suit: Suit): String {
    val name = when (suit) {
        Suit.SPADES -> stringResource(R.string.suit_spades)
        Suit.HEARTS -> stringResource(R.string.suit_hearts)
        Suit.DIAMONDS -> stringResource(R.string.suit_diamonds)
        Suit.CLUBS -> stringResource(R.string.suit_clubs)
    }
    return "${suit.symbol} $name"
}

@Composable
private fun CardStrip(cards: List<PlayingCard>, cardWidth: Dp = 52.dp) {
    BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
        val count = cards.size
        val fitStep = if (count > 1) (maxWidth - cardWidth) / (count - 1) else cardWidth
        val step = minOf(cardWidth * 0.62f, fitStep)
        Row(horizontalArrangement = Arrangement.Center, modifier = Modifier.fillMaxWidth()) {
            Box(modifier = Modifier.width(cardWidth + step * (count - 1).coerceAtLeast(0)).height(cardWidth * 1.42f)) {
                cards.forEachIndexed { i, card ->
                    CardView(card = card, modifier = Modifier.width(cardWidth).offset(x = step * i))
                }
            }
        }
    }
}

/** Choose the trump suit, looking at [cards] (the cards the chooser is allowed to see). Stays up until a suit is picked. */
@Composable
fun TrumpPickerDialog(cards: List<PlayingCard>, onPick: (Suit) -> Unit) {
    Dialog(onDismissRequest = {}, properties = DialogProperties(dismissOnBackPress = false, dismissOnClickOutside = false)) {
        RoyalPanel(title = stringResource(R.string.trick_choose_trump), modifier = Modifier.fillMaxWidth()) {
            CardStrip(cards.sortedWith(compareBy({ it.suit.ordinal }, { -standardRank(it) })))
            Suit.entries.chunked(2).forEach { pair ->
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth().padding(top = 10.dp)) {
                    pair.forEach { suit ->
                        RoyalButton(text = suitLabel(suit), onClick = { onPick(suit) }, modifier = Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

/**
 * Place a bid between [min] and [max] with − and + (or pass, if [canPass]). [hand] is what the bidder
 * may look at; [info] lines say what has been bid so far.
 */
@Composable
fun BidDialog(
    title: String,
    hand: List<PlayingCard>,
    min: Int,
    max: Int,
    info: List<String>,
    canPass: Boolean,
    onBid: (Int) -> Unit,
    onPass: () -> Unit
) {
    var amount by remember(min) { mutableIntStateOf(min) }
    Dialog(onDismissRequest = {}, properties = DialogProperties(dismissOnBackPress = false, dismissOnClickOutside = false)) {
        RoyalPanel(title = title, modifier = Modifier.fillMaxWidth()) {
            CardStrip(hand.sortedWith(compareBy({ it.suit.ordinal }, { -standardRank(it) })))
            info.forEach {
                Text(
                    text = it,
                    style = MaterialTheme.typography.bodyMedium,
                    color = ParchmentTextDim,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(top = 6.dp)
                )
            }
            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterHorizontally),
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth().padding(top = 14.dp)
            ) {
                RoyalButton(text = "−", onClick = { if (amount > min) amount-- }, enabled = amount > min, style = RoyalButtonStyle.STEEL)
                Text(text = amount.toString(), style = MaterialTheme.typography.displayLarge, color = GoldenGlow)
                RoyalButton(text = "+", onClick = { if (amount < max) amount++ }, enabled = amount < max, style = RoyalButtonStyle.STEEL)
            }
            RoyalButton(
                text = stringResource(R.string.bid_place_format, amount),
                onClick = { onBid(amount) },
                enabled = min <= max,
                modifier = Modifier.fillMaxWidth().padding(top = 14.dp)
            )
            if (canPass) {
                RoyalButton(
                    text = stringResource(R.string.bid_pass),
                    onClick = onPass,
                    style = RoyalButtonStyle.STEEL,
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp)
                )
            }
        }
    }
}

/**
 * The name shown for each seat: "You" at this phone's seat, [names] elsewhere, and in team games the
 * seat opposite you is marked as your partner.
 */
@Composable
fun trickSeatNames(names: List<String>, mySeat: Int, partners: Boolean): List<String> {
    val you = stringResource(R.string.player_you)
    val partnerSeat = TrickEngine.partnerOf(mySeat)
    return names.mapIndexed { seat, name ->
        when {
            seat == mySeat -> you
            partners && seat == partnerSeat -> stringResource(R.string.seat_partner_format, name)
            else -> name
        }
    }
}
