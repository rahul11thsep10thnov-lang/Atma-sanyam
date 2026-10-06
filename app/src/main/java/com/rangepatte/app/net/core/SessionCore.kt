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
    val config: MatchConfig,
    val mySeat: Int,
    val isHost: Boolean
) {
    var state: S = machine.start(config, randomFor(config.seed, 0))
        private set

    /** Number of moves applied so far. */
    var seq: Int = 0
        private set

    /** Seats played by the computer (never-filled seats, plus seats whose player left). */
    val botSeats: MutableSet<Int> = (0 until config.seats).filter { it !in config.humanSeats }.toMutableSet()

    /** The computer seat whose move is next — meaningful on the host only. */
    fun nextBotSeat(): Int? = machine.seatToAct(state)?.takeIf { it in botSeats }

    /** True while a step is due that needs no player (the UI pauses briefly, then calls [autoStep]). */
    fun hasAutoStep(): Boolean = machine.autoStep(state) != null

    fun autoStep(): Boolean {
        val next = machine.autoStep(state) ?: return false
        state = next
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
        seq += 1
        state = next
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
        if (isHost || move.seq <= seq) return false
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
                state = result
                seq = next.seq
                changed = true
            }
        }
        return changed
    }

    /** Solo play: step back to an earlier position (used by Undo). */
    fun restore(earlier: S) {
        state = earlier
    }
}
