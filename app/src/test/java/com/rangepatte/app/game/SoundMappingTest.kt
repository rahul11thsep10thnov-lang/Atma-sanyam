package com.rangepatte.app.game

import com.rangepatte.app.audio.AudioSettings
import com.rangepatte.app.audio.Sfx
import com.rangepatte.app.audio.SfxCue
import com.rangepatte.app.audio.SfxSequences
import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.GameId
import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.domain.model.Rank
import com.rangepatte.app.domain.model.Suit
import com.rangepatte.app.game.common.TableauCard
import com.rangepatte.app.game.solitaire.SolitaireEngine
import com.rangepatte.app.game.solitaire.SolitaireMove
import com.rangepatte.app.game.solitaire.SolitaireSfx
import com.rangepatte.app.game.solitaire.SolitaireState
import com.rangepatte.app.game.spider.SpiderEngine
import com.rangepatte.app.game.spider.SpiderMove
import com.rangepatte.app.game.spider.SpiderSfx
import com.rangepatte.app.game.spider.SpiderState
import com.rangepatte.app.net.core.GameMachine
import com.rangepatte.app.net.core.GameMachines
import com.rangepatte.app.net.core.MatchConfig
import com.rangepatte.app.net.core.SessionCore
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.random.Random

/** The sound plan: audio settings maths, the asset files, and which effect each game event gets. */
class SoundMappingTest {

    // ---- Settings maths ----------------------------------------------------------------------------

    @Test fun effectiveVolumesCombineMasterCategoryAndSwitch() {
        for (master in listOf(0f, 0.25f, 0.5f, 1f)) for (music in listOf(0f, 0.2f, 1f)) for (game in listOf(0f, 0.8f, 1f))
            for (musicOn in listOf(true, false)) for (gameOn in listOf(true, false)) {
                val s = AudioSettings(master, gameOn, game, musicOn, music)
                assertEquals(if (musicOn) master * music else 0f, s.effectiveMusicVolume, 1e-6f)
                assertEquals(if (gameOn) master * game else 0f, s.effectiveGameSoundVolume, 1e-6f)
            }
    }

    @Test fun masterZeroSilencesEverythingWithoutTouchingTheSwitches() {
        val s = AudioSettings(master = 0f, gameSoundsOn = true, musicOn = true)
        assertEquals(0f, s.effectiveMusicVolume, 0f)
        assertEquals(0f, s.effectiveGameSoundVolume, 0f)
        assertTrue(s.gameSoundsOn && s.musicOn) // still "on": raising the master brings both back
        val back = s.copy(master = 1f)
        assertEquals(AudioSettings.DEFAULT_MUSIC_VOLUME, back.effectiveMusicVolume, 1e-6f)
        assertEquals(AudioSettings.DEFAULT_GAME_SOUND_VOLUME, back.effectiveGameSoundVolume, 1e-6f)
    }

    @Test fun categoriesAreIndependent() {
        val musicOnly = AudioSettings(gameSoundsOn = false, musicOn = true)
        assertEquals(0f, musicOnly.effectiveGameSoundVolume, 0f)
        assertTrue(musicOnly.effectiveMusicVolume > 0f)
        val effectsOnly = AudioSettings(gameSoundsOn = true, musicOn = false)
        assertEquals(0f, effectsOnly.effectiveMusicVolume, 0f)
        assertTrue(effectsOnly.effectiveGameSoundVolume > 0f)
        val silent = AudioSettings(gameSoundsOn = false, musicOn = false)
        assertEquals(0f, silent.effectiveMusicVolume + silent.effectiveGameSoundVolume, 0f)
    }

    @Test fun outOfRangeValuesAreClamped() {
        val s = AudioSettings(master = 3f, gameSoundVolume = -1f, musicVolume = Float.NaN)
        assertEquals(0f, s.effectiveGameSoundVolume, 0f)
        assertEquals(0f, s.effectiveMusicVolume, 0f)
        assertEquals(1f, AudioSettings.clamp(3f), 0f)
    }

    @Test fun defaultsFollowTheMixingAdvice() {
        val s = AudioSettings()
        assertTrue("music about 15-25%", s.musicVolume in 0.15f..0.25f)
        assertTrue("effects about 70-90%", s.gameSoundVolume in 0.7f..0.9f)
    }

    // ---- Assets --------------------------------------------------------------------------------------

    private fun rawDir(): File =
        listOf("src/main/res/raw", "app/src/main/res/raw").map(::File).firstOrNull { it.isDirectory }
            ?: error("res/raw not found from ${File(".").absolutePath}")

    @Test fun allEightEffectFilesArePresentValidWavsWithLegalResourceNames() {
        assertEquals(8, Sfx.entries.size)
        assertEquals("names are unique", Sfx.entries.size, Sfx.entries.map { it.resName }.toSet().size)
        for (sfx in Sfx.entries) {
            assertTrue("${sfx.resName} is not a legal Android resource name", Regex("[a-z][a-z0-9_]*").matches(sfx.resName))
            val file = File(rawDir(), sfx.resName + ".wav")
            assertTrue("missing ${file.path}", file.isFile)
            val head = file.inputStream().use { it.readNBytes(12) }
            assertEquals("RIFF", String(head, 0, 4))
            assertEquals("WAVE", String(head, 8, 4))
            // The recorded length matches what the ducking and sequencing assume (within 60 ms).
            val bytesPerSecond = 44100 * 2
            val seconds = (file.length() - 44).toDouble() / bytesPerSecond
            assertEquals("${sfx.resName} duration", sfx.durationMs / 1000.0, seconds, 0.06)
        }
    }

    @Test fun backgroundMusicFileIfPresentIsRealAudioNotAWebPage() {
        val music = rawDir().listFiles { f -> f.nameWithoutExtension == "surreal_forest" }.orEmpty()
        assertTrue("only one surreal_forest file may exist", music.size <= 1)
        music.forEach { file ->
            val head = file.inputStream().use { it.readNBytes(16) }
            val text = String(head, Charsets.ISO_8859_1)
            assertFalse("${file.name} is a web page, not audio", text.trimStart().startsWith("<") || text.contains("MIME-Version"))
            val id3 = text.startsWith("ID3")
            val frameSync = (head[0].toInt() and 0xFF) == 0xFF && (head[1].toInt() and 0xE0) == 0xE0
            assertTrue("${file.name} does not look like an MP3", id3 || frameSync || text.startsWith("OggS") || text.startsWith("RIFF"))
        }
    }

    // ---- Game events -> effects --------------------------------------------------------------------------

    private class Played<S, A>(val cues: List<SfxCue>, val actions: List<A>) {
        val sounds get() = cues.map { it.sfx }
        fun count(sfx: Sfx) = sounds.count { it == sfx }
    }

    /** Plays one round with computer players through a real [SessionCore], recording every announced cue. */
    private fun <S, A> playRound(machine: GameMachine<S, A>, seed: Long, isRoundEnd: (A) -> Boolean): Played<S, A> {
        val config = MatchConfig(machine.gameId, List(if (machine.gameId == GameId.RUMMY) 3 else 4) { "P$it" }, setOf(0), AiDifficulty.MEDIUM, seed)
        val core = SessionCore(machine, config, 0, true)
        val cues = ArrayList<SfxCue>()
        val actions = ArrayList<A>()
        core.onTransition = { before, after, action -> cues += machine.sfx(before, after, action); if (action != null) actions += action }
        val random = Random(seed)
        repeat(8000) {
            if (core.hasAutoStep()) { core.autoStep(); return@repeat }
            val seat = machine.seatToAct(core.state) ?: error("stuck")
            val action = machine.decideForBot(core.state, seat, AiDifficulty.MEDIUM, random)!!
            if (isRoundEnd(action)) return Played(cues, actions)
            assertTrue(core.hostAccept(seat, action) != null)
        }
        error("round did not finish")
    }

    @Test fun trickGamesSoundEveryPlayEveryTrickAndTheEndOfTheHand() {
        for (id in listOf(GameId.COAT_PIECE, GameId.TWENTY_NINE, GameId.DEHLA_PAKAD, GameId.LAKADI)) {
            val machine = GameMachines.forGame(id)!!
            val played = playRound(machine, 11, isRoundEnd = { machine.encode(it) == "N" })
            val plays = played.actions.count { machine.encode(it).startsWith("P:") }
            assertTrue("$id plays", plays > 0)
            assertEquals("$id: a slide for each card played (or a flip when the trump is revealed)", plays, played.count(Sfx.PRESENT) + played.count(Sfx.REVEAL))
            assertEquals("$id: cards gathered after every trick", plays / 4, played.count(Sfx.COLLECT))
            assertEquals("$id: the hand reveal comes once", 1, played.count(Sfx.HAND_REVEAL))
            assertEquals("$id: the hand reveal is last", Sfx.HAND_REVEAL, played.sounds.last())
            assertEquals("$id: nothing sounds for bids and trump calls", plays + plays / 4 + 1, played.cues.size)
        }
    }

    @Test fun startingTheNextRoundShufflesAndDeals() {
        val machine = GameMachines.forGame(GameId.COAT_PIECE)!!
        assertEquals(SfxSequences.freshMatch(), machine.startSfx())
        assertEquals(listOf(Sfx.RIFFLE, Sfx.DEAL_MANY), machine.startSfx().map { it.sfx })
        assertEquals(listOf(Sfx.SHUFFLE, Sfx.DEAL_MANY), SfxSequences.newRound().map { it.sfx })
        assertTrue(SfxSequences.newRound().zipWithNext().all { (a, b) -> b.delayMs >= a.delayMs })
    }

    @Test fun rummySoundsDrawsDiscardsAndTheDeclaration() {
        val machine = GameMachines.forGame(GameId.RUMMY)!!
        val played = playRound(machine, 5, isRoundEnd = { machine.encode(it) == "N" })
        val codes = played.actions.map { machine.encode(it).substringBefore(':') }
        assertEquals(codes.count { it == "S" }, played.count(Sfx.DEAL_ONE))
        assertEquals(codes.count { it == "D" } + codes.count { it == "X" }, played.count(Sfx.PRESENT))
        assertEquals(1, played.count(Sfx.HAND_REVEAL))
        assertEquals(1, codes.count { it == "E" })
    }

    @Test fun teenPattiSoundsSeeingPackingAndTheShowdown() {
        val machine = GameMachines.forGame(GameId.TEEN_PATTI)!!
        for (seed in 1L..8L) {
            val played = playRound(machine, seed, isRoundEnd = { machine.encode(it) == "NEXT_HAND" })
            val names = played.actions.map { machine.encode(it) }
            assertEquals("seed $seed", names.count { it == "SEE" }, played.count(Sfx.REVEAL))
            assertEquals("seed $seed", names.count { it == "PACK" }, played.count(Sfx.COLLECT))
            assertTrue("seed $seed: at most one hand reveal", played.count(Sfx.HAND_REVEAL) <= 1)
            // chips are not cards: bets make no sound
            assertEquals("seed $seed", names.count { it == "SEE" || it == "PACK" } + played.count(Sfx.HAND_REVEAL), played.cues.size)
        }
    }

    // ---- One announcement per step, on every phone --------------------------------------------------------

    @Test fun everyAcceptedMoveIsAnnouncedOnceEvenWhenDeliveredTwiceAndOutOfOrder() {
        val machine = GameMachines.forGame(GameId.COAT_PIECE)!!
        val config = MatchConfig(machine.gameId, List(4) { "P$it" }, setOf(0, 1), AiDifficulty.MEDIUM, 21)
        val host = SessionCore(machine, config, 0, true)
        val guest = SessionCore(machine, config, 1, false)
        val hostCues = ArrayList<SfxCue>()
        val guestCues = ArrayList<SfxCue>()
        host.onTransition = { b, a, act -> hostCues += machine.sfx(b, a, act) }
        guest.onTransition = { b, a, act -> guestCues += machine.sfx(b, a, act) }
        val random = Random(3)
        val moves = ArrayList<com.rangepatte.app.net.core.Wire.Do>()
        repeat(40) {
            if (host.hasAutoStep()) { host.autoStep(); guest.autoStep(); return@repeat }
            val seat = machine.seatToAct(host.state)!!
            moves += host.hostAccept(seat, machine.decideForBot(host.state, seat, AiDifficulty.MEDIUM, random)!!)!!
        }
        // The guest gets everything late, shuffled, and some of it twice (the same message must not make a second sound).
        (moves.shuffled(random) + moves.take(10)).forEach { guest.receive(it) }
        // Both phones then clear any finished trick themselves.
        while (host.autoStep()) { /* nothing */ }
        while (guest.autoStep()) { /* nothing */ }
        assertEquals(host.seq, guest.seq)
        assertEquals(host.state, guest.state)
        assertEquals("same sounds on both phones", hostCues.map { it.sfx }, guestCues.map { it.sfx })
        assertTrue(moves.isNotEmpty())
        assertEquals(moves.count { it.action.startsWith("P:") }, hostCues.count { it.sfx == Sfx.PRESENT })
    }

    @Test fun undoMakesNoSound() {
        val machine = GameMachines.forGame(GameId.COAT_PIECE)!!
        val config = MatchConfig(machine.gameId, List(4) { "P$it" }, setOf(0), AiDifficulty.EASY, 4)
        val core = SessionCore(machine, config, 0, true)
        var announced = 0
        core.onTransition = { _, _, _ -> announced++ }
        val first = core.state
        core.restore(first)
        assertEquals(0, announced)
    }

    // ---- Solitaire and Spider -----------------------------------------------------------------------------------

    private fun card(rank: Rank, suit: Suit) = PlayingCard(suit, rank)

    private fun solitaire(tableau: List<List<TableauCard>>, stock: List<PlayingCard> = emptyList(), waste: List<PlayingCard> = emptyList()) =
        SolitaireState(stock, waste, List(4) { emptyList() }, tableau, drawCount = 1)

    @Test fun solitaireDrawPlaceAndTurnOverSounds() {
        val game = SolitaireEngine.newGame(1, Random(2))
        val drawn = SolitaireEngine.apply(game, SolitaireMove.Draw)!!
        assertEquals(listOf(Sfx.DEAL_ONE), SolitaireSfx.forMove(SolitaireMove.Draw, game, drawn).map { it.sfx })

        val recycle = solitaire(List(7) { emptyList() }, stock = emptyList(), waste = listOf(card(Rank.FIVE, Suit.CLUBS)))
        val recycled = SolitaireEngine.apply(recycle, SolitaireMove.Draw)!!
        assertEquals(listOf(Sfx.COLLECT), SolitaireSfx.forMove(SolitaireMove.Draw, recycle, recycled).map { it.sfx })

        // An ace goes up and uncovers a face-down card: a slide, then the flip.
        val column = listOf(TableauCard(card(Rank.FIVE, Suit.SPADES), false), TableauCard(card(Rank.ACE, Suit.HEARTS), true))
        val before = solitaire(listOf(column) + List(6) { emptyList() })
        val move = SolitaireMove.TableauToFoundation(0)
        val after = SolitaireEngine.apply(before, move)!!
        val cues = SolitaireSfx.forMove(move, before, after)
        assertEquals(listOf(Sfx.PRESENT, Sfx.REVEAL), cues.map { it.sfx })
        assertTrue("the flip follows the slide", cues[1].delayMs > cues[0].delayMs)

        // A plain move with nothing uncovered is only a slide.
        val plain = solitaire(listOf(listOf(TableauCard(card(Rank.ACE, Suit.HEARTS), true))) + List(6) { emptyList() })
        val plainAfter = SolitaireEngine.apply(plain, move)!!
        assertEquals(listOf(Sfx.PRESENT), SolitaireSfx.forMove(move, plain, plainAfter).map { it.sfx })
        assertEquals(SfxSequences.freshMatch(), SolitaireSfx.forNewGame())
    }

    @Test fun spiderDealAndMoveSounds() {
        val game = SpiderEngine.newGame(1, Random(1))
        val dealt = SpiderEngine.apply(game, SpiderMove.Deal)!!
        assertEquals(listOf(Sfx.DEAL_MANY), SpiderSfx.forMove(SpiderMove.Deal, game, dealt).map { it.sfx })

        val a = card(Rank.NINE, Suit.SPADES)
        val b = card(Rank.TEN, Suit.SPADES)
        val tableau = List(10) { emptyList<TableauCard>() }.toMutableList()
        tableau[0] = listOf(TableauCard(card(Rank.TWO, Suit.SPADES), false), TableauCard(a, true))
        tableau[1] = listOf(TableauCard(b, true))
        val before = SpiderState(tableau, stock = emptyList(), completed = 0, suitCount = 1)
        val move = SpiderMove.MoveRun(0, 1, 1)
        val after = SpiderEngine.apply(before, move)!!
        assertEquals(listOf(Sfx.PRESENT, Sfx.REVEAL), SpiderSfx.forMove(move, before, after).map { it.sfx })
        assertEquals(SfxSequences.freshMatch(), SpiderSfx.forNewGame())
    }
}
