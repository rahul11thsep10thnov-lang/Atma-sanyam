package com.rangepatte.app

import android.app.Application
import com.google.firebase.FirebaseApp
import com.rangepatte.app.data.ads.AdsManager
import com.rangepatte.app.data.auth.AccountRepository
import com.rangepatte.app.data.auth.DemoPhoneAuthService
import com.rangepatte.app.data.auth.FirebasePhoneAuthService
import com.rangepatte.app.data.auth.FirestoreUserDirectory
import com.rangepatte.app.data.auth.LocalOnlyUserDirectory
import com.rangepatte.app.data.membership.MembershipRepository
import com.rangepatte.app.data.payment.PaymentGateway
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
        ads = AdsManager(membership)
    }
}
