package com.rangepatte.app.ui.ads

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView
import com.rangepatte.app.AppServices
import com.rangepatte.app.R
import com.rangepatte.app.ui.language.findActivity
import com.rangepatte.app.ui.theme.PanelWoodDark

/**
 * An adaptive AdMob banner across the full width, sized by Google for the current screen.
 * Renders nothing for paid members, or until the ads SDK has started (after consent).
 */
@Composable
fun BannerAdSlot(modifier: Modifier = Modifier) {
    val adFreeUntil by AppServices.membership.adFreeUntilMillis.collectAsState()
    val adsReady by AppServices.ads.adsReady.collectAsState()
    if (!adsReady || adFreeUntil > System.currentTimeMillis()) return

    val activity = LocalContext.current.findActivity() ?: return
    val unitId = stringResource(R.string.admob_banner_unit_id)

    BoxWithConstraints(modifier = modifier.fillMaxWidth().background(PanelWoodDark)) {
        val widthDp = maxWidth.value.toInt()
        val adSize = remember(widthDp) {
            AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(activity, widthDp)
        }
        // Re-create the banner when the available width changes (e.g. rotation).
        key(widthDp) {
            AndroidView(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(adSize.height.dp),
                factory = {
                    AdView(activity).apply {
                        setAdSize(adSize)
                        adUnitId = unitId
                        loadAd(AdRequest.Builder().build())
                    }
                },
                onRelease = { it.destroy() }
            )
        }
    }
}
