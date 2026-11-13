package com.wholesoul.app.presentation.offers

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.wholesoul.app.core.designsystem.WholesoulColors
import com.wholesoul.app.core.designsystem.components.GenericErrorView
import com.wholesoul.app.core.designsystem.components.WholesoulTopBar
import com.wholesoul.app.core.util.UiState
import com.wholesoul.app.domain.model.Offer

@Composable
fun OffersScreen(
    onBack: () -> Unit,
    viewModel: OffersViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    Column(modifier = Modifier.fillMaxSize()) {
        WholesoulTopBar(title = "Offers", onBack = onBack)
        when (val state = uiState) {
            is UiState.Loading -> Unit
            is UiState.Error -> GenericErrorView(onRetry = viewModel::load)
            is UiState.Empty -> GenericErrorView(onRetry = viewModel::load)
            is UiState.Success -> OffersList(state.data)
        }
    }
}

@Composable
private fun OffersList(offers: List<Offer>) {
    LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        items(offers, key = { it.id }) { offer ->
            Card(
                modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = WholesoulColors.PrimaryLight),
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(offer.title, style = MaterialTheme.typography.titleMedium, color = WholesoulColors.Soil)
                    Text(offer.description, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 4.dp))
                    offer.couponCode?.let {
                        Text(
                            "Use code: $it",
                            style = MaterialTheme.typography.labelLarge,
                            color = WholesoulColors.LeafDark,
                            modifier = Modifier.padding(top = 8.dp),
                        )
                    }
                }
            }
        }
    }
}
