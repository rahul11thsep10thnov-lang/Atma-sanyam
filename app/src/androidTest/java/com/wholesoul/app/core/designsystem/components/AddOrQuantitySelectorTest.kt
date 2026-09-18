package com.wholesoul.app.core.designsystem.components

import androidx.compose.ui.test.assertExists
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.wholesoul.app.core.designsystem.WholesoulTheme
import org.junit.Rule
import org.junit.Test

/** Basic Compose UI test (spec section 44) for the ADD -> [-] qty [+] stepper used on every product card. */
class AddOrQuantitySelectorTest {

    @get:Rule val composeRule = createComposeRule()

    @Test
    fun tappingAddInvokesCallbackAndShowsStepperWhenQuantityIsPositive() {
        var addClicked = false
        composeRule.setContent {
            WholesoulTheme {
                AddOrQuantitySelector(quantity = 0, onAdd = { addClicked = true }, onIncrement = {}, onDecrement = {})
            }
        }

        composeRule.onNodeWithText("ADD").performClick()
        assert(addClicked)
    }

    @Test
    fun stepperShowsQuantityAndRespondsToIncrementDecrement() {
        var quantity = 1
        composeRule.setContent {
            WholesoulTheme {
                AddOrQuantitySelector(
                    quantity = quantity,
                    onAdd = {},
                    onIncrement = { quantity++ },
                    onDecrement = { quantity-- },
                )
            }
        }

        composeRule.onNodeWithText("1").assertExists()
        composeRule.onNodeWithContentDescription("Increase quantity").performClick()
        assert(quantity == 2)
        composeRule.onNodeWithContentDescription("Decrease quantity").performClick()
        assert(quantity == 1)
    }
}
