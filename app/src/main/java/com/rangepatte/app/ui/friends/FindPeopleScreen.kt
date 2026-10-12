package com.rangepatte.app.ui.friends

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.rangepatte.app.R
import com.rangepatte.app.domain.friends.RelationAction
import com.rangepatte.app.ui.components.royal.RoyalButton
import com.rangepatte.app.ui.components.royal.RoyalButtonStyle
import com.rangepatte.app.ui.components.royal.RoyalTextField
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.ParchmentTextDim

enum class SearchMode { USERNAME, PHONE }

/** What the Find People panel shows: the query, results, and the state of the lookup. */
data class FindPeopleState(
    val mode: SearchMode = SearchMode.USERNAME,
    val query: String = "",
    val results: List<PersonUi> = emptyList(),
    val searching: Boolean = false,
    /** A message to show instead of results (empty / error / rate-limited), already localized. */
    val message: String? = null,
    /** Element 17: the message is an error (shows the plaque with Retry) rather than "nobody found". */
    val isError: Boolean = false,
    val onRetry: () -> Unit = {}
)

/**
 * Find people (approved Design 1): a Name / Mobile number switch as plaques, a gold search field,
 * nameplate rows with the one right action. Stateless: the Friends tab owns the state.
 */
@Composable
fun FindPeoplePanel(
    state: FindPeopleState,
    onModeChange: (SearchMode) -> Unit,
    onQueryChange: (String) -> Unit,
    onSearchPhone: () -> Unit,
    onAction: (PersonUi, RelationAction) -> Unit,
    onOpen: (PersonUi) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            SearchMode.entries.forEach { mode ->
                RoyalButton(
                    text = stringResource(if (mode == SearchMode.USERNAME) R.string.friends_search_by_name else R.string.friends_search_by_phone),
                    onClick = { onModeChange(mode) },
                    style = if (state.mode == mode) RoyalButtonStyle.CRIMSON else RoyalButtonStyle.STEEL,
                    modifier = Modifier.weight(1f)
                )
            }
        }
        if (state.mode == SearchMode.USERNAME) {
            RoyalTextField(value = state.query, onValueChange = onQueryChange, label = stringResource(R.string.friends_search_hint), prefix = "@")
        } else {
            RoyalTextField(
                value = state.query, onValueChange = onQueryChange, label = stringResource(R.string.friends_phone_hint), prefix = "+",
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone)
            )
            RoyalButton(text = stringResource(R.string.friends_lookup), onClick = onSearchPhone, enabled = state.query.length >= 8 && !state.searching, modifier = Modifier.fillMaxWidth())
            Text(stringResource(R.string.friends_phone_privacy), style = MaterialTheme.typography.bodySmall, color = ParchmentTextDim, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
        }
        // Element 17: the page's shape while searching, an invitation when nobody matches, a plaque with Retry on failure.
        if (state.searching) com.rangepatte.app.ui.components.royal.SkeletonRows(count = 2, loadingLabel = stringResource(R.string.friends_loading))
        state.message?.let {
            if (state.isError) com.rangepatte.app.ui.components.royal.ErrorPlaque(stringResource(R.string.state_error_title), it, stringResource(R.string.state_retry), state.onRetry)
            else com.rangepatte.app.ui.components.royal.EmptyState("\uD83D\uDD0D", it, stringResource(R.string.state_search_empty_body))
        }
        state.results.forEach { person -> PersonRow(person, onAction = { onAction(person, it) }, onOpen = { onOpen(person) }) }
    }
}
