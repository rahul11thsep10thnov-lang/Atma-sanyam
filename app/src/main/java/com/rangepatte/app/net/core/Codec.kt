package com.rangepatte.app.net.core

import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.domain.model.Rank
import com.rangepatte.app.domain.model.Suit
import java.net.URLDecoder
import java.net.URLEncoder

/**
 * A tiny flat token format for sending whole game states (spectator views, late-joiner seats):
 * tokens separated by `|`, lists as a count followed by their elements, null as `~`, strings
 * URL-encoded. Each game writes and reads its own fields in a fixed order (see `*Machine.encodeState`).
 */
class Writer {
    private val tokens = ArrayList<String>()
    fun int(v: Int) = apply { tokens += v.toString() }
    fun long(v: Long) = apply { tokens += v.toString() }
    fun bool(v: Boolean) = apply { tokens += if (v) "1" else "0" }
    fun str(v: String) = apply { tokens += URLEncoder.encode(v, "UTF-8") }
    fun nullableInt(v: Int?) = apply { tokens += v?.toString() ?: "~" }
    fun nullableStr(v: String?) = apply { tokens += v?.let { URLEncoder.encode(it, "UTF-8") } ?: "~" }
    fun <T> list(items: List<T>, each: Writer.(T) -> Unit) = apply { int(items.size); items.forEach { each(it) } }
    fun ints(items: List<Int>) = list(items) { int(it) }
    fun card(c: PlayingCard) = apply { int(c.suit.ordinal); int(c.rank.ordinal); str(c.id) }
    fun cards(cs: List<PlayingCard>) = list(cs) { card(it) }
    fun nullableSuit(s: Suit?) = nullableInt(s?.ordinal)
    override fun toString() = tokens.joinToString("|")
}

class Reader(text: String) {
    private val tokens = text.split("|")
    private var i = 0
    private fun next(): String = tokens[i++]
    fun int(): Int = next().toInt()
    fun long(): Long = next().toLong()
    fun bool(): Boolean = next() == "1"
    fun str(): String = URLDecoder.decode(next(), "UTF-8")
    fun nullableInt(): Int? = next().let { if (it == "~") null else it.toInt() }
    fun nullableStr(): String? = next().let { if (it == "~") null else URLDecoder.decode(it, "UTF-8") }
    fun <T> list(each: Reader.() -> T): List<T> { val n = int(); return List(n) { each() } }
    fun ints(): List<Int> = list { int() }
    fun card(): PlayingCard { val s = Suit.entries[int()]; val r = Rank.entries[int()]; return PlayingCard(s, r, str()) }
    fun cards(): List<PlayingCard> = list { card() }
    fun nullableSuit(): Suit? = nullableInt()?.let { Suit.entries[it] }
}

/** A card standing in for one a viewer may not see: the right count, no information. */
val HIDDEN_CARD = PlayingCard(Suit.SPADES, Rank.ACE, id = "hidden")
val PlayingCard.isHidden: Boolean get() = id == "hidden"
