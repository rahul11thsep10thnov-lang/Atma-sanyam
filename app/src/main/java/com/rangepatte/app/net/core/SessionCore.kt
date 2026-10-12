package com.rangepatte.app.net.core

/**
 * One phone's copy of a running table. No clocks, no threads, no network — just the rules for how
 * moves become game states, so it can be tested thoroughly.
 *
 * The **host** decides which moves are legal and in what order ([hostAccept]); every phone —
 * including the host's own — ends up applying the same numbered moves ([applyBroadcast]) to the same
 * starting position and so reaches the same state.
 */
class SessionCore<S, A>(
    val machine: GameMachine<S, A>,
    config: MatchConfig,
    mySeat: Int,
    val isHost: Boolean
) {
    /** The table's settings. Seat names and the human seats change when a spectator is seated. */
    var config: MatchConfig = config
        private set

    /** This phone's seat, or [SPECTATOR] while only watching (it changes once when a spectator is seated). */
    var mySeat: Int = mySeat
        private set

    val isSpectator: Boolean get() = mySeat == SPECTATOR

    var state: S = machine.start(config, randomFor(config.seed, 0))
        private set

    /** False on a spectator's phone until the first [Wire.View] arrives: before that [state] is a placeholder. */
    var hasView: Boolean = !isSpectator
        private set

    /** Number of moves applied so far. */
    var seq: Int = 0
        private set

    /** Seats played by the computer (never-filled seats, plus seats whose player left). */
    val botSeats: MutableSet<Int> = (0 until config.seats).filter { it !in config.humanSeats }.toMutableSet()

    /**
     * Told about every step that changes the game — a move accepted by the host, a move received from
     * the host, or an automatic step — with the state before and after and the move (null if automatic).
     * Fired exactly once per step, in order, so it is the one place to react to what happened (sounds).
     * Not fired by [restore] (Undo).
     */
    var onTransition: ((before: S, after: S, action: A?) -> Unit)? = null

    /** The computer seat whose move is next — meaningful on the host only. */
    fun nextBotSeat(): Int? = machine.seatToAct(state)?.takeIf { it in botSeats }

    /** True while a step is due that needs no player (the UI pauses briefly, then calls [autoStep]). */
    fun hasAutoStep(): Boolean = machine.autoStep(state) != null

    fun autoStep(): Boolean {
        val before = state
        val next = machine.autoStep(before) ?: return false
        state = next
        onTransition?.invoke(before, next, null)
        return true
    }

    private fun settle() {
        while (autoStep()) { /* keep going until nothing is due */ }
    }

    /**
     * Host only: checks that it is [seat]'s turn and [action] is legal, applies it, and returns the
     * message to send to everybody — or null if the move was refused.
     */
    fun hostAccept(seat: Int, action: A): Wire.Do? {
        check(isHost) { "only the host accepts moves" }
        settle()
        if (machine.seatToAct(state) != seat) return null
        val next = machine.apply(state, action, seat, randomFor(config.seed, seq + 1)) ?: return null
        val before = state
        seq += 1
        state = next
        onTransition?.invoke(before, next, action)
        return Wire.Do(seq, seat, machine.encode(action))
    }

    private val pending = java.util.TreeMap<Int, Wire.Do>()

    /** True if a move from the host could not be applied — this phone no longer matches the host. */
    var outOfSync: Boolean = false
        private set

    /**
     * Client only: takes a move broadcast by the host. Moves may arrive late or twice; they are held
     * back until all earlier ones have been applied, then applied in order. Returns true if the game
     * state changed.
     */
    fun receive(move: Wire.Do): Boolean {
        if (isHost || isSpectator || move.seq <= seq) return false
        pending[move.seq] = move
        var changed = false
        while (!outOfSync) {
            val next = pending[seq + 1] ?: break
            pending.remove(next.seq)
            settle()
            val action = machine.decode(next.action)
            val result = action?.let { machine.apply(state, it, next.seat, randomFor(config.seed, next.seq)) }
            if (result == null) {
                outOfSync = true
            } else {
                val before = state
                state = result
                seq = next.seq
                changed = true
                onTransition?.invoke(before, result, action)
            }
        }
        return changed
    }

    /** Solo play: step back to an earlier position (used by Undo). */
    fun restore(earlier: S) {
        state = earlier
    }

    // -- Spectators -----------------------------------------------------------------------------

    /**
     * Spectator only: takes the host's latest redacted view of the game. Views may arrive out of order;
     * an older one is ignored. Returns true if the state changed.
     */
    fun adoptView(view: Wire.View): Boolean {
        if (!isSpectator) return false
        if (hasView && view.seq < seq) return false
        val next = machine.decodeState(view.state) ?: return false
        val before = state
        val first = !hasView
        hasView = true
        seq = view.seq
        state = next
        if (!first) onTransition?.invoke(before, next, null)
        return true
    }

    /**
     * Every phone: [seat], until now the computer's, is played by a person called [name]. Only names
     * change — the cards and scores stay as they are, so every phone stays in step.
     */
    fun seatHuman(seat: Int, name: String) {
        if (seat !in 0 until config.seats) return
        botSeats.remove(seat)
        config = config.copy(
            seatNames = config.seatNames.mapIndexed { i, n -> if (i == seat) name else n },
            humanSeats = config.humanSeats + seat
        )
        state = machine.rename(state, seat, name)
    }

    /**
     * The host has seated us (a spectator), or seated us again after we dropped out (stage 8: the
     * seat must be our own). From here on this phone follows the lockstep like any other player,
     * starting from the full [Wire.Seat.state] after move [Wire.Seat.seq].
     */
    fun takeSeat(seat: Wire.Seat): Boolean {
        if (isHost || (!isSpectator && seat.seat != mySeat)) return false
        val full = machine.decodeState(seat.state) ?: return false
        config = config.copy(seed = seat.seed)
        mySeat = seat.seat
        botSeats.remove(seat.seat)
        hasView = true
        seq = seat.seq
        state = full
        pending.clear()
        return true
    }

    /**
     * Host only: the seat a spectator may take right now — the lowest computer seat — or null when
     * every seat has a person. Seating is only done between rounds ([GameMachine.isRoundBoundary]).
     */
    fun freeSeatForSpectator(): Int? = botSeats.minOrNull()

    /** What the host sends a spectator: the current game with every hand hidden. */
    fun viewForSpectator(): Wire.View = Wire.View(seq, machine.encodeState(machine.redact(state, null)))

    /** What the host sends a player it has just seated at [seat]: the full game as it stands. */
    fun seatMessage(seat: Int): Wire.Seat = Wire.Seat(seat, seq, config.seed, machine.encodeState(state))

    companion object {
        /** The "seat" of a phone that only watches. */
        const val SPECTATOR = -1
    }
}
