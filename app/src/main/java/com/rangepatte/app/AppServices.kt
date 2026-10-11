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
import com.rangepatte.app.data.payment.PaymentGateway
import com.rangepatte.app.data.friends.FirestoreFriendsStore
import com.rangepatte.app.data.friends.FriendsRepository
import com.rangepatte.app.data.friends.LocalFriendsStore
import com.rangepatte.app.data.profile.FirestoreProfileStore
import com.rangepatte.app.data.profile.LocalProfileStore
import com.rangepatte.app.data.profile.ProfileRepository
import com.rangepatte.app.data.payment.PlaceholderPaymentGateway

/**
 * App-wide singletons, created once in [RangEPatteApplication.onCreate]. A tiny hand-rolled
 * service locator — enough for this app's size without pulling in a DI framework.
 */
object AppServices {
    lateinit var membership: MembershipRepository
        private set
    lateinit var account: AccountRepository
        private set
    lateinit var ads: AdsManager
        private set
    /** Username and avatar — the public identity used by the Friends features. */
    lateinit var profile: ProfileRepository
        private set
    /** Friends, requests and blocks of the signed-in player. */
    lateinit var friends: FriendsRepository
        private set

    /** Swap [PlaceholderPaymentGateway] for the real partner's implementation when one is chosen. */
    val paymentGateway: PaymentGateway = PlaceholderPaymentGateway

    /** True when google-services.json was present at build time, so real SMS OTP + online database are on. */
    var isFirebaseConnected: Boolean = false
        private set

    fun init(application: Application) {
        isFirebaseConnected = runCatching {
            FirebaseApp.getApps(application).isNotEmpty() || FirebaseApp.initializeApp(application) != null
        }.getOrDefault(false)

        membership = MembershipRepository(application)
        account = if (isFirebaseConnected) {
            AccountRepository(application, FirebasePhoneAuthService(), FirestoreUserDirectory())
        } else {
            AccountRepository(application, DemoPhoneAuthService(), LocalOnlyUserDirectory)
        }
        profile = ProfileRepository(application, if (isFirebaseConnected) FirestoreProfileStore() else LocalProfileStore(application))
        friends = FriendsRepository(if (isFirebaseConnected) FirestoreFriendsStore() else LocalFriendsStore(application))
        account.onSignedInListener = { uid -> profile.onSignedIn(uid); friends.start(uid) }
        account.onSignedOutListener = { profile.onSignedOut(); friends.stopWatching() }
        account.currentUser.value?.let { profile.onSignedIn(it.uid); friends.start(it.uid) }
        ads = AdsManager(membership)
        GameAudio.init(application)
    }
}
