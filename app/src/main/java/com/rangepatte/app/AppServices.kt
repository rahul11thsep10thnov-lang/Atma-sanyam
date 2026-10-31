package com.rangepatte.app

import android.app.Application
import com.google.firebase.FirebaseApp
import com.rangepatte.app.audio.GameAudio
import com.rangepatte.app.data.ads.AdsManager
import com.rangepatte.app.data.auth.AccountRepository
import com.rangepatte.app.data.auth.DemoPhoneAuthService
import com.rangepatte.app.data.auth.FirebasePhoneAuthService
import com.rangepatte.app.data.auth.FirestoreUserDirectory
import com.rangepatte.app.data.auth.LocalOnlyUserDirectory
import com.rangepatte.app.data.membership.MembershipRepository
import com.rangepatte.app.data.payment.PlayBilling
import com.rangepatte.app.data.friends.FirestoreFriendsStore
import com.rangepatte.app.data.friends.FriendsRepository
import com.rangepatte.app.data.friends.LocalFriendsStore
import com.rangepatte.app.data.invites.FirestorePlayRequestStore
import com.rangepatte.app.data.invites.LocalPlayRequestStore
import com.rangepatte.app.data.invites.PlayRequestRepository
import com.rangepatte.app.data.presence.FirestorePresenceStore
import com.rangepatte.app.data.presence.LocalPresenceStore
import com.rangepatte.app.data.presence.PresenceRepository
import com.rangepatte.app.data.profile.FirestoreProfileStore
import com.rangepatte.app.data.profile.LocalProfileStore
import com.rangepatte.app.data.profile.ProfileRepository

/**
 * App-wide singletons, created once in [RangEPatteApplication.onCreate]. A tiny hand-rolled
 * service locator — enough for this app's size without pulling in a DI framework.
 */
object AppServices {
    lateinit var membership: MembershipRepository
        private set
    lateinit var account: AccountRepository
        private set
    /** False in a release build that still carries Google's test ad ids: no ads, free Undo, no membership. */
    var adsEnabled: Boolean = false
        private set

    lateinit var ads: AdsManager
        private set
    /** Username and avatar — the public identity used by the Friends features. */
    lateinit var profile: ProfileRepository
        private set
    /** Friends, requests and blocks of the signed-in player. */
    lateinit var friends: FriendsRepository
        private set
    /** Who is online, and what this player is doing for friends to see. */
    lateinit var presence: PresenceRepository
        private set
    /** "Come and play" invitations between friends. */
    lateinit var playRequests: PlayRequestRepository

    /** The notification centre's list (Element 12): derived from relations and play requests, plus posted notices. */
    lateinit var notifications: com.rangepatte.app.data.notifications.NotificationRepository

    /** Pokes (Element 13): cooldowns on the phone, records in `pokes/`, received pokes posted to the centre. */
    lateinit var pokes: com.rangepatte.app.data.pokes.PokeRepository

    /** Poke settings (Element 15): receive / sound / vibration / audience, muted and favourite people. */
    lateinit var pokePrefs: com.rangepatte.app.data.pokes.PokePrefsRepository

    /** My Profile switches (Element 16): play requests on/off, which notices, which friends' online. */
    lateinit var myProfile: com.rangepatte.app.data.profile.MyProfilePrefsRepository

    /** The lifetime Ludo record per account (stage 10). */
    lateinit var ludoRecord: com.rangepatte.app.data.ludo.LudoRecordRepository
    /** The lifetime Moksha Patam record per account. */
    lateinit var snakesRecord: com.rangepatte.app.data.ludo.LudoRecordRepository

    /** Element 17: whether the phone is online (the Friends pages show a band and park sends when not). */
    lateinit var connectivity: com.rangepatte.app.data.net.ConnectivityMonitor
        private set

    /** Google Play Billing: the ad-free subscription (connects in [init]; refreshed whenever the app returns). */
    lateinit var billing: PlayBilling
        private set

    /** True when google-services.json was present at build time, so real SMS OTP + online database are on. */
    var isFirebaseConnected: Boolean = false
        private set

    /**
     * Deletes the signed-in player's account completely (online records, username, relations, pokes, play
     * requests and the sign-in itself) and signs out. A [com.rangepatte.app.data.auth.NeedsRecentLoginException]
     * failure means the data is gone but Firebase wants a fresh sign-in to remove the login: the caller
     * signs out and asks the player to sign in and delete once more.
     */
    fun deleteAccount(onResult: (Result<Unit>) -> Unit) {
        val uid = account.currentUser.value?.uid ?: return onResult(Result.failure(IllegalStateException("not signed in")))
        val username = profile.profile.value?.username
        val service: com.rangepatte.app.data.auth.AccountDeletion =
            if (isFirebaseConnected) com.rangepatte.app.data.auth.FirestoreAccountDeletion()
            else com.rangepatte.app.data.auth.LocalAccountDeletion { done -> profile.deleteProfile(done) }
        service.deleteAll(uid, username) { result ->
            if (result.isSuccess) account.signOut()
            onResult(result)
        }
    }

    fun init(application: Application) {
        isFirebaseConnected = runCatching {
            FirebaseApp.getApps(application).isNotEmpty() || FirebaseApp.initializeApp(application) != null
        }.getOrDefault(false)

        membership = MembershipRepository(application)
        connectivity = com.rangepatte.app.data.net.ConnectivityMonitor(application)
        account = if (isFirebaseConnected) {
            AccountRepository(application, FirebasePhoneAuthService(), FirestoreUserDirectory())
        } else {
            // The demo login (a fixed OTP) is for debug builds only; a release build never offers it.
            val auth: com.rangepatte.app.data.auth.PhoneAuthService =
                if (BuildConfig.DEBUG) DemoPhoneAuthService() else com.rangepatte.app.data.auth.UnavailablePhoneAuthService()
            AccountRepository(application, auth, LocalOnlyUserDirectory)
        }
        profile = ProfileRepository(application, if (isFirebaseConnected) FirestoreProfileStore() else LocalProfileStore(application))
        friends = FriendsRepository(if (isFirebaseConnected) FirestoreFriendsStore() else LocalFriendsStore(application))
        presence = PresenceRepository(application, if (isFirebaseConnected) FirestorePresenceStore() else LocalPresenceStore())
        presence.attach(application)
        friends.onFriendsChanged = presence::follow
        playRequests = PlayRequestRepository(
            if (isFirebaseConnected) FirestorePlayRequestStore() else LocalPlayRequestStore(),
            friendStateOf = presence::stateOf, relationOf = friends::statusOf
        )
        com.rangepatte.app.ui.motion.MotionPrefs.init(application)
        com.rangepatte.app.ui.motion.OrientationPrefs.init(application)
        myProfile = com.rangepatte.app.data.profile.MyProfilePrefsRepository(application)
        ludoRecord = com.rangepatte.app.data.ludo.LudoRecordRepository(application)
        snakesRecord = com.rangepatte.app.data.ludo.LudoRecordRepository(application, "snakes_record")
        playRequests.acceptIncoming = { myProfile.value.value.acceptPlayRequests }
        notifications = com.rangepatte.app.data.notifications.NotificationRepository(application, friends, playRequests, settings = { myProfile.value.value }, presence = presence)
        pokePrefs = com.rangepatte.app.data.pokes.PokePrefsRepository(application, mirror = { uid, data ->
            if (isFirebaseConnected) com.google.firebase.firestore.FirebaseFirestore.getInstance().collection("profiles").document(uid)
                .set(mapOf("pokePrefs" to data), com.google.firebase.firestore.SetOptions.merge())
        })
        pokes = com.rangepatte.app.data.pokes.PokeRepository(
            if (isFirebaseConnected) com.rangepatte.app.data.pokes.FirestorePokeStore() else com.rangepatte.app.data.pokes.LocalPokeStore(),
            notifications, relationOf = friends::statusOf, isOnline = { uid -> presence.stateOf(uid) != com.rangepatte.app.domain.presence.FriendState.OFFLINE },
            prefs = { pokePrefs.value.value }
        )
        account.onSignedInListener = { uid -> profile.onSignedIn(uid); friends.start(uid); presence.onSignedIn(uid); playRequests.start(uid); myProfile.start(uid); notifications.start(uid); pokePrefs.start(uid); pokes.start(uid); ludoRecord.start(uid); snakesRecord.start(uid) }
        account.onSignedOutListener = { profile.onSignedOut(); friends.stopWatching(); presence.onSignedOut(); playRequests.stopWatching(); notifications.stopWatching(); pokes.stopWatching(); pokePrefs.stop(); myProfile.stop(); ludoRecord.stop(); snakesRecord.stop() }
        account.currentUser.value?.let { profile.onSignedIn(it.uid); friends.start(it.uid); presence.onSignedIn(it.uid); playRequests.start(it.uid); myProfile.start(it.uid); notifications.start(it.uid); pokePrefs.start(it.uid); pokes.start(it.uid); ludoRecord.start(it.uid); snakesRecord.start(it.uid) }
        // Ads stay off in a release build until real AdMob ids replace Google's public test ids
        // (res/values/ads_config.xml). With ads off there is nothing to remove, so Undo is free and the
        // "Remove ads" membership is hidden.
        adsEnabled = BuildConfig.DEBUG ||
            application.getString(R.string.admob_app_id) != AdsManager.TEST_APP_ID
        ads = AdsManager(membership)
        billing = PlayBilling(application, membership)
        billing.connect()
        com.rangepatte.app.game.common.UndoGate.isMember = { !adsEnabled || membership.isAdFree() }
        GameAudio.init(application)
    }
}
