package com.atmasanyam.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.atmasanyam.app.domain.model.VideoCard

/** Feed card matching the spec §18 layout: thumbnail, play affordance, title, location, time, source. */
@Composable
fun VideoCardItem(video: VideoCard, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        onClick = onClick,
    ) {
        Column {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
                    .background(Color(0xFF0B1F3A)),
                contentAlignment = Alignment.Center,
            ) {
                if (video.thumbnailUrl != null) {
                    AsyncImage(
                        model = video.thumbnailUrl,
                        contentDescription = video.title,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop,
                    )
                }
                Surface(shape = RoundedCornerShape(50), color = Color.White.copy(alpha = 0.85f)) {
                    Icon(Icons.Default.PlayArrow, contentDescription = "Play", modifier = Modifier.padding(12.dp))
                }
                video.durationSeconds?.let { seconds ->
                    Text(
                        text = formatDuration(seconds),
                        color = Color.White,
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .padding(8.dp)
                            .background(Color.Black.copy(alpha = 0.6f), RoundedCornerShape(4.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp),
                        style = MaterialTheme.typography.labelSmall,
                    )
                }
            }

            Column(modifier = Modifier.padding(12.dp)) {
                Text(video.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, maxLines = 2)
                Spacer(Modifier.height(6.dp))
                val location = listOfNotNull(video.district, video.state).joinToString(", ")
                if (location.isNotBlank()) {
                    Text("📍 $location", style = MaterialTheme.typography.bodyMedium)
                }
                video.publishedAt?.let { Text("🕒 ${relativeTime(it)}", style = MaterialTheme.typography.bodyMedium) }
                if (video.sourceNames.isNotEmpty()) {
                    Text("Source: ${video.sourceNames.joinToString(", ")}", style = MaterialTheme.typography.labelSmall)
                }
            }
        }
    }
}

private fun formatDuration(seconds: Int): String {
    val m = seconds / 60
    val s = seconds % 60
    return "%d:%02d".format(m, s)
}

private fun relativeTime(isoDate: String): String {
    return try {
        val instant = java.time.Instant.parse(isoDate)
        val minutes = java.time.Duration.between(instant, java.time.Instant.now()).toMinutes()
        when {
            minutes < 60 -> "$minutes min ago"
            minutes < 24 * 60 -> "${minutes / 60} hr ago"
            else -> "${minutes / (24 * 60)} d ago"
        }
    } catch (e: Exception) {
        isoDate
    }
}
