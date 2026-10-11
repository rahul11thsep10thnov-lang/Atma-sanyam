package com.rangepatte.app.data.friends

import android.content.Context
import android.util.Log
import androidx.core.content.edit
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.Query
import com.rangepatte.app.domain.friends.Relation
import com.rangepatte.app.domain.friends.RelationAction
import com.rangepatte.app.domain.friends.RelationStatus
import com.rangepatte.app.domain.friends.Relations
import com.rangepatte.app.domain.profile.Username
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.security.MessageDigest

/** Another player as the Friends screens show them: public fields only, never a phone number. */
data class Person(val uid: String, val username: String, val avatarId: String?)

/** Where relations and public profiles live. */
interface FriendsStore {
    /** Streams every relation that involves [uid]. Returns a function that stops listening. */
    fun watchRelations(uid: String, onChange: (List<Relation>) -> Unit): () -> Unit
    fun searchByUsername(prefix: String, limit: Int, onResult: (Result<List<Person>>) -> Unit)
    /** Exact match on a full E.164 number, only for players who allow it. */
    fun lookupByPhone(phoneE164: String, onResult: (Result<Person?>) -> Unit)
    fun people(uids: Collection<String>, onResult: (Result<Map<String, Person>>) -> Unit)
    /** Applies [action] atomically against the current record (see [Relations.apply]). */
    fun act(me: String, other: String, action: RelationAction, onResult: (Result<Unit>) -> Unit)
}

/**
 * The signed-in player's relations, kept current from the store. Screens read [relations] and
 * [people]; every change goes through [act], which the store validates against the current record so
 * a late tap or a duplicate message can never create a half-state.
 */
class FriendsRepository(private val store: FriendsStore) {
    private val _relations = MutableStateFlow<List<Relation>>(emptyList())
    val relations: StateFlow<List<Relation>> = _relations.asStateFlow()

    private val _people = MutableStateFlow<Map<String, Person>>(emptyMap())
    val people: StateFlow<Map<String, Person>> = _people.asStateFlow()

    private var me: String? = null
    private var stop: (() -> Unit)? = null
    private val lookupTimes = ArrayDeque<Long>()

    fun start(uid: String) {
        if (me == uid) return
        stopWatching()
        me = uid
        stop = store.watchRelations(uid) { list ->
            _relations.value = list
            val missing = list.map { it.other(uid) }.filter { it !in _people.value }
            if (missing.isNotEmpty()) store.people(missing) { r -> r.onSuccess { _people.value = _people.value + it } }
        }
    }

    fun stopWatching() {
        stop?.invoke(); stop = null; me = null
        _relations.value = emptyList()
    }

    fun statusOf(other: String): RelationStatus {
        val uid = me ?: return RelationStatus.NONE
        return _relations.value.firstOrNull { it.involves(other) }?.statusFor(uid) ?: RelationStatus.NONE
    }

    fun friends(): List<Person> = relations.value.filter { it.kind == Relation.Kind.FRIENDS }
        .mapNotNull { people.value[it.other(me ?: return emptyList())] }

    fun search(prefix: String, onResult: (Result<List<Person>>) -> Unit) {
        val uid = me
        store.searchByUsername(Username.normalize(prefix), 20) { r ->
            onResult(r.map { list -> list.filter { it.uid != uid && statusOf(it.uid) != RelationStatus.BLOCKED_ME } })
        }
    }

    /** Phone lookups are limited to [PHONE_LOOKUPS_PER_MINUTE] so nobody can walk through numbers. */
    fun lookupByPhone(phoneE164: String, onResult: (Result<Person?>) -> Unit) {
        val now = System.currentTimeMillis()
        while (lookupTimes.isNotEmpty() && now - lookupTimes.first() > 60_000) lookupTimes.removeFirst()
        if (lookupTimes.size >= PHONE_LOOKUPS_PER_MINUTE) return onResult(Result.failure(RateLimited()))
        lookupTimes.addLast(now)
        store.lookupByPhone(phoneE164) { r -> onResult(r.map { p -> p?.takeIf { it.uid != me && statusOf(it.uid) != RelationStatus.BLOCKED_ME } }) }
    }

    fun act(other: String, action: RelationAction, onResult: (Result<Unit>) -> Unit = {}) {
        val uid = me ?: return onResult(Result.failure(IllegalStateException("not signed in")))
        store.act(uid, other, action, onResult)
    }

    fun remember(person: Person) { _people.value = _people.value + (person.uid to person) }

    class RateLimited : Exception("Too many lookups; wait a minute")

    companion object { const val PHONE_LOOKUPS_PER_MINUTE = 5 }
}

/**
 * Demo mode: a handful of pretend players on this phone, so Find People, requests and the Friends tab
 * can be tried without Firebase. "priya_q" answers requests after a moment; nobody else does.
 */
class LocalFriendsStore(context: Context) : FriendsStore {
    private val prefs = context.getSharedPreferences("friends_demo", Context.MODE_PRIVATE)
    private val demo = listOf(
        Person("demo-9000000001", "priya_q", "av_11"), Person("demo-9000000002", "rahul29", "av_01"),
        Person("demo-9000000003", "dev_plays", "av_09"), Person("demo-9000000004", "asha_k", "av_14"),
        Person("demo-9000000005", "vikram_taash", "av_07"), Person("demo-9000000006", "nisha_s", "av_12")
    )
    private val listeners = HashMap<String, (List<Relation>) -> Unit>()

    private fun all(): List<Relation> = prefs.all.keys.filter { it.startsWith("r:") }.mapNotNull { key ->
        prefs.getString(key, null)?.split("|")?.takeIf { it.size == 4 }?.let { Relation(it[0], it[1], Relation.Kind.valueOf(it[2]), it[3]) }
    }

    private fun publish() { val list = all(); listeners.forEach { (uid, cb) -> cb(list.filter { it.involves(uid) }) } }

    override fun watchRelations(uid: String, onChange: (List<Relation>) -> Unit): () -> Unit {
        listeners[uid] = onChange
        onChange(all().filter { it.involves(uid) })
        return { listeners.remove(uid) }
    }

    override fun searchByUsername(prefix: String, limit: Int, onResult: (Result<List<Person>>) -> Unit) =
        onResult(Result.success(demo.filter { it.username.startsWith(prefix) }.take(limit)))

    override fun lookupByPhone(phoneE164: String, onResult: (Result<Person?>) -> Unit) =
        onResult(Result.success(demo.firstOrNull { phoneE164.endsWith(it.uid.takeLast(10)) }))

    override fun people(uids: Collection<String>, onResult: (Result<Map<String, Person>>) -> Unit) =
        onResult(Result.success(demo.filter { it.uid in uids }.associateBy { it.uid }))

    override fun act(me: String, other: String, action: RelationAction, onResult: (Result<Unit>) -> Unit) {
        val id = Relations.pairId(me, other)
        val current = all().firstOrNull { Relations.pairId(it.a, it.b) == id }
        val outcome = Relations.apply(current, me, other, action) ?: return onResult(Result.failure(IllegalStateException("not allowed now")))
        prefs.edit { val r = outcome.relation; if (r == null) remove("r:$id") else putString("r:$id", "${r.a}|${r.b}|${r.kind}|${r.by}") }
        publish()
        onResult(Result.success(Unit))
        // The pretend player priya_q accepts a request two seconds later, so the whole flow can be seen.
        if (action == RelationAction.ADD_FRIEND && other == demo[0].uid) {
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                val now = all().firstOrNull { Relations.pairId(it.a, it.b) == id }
                Relations.apply(now, other, me, RelationAction.ACCEPT)?.relation?.let { r ->
                    prefs.edit { putString("r:$id", "${r.a}|${r.b}|${r.kind}|${r.by}") }; publish()
                }
            }, 2000)
        }
    }
}

/**
 * Firestore. `relations/{pairId}` = {a, b, kind, by, updatedAt}; changes go through a transaction that
 * re-reads the record and applies [Relations.apply], so the rules hold even if two phones act at once.
 * `profiles` is searched by `usernameLower` prefix; phone discovery matches `phoneHash` (SHA-256 of the
 * E.164 number), which a profile only carries when its owner turned "find me by my number" on.
 */
class FirestoreFriendsStore : FriendsStore {
    private val db get() = FirebaseFirestore.getInstance()

    private fun person(doc: com.google.firebase.firestore.DocumentSnapshot): Person? {
        val name = doc.getString("username") ?: return null
        return Person(doc.id, name, doc.getString("avatarId"))
    }

    private fun relation(doc: com.google.firebase.firestore.DocumentSnapshot): Relation? = runCatching {
        Relation(doc.getString("a")!!, doc.getString("b")!!, Relation.Kind.valueOf(doc.getString("kind")!!), doc.getString("by")!!)
    }.getOrNull()

    override fun watchRelations(uid: String, onChange: (List<Relation>) -> Unit): () -> Unit {
        val asA = HashMap<String, Relation>(); val asB = HashMap<String, Relation>()
        fun emit() = onChange((asA.values + asB.values).distinctBy { Relations.pairId(it.a, it.b) })
        val regs = ArrayList<ListenerRegistration>()
        for ((field, bucket) in listOf("a" to asA, "b" to asB)) {
            regs += db.collection("relations").whereEqualTo(field, uid).addSnapshotListener { snap, e ->
                if (e != null) { Log.w("Friends", "relations listener", e); return@addSnapshotListener }
                bucket.clear(); snap?.documents?.mapNotNull(::relation)?.forEach { bucket[Relations.pairId(it.a, it.b)] = it }
                emit()
            }
        }
        return { regs.forEach { it.remove() } }
    }

    override fun searchByUsername(prefix: String, limit: Int, onResult: (Result<List<Person>>) -> Unit) {
        db.collection("profiles").orderBy("usernameLower").startAt(prefix).endAt(prefix + "").limit(limit.toLong()).get()
            .addOnSuccessListener { onResult(Result.success(it.documents.mapNotNull(::person))) }
            .addOnFailureListener { onResult(Result.failure(it)) }
    }

    override fun lookupByPhone(phoneE164: String, onResult: (Result<Person?>) -> Unit) {
        db.collection("profiles").whereEqualTo("phoneHash", phoneHash(phoneE164)).limit(1).get()
            .addOnSuccessListener { onResult(Result.success(it.documents.firstOrNull()?.let(::person))) }
            .addOnFailureListener { onResult(Result.failure(it)) }
    }

    override fun people(uids: Collection<String>, onResult: (Result<Map<String, Person>>) -> Unit) {
        val ids = uids.distinct()
        if (ids.isEmpty()) return onResult(Result.success(emptyMap()))
        val out = HashMap<String, Person>(); var left = (ids.size + 9) / 10; var failed: Throwable? = null
        ids.chunked(10).forEach { chunk ->
            db.collection("profiles").whereIn(com.google.firebase.firestore.FieldPath.documentId(), chunk).get()
                .addOnSuccessListener { it.documents.mapNotNull(::person).forEach { p -> out[p.uid] = p } }
                .addOnFailureListener { failed = it }
                .addOnCompleteListener { if (--left == 0) onResult(failed?.let { Result.failure(it) } ?: Result.success(out)) }
        }
    }

    override fun act(me: String, other: String, action: RelationAction, onResult: (Result<Unit>) -> Unit) {
        val ref = db.collection("relations").document(Relations.pairId(me, other))
        db.runTransaction { tx ->
            val current = tx.get(ref).takeIf { it.exists() }?.let(::relation)
            val outcome = Relations.apply(current, me, other, action) ?: throw IllegalStateException("not allowed now")
            val r = outcome.relation
            if (r == null) tx.delete(ref)
            else tx.set(ref, mapOf("a" to r.a, "b" to r.b, "kind" to r.kind.name, "by" to r.by, "updatedAt" to FieldValue.serverTimestamp()))
            null
        }.addOnSuccessListener { onResult(Result.success(Unit)) }.addOnFailureListener { onResult(Result.failure(it)) }
    }

    companion object {
        fun phoneHash(phoneE164: String): String =
            MessageDigest.getInstance("SHA-256").digest(phoneE164.toByteArray()).joinToString("") { "%02x".format(it) }
    }
}
