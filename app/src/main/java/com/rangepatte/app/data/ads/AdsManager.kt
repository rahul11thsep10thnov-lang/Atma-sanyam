package com.rangepatte.app.data.ads

import android.app.Activity
import android.content.Context
import android.os.SystemClock
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback
import com.google.android.ump.ConsentRequestParameters
import com.google.android.ump.UserMessagingPlatform
import com.rangepatte.app.R
import com.rangepatte.app.data.membership.MembershipRepository
import com.rangepatte.app.game.common.RewardOutcome
import com.rangepatte.app.game.common.UndoGate
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Google AdMob for the whole app.
 *
 * - **Banner** ads sit at the bottom of every screen (see `ui/ads/BannerAdSlot`).
 * - **Interstitial** (full-screen) ads may show when a player leaves a game table — at most every
 *   [EXITS_PER_INTERSTITIAL]th exit and never twice within [MIN_INTERSTITIAL_GAP_MS], so they stay
 *   tolerable.
 * - **Rewarded** ads unlock Undo for one game ([showRewarded]); they count only when watched to the end
 *   and on screen for at least [UndoGate.MIN_AD_MS].
 * - Nothing is loaded or shown while the player is a paid member ([MembershipRepository.isAdFree]).
 * - Google's consent form (UMP) is shown first where the law requires it (EEA/UK); ads start only
 *   once consent allows them.
 */
class AdsManager(private val membership: MembershipRepository) {
    private val started = AtomicBoolean(false)
    private val _adsReady = MutableStateFlow(false)

    /** True once the Mobile Ads SDK is initialised and ads may be requested. */
    val adsReady: StateFlow<Boolean> = _adsReady.asStateFlow()

    private var interstitial: InterstitialAd? = null
    private var interstitialLoading = false
    private var exitsSinceLastInterstitial = 0
    private var lastInterstitialAt = 0L

    /** Call once from the Activity: asks for consent if needed, then starts the ads SDK. */
    fun start(activity: Activity) {
        if (!com.rangepatte.app.AppServices.adsEnabled || membership.isAdFree()) return
        val consentInformation = UserMessagingPlatform.getConsentInformation(activity)
        consentInformation.requestConsentInfoUpdate(
            activity,
            ConsentRequestParameters.Builder().build(),
            {
                UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity) {
                    if (consentInformation.canRequestAds()) initializeSdk(activity)
                }
            },
            { if (consentInformation.canRequestAds()) initializeSdk(activity) }
        )
        // Consent given in an earlier session: start immediately.
        if (consentInformation.canRequestAds()) initializeSdk(activity)
    }

    private fun initializeSdk(activity: Activity) {
        if (!started.compareAndSet(false, true)) return
        val appContext = activity.applicationContext
        MobileAds.initialize(appContext) {
            _adsReady.value = true
            preloadInterstitial(appContext)
            preloadRewarded(appContext, onLoaded = null)
        }
    }

    private fun preloadInterstitial(context: Context) {
        if (!_adsReady.value || membership.isAdFree() || interstitial != null || interstitialLoading) return
        interstitialLoading = true
        InterstitialAd.load(
            context,
            context.getString(R.string.admob_interstitial_unit_id),
            AdRequest.Builder().build(),
            object : InterstitialAdLoadCallback() {
                override fun onAdLoaded(ad: InterstitialAd) {
                    interstitial = ad
                    interstitialLoading = false
                }

                override fun onAdFailedToLoad(error: LoadAdError) {
                    interstitial = null
                    interstitialLoading = false
                }
            }
        )
    }

    private var rewarded: RewardedAd? = null
    private var rewardedLoading = false
    private var rewardedWaiter: ((RewardedAd?) -> Unit)? = null

    private fun preloadRewarded(context: Context, onLoaded: ((RewardedAd?) -> Unit)?) {
        if (onLoaded != null) rewardedWaiter = onLoaded
        if (!_adsReady.value || rewarded != null || rewardedLoading) return
        rewardedLoading = true
        RewardedAd.load(
            context,
            context.getString(R.string.admob_rewarded_unit_id),
            AdRequest.Builder().build(),
            object : RewardedAdLoadCallback() {
                override fun onAdLoaded(ad: RewardedAd) {
                    rewardedLoading = false
                    val waiter = rewardedWaiter
                    rewardedWaiter = null
                    if (waiter != null) waiter(ad) else rewarded = ad
                }

                override fun onAdFailedToLoad(error: LoadAdError) {
                    rewardedLoading = false
                    rewarded = null
                    rewardedWaiter?.invoke(null)
                    rewardedWaiter = null
                }
            }
        )
    }

    /**
     * Shows a rewarded ad to unlock Undo and reports how it ended: [RewardOutcome.EARNED] only when the
     * reward was granted and the ad stayed on screen for [UndoGate.MIN_AD_MS] or more.
     */
    fun showRewarded(activity: Activity, onDone: (RewardOutcome) -> Unit) {
        if (!_adsReady.value) { onDone(RewardOutcome.UNAVAILABLE); return }
        val ready = rewarded
        if (ready != null) {
            rewarded = null
            present(activity, ready, onDone)
        } else {
            preloadRewarded(activity.applicationContext) { ad ->
                if (ad == null) onDone(RewardOutcome.UNAVAILABLE) else present(activity, ad, onDone)
            }
        }
    }

    private fun present(activity: Activity, ad: RewardedAd, onDone: (RewardOutcome) -> Unit) {
        var earned = false
        var shownAt = 0L
        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdShowedFullScreenContent() { shownAt = SystemClock.elapsedRealtime() }

            override fun onAdDismissedFullScreenContent() {
                val watched = if (shownAt == 0L) 0L else SystemClock.elapsedRealtime() - shownAt
                preloadRewarded(activity.applicationContext, onLoaded = null)
                onDone(UndoGate.outcome(earned, watched))
            }

            override fun onAdFailedToShowFullScreenContent(error: AdError) {
                preloadRewarded(activity.applicationContext, onLoaded = null)
                onDone(RewardOutcome.UNAVAILABLE)
            }
        }
        ad.show(activity) { earned = true }
    }

    /**
     * Called when the player leaves a game table. Shows a full-screen ad if one is due, then runs
     * [onFinished] (immediately when no ad is shown).
     */
    fun onGameExit(activity: Activity, onFinished: () -> Unit) {
        exitsSinceLastInterstitial++
        val ad = interstitial
        val now = SystemClock.elapsedRealtime()
        val due = exitsSinceLastInterstitial >= EXITS_PER_INTERSTITIAL &&
            (lastInterstitialAt == 0L || now - lastInterstitialAt >= MIN_INTERSTITIAL_GAP_MS)
        if (ad == null || !due || membership.isAdFree()) {
            preloadInterstitial(activity.applicationContext)
            onFinished()
            return
        }
        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdDismissedFullScreenContent() {
                interstitial = null
                preloadInterstitial(activity.applicationContext)
                onFinished()
            }

            override fun onAdFailedToShowFullScreenContent(error: AdError) {
                interstitial = null
                onFinished()
            }
        }
        exitsSinceLastInterstitial = 0
        lastInterstitialAt = now
        ad.show(activity)
    }

    companion object {
        /** Google's public sample app id; real ids must replace it before ads are switched on. */
        const val TEST_APP_ID = "ca-app-pub-3940256099942544~3347511713"

        private const val EXITS_PER_INTERSTITIAL = 2
        private const val MIN_INTERSTITIAL_GAP_MS = 120_000L
    }
}
