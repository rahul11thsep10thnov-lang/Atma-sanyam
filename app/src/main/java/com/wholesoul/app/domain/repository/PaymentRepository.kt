package com.wholesoul.app.domain.repository

import com.wholesoul.app.domain.model.Payment
import com.wholesoul.app.domain.model.PaymentMethod

/**
 * Mock payment flow today. A real gateway (e.g. Razorpay) implements this same interface
 * later — checkout/payment screens never talk to a gateway SDK directly.
 */
interface PaymentRepository {
    suspend fun pay(orderId: String, amount: Double, method: PaymentMethod): Result<Payment>
}
