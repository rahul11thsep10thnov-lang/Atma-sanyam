package com.atmasanyam.app.ui.player

import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import com.atmasanyam.app.R

@Composable
fun VideoPlayerScreen(
    onOpenStoryDetail: (String) -> Unit,
    onBack: () -> Unit,
    viewModel: VideoPlayerViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    var isMuted by remember { mutableStateOf(false) }
    var showReportDialog by remember { mutableStateOf(false) }

    val exoPlayer = remember { ExoPlayer.Builder(context).build() }

    LaunchedEffect(uiState.manifest, uiState.captionsEnabled) {
        val manifest = uiState.manifest ?: return@LaunchedEffect
        val playbackUrl = manifest.playbackUrl ?: return@LaunchedEffect

        val mediaItemBuilder = MediaItem.Builder().setUri(Uri.parse(playbackUrl))
        if (uiState.captionsEnabled && manifest.subtitleUrl != null) {
            val subtitle = MediaItem.SubtitleConfiguration.Builder(Uri.parse(manifest.subtitleUrl))
                .setMimeType(MimeTypes.TEXT_VTT)
                .setLanguage(manifest.languageCode)
                .build()
            mediaItemBuilder.setSubtitleConfigurations(listOf(subtitle))
        }
        exoPlayer.setMediaItem(mediaItemBuilder.build())
        exoPlayer.prepare()
        exoPlayer.playWhenReady = true
    }

    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_PAUSE -> {
                    viewModel.recordView((exoPlayer.currentPosition / 1000).toInt())
                    exoPlayer.pause()
                }
                Lifecycle.Event.ON_RESUME -> exoPlayer.play()
                else -> Unit
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
            viewModel.recordView((exoPlayer.currentPosition / 1000).toInt())
            exoPlayer.release()
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        if (uiState.manifest?.playbackUrl != null) {
            AndroidView(
                modifier = Modifier.fillMaxSize(),
                factory = { ctx ->
                    PlayerView(ctx).apply {
                        player = exoPlayer
                        useController = true
                    }
                },
                update = { it.player?.volume = if (isMuted) 0f else 1f },
            )
        } else if (uiState.isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        } else {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(uiState.error ?: stringResource(R.string.video_unavailable))
            }
        }

        // Top bar: back + language/captions controls
        Row(
            modifier = Modifier
                .align(Alignment.TopStart)
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = androidx.compose.ui.graphics.Color.White) }
            Row {
                IconButton(onClick = { isMuted = !isMuted }) {
                    Icon(
                        if (isMuted) Icons.Default.VolumeOff else Icons.Default.VolumeUp,
                        contentDescription = "Mute",
                        tint = androidx.compose.ui.graphics.Color.White,
                    )
                }
                IconButton(onClick = { viewModel.toggleCaptions() }) {
                    Icon(Icons.Default.ClosedCaption, contentDescription = "Captions", tint = androidx.compose.ui.graphics.Color.White)
                }
            }
        }

        // Bottom action bar: like / save / share / report / source & details
        uiState.manifest?.let { manifest ->
            Surface(
                modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth(),
                color = androidx.compose.ui.graphics.Color.Black.copy(alpha = 0.55f),
            ) {
                Column(Modifier.padding(12.dp)) {
                    Text(manifest.title, color = androidx.compose.ui.graphics.Color.White, style = MaterialTheme.typography.titleMedium)
                    Text(manifest.aiDisclosure, color = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.8f), style = MaterialTheme.typography.labelSmall)
                    Row(horizontalArrangement = Arrangement.SpaceEvenly, modifier = Modifier.fillMaxWidth()) {
                        TextButton(onClick = { viewModel.like() }) { Text(stringResource(R.string.action_like), color = androidx.compose.ui.graphics.Color.White) }
                        TextButton(onClick = { viewModel.save() }) { Text(stringResource(R.string.action_save), color = androidx.compose.ui.graphics.Color.White) }
                        TextButton(onClick = { viewModel.share(null) }) { Text(stringResource(R.string.action_share), color = androidx.compose.ui.graphics.Color.White) }
                        TextButton(onClick = { onOpenStoryDetail(manifest.masterStoryId) }) { Text(stringResource(R.string.action_source), color = androidx.compose.ui.graphics.Color.White) }
                        TextButton(onClick = { showReportDialog = true }) { Text(stringResource(R.string.action_report), color = androidx.compose.ui.graphics.Color.White) }
                    }
                }
            }
        }
    }

    if (showReportDialog) {
        AlertDialog(
            onDismissRequest = { showReportDialog = false },
            title = { Text(stringResource(R.string.action_report)) },
            text = { Text(stringResource(R.string.report_confirmation)) },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.report("FACTUALLY_INCORRECT", null)
                    showReportDialog = false
                }) { Text(stringResource(R.string.action_report)) }
            },
            dismissButton = { TextButton(onClick = { showReportDialog = false }) { Text(stringResource(R.string.cancel)) } },
        )
    }
}
