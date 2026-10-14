package com.wholesoul.app.data.repository

import com.wholesoul.app.domain.model.Payment
import com.wholesoul.app.domain.model.PaymentMethod
import com.wholesoul.app.domain.model.PaymentStatus
import com.wholesoul.app.domain.repository.PaymentRepository
import kotlinx.coroutines.delay
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Mock payment gateway (spec section 16). Always succeeds after a short simulated delay so
 * the checkout flow can be exercised end-to-end in Development Mode. Replace with a
 * Razorpay/other gateway-backed implementation later — Checkout/Payment screens are
 * unaffected since they only depend on [PaymentRepository].
 */
@Singleton
class MockPaymentRepository @Inject constructor() : PaymentRepository {
    override suspend fun pay(orderId: String, amount: Double, method: PaymentMethod): Result<Payment> {
        delay(900L)
        return Result.success(
            Payment(id = UUID.randomUUID().toString(), orderId = orderId, method = method, amount = amount, status = PaymentStatus.SUCCESS),
        )
    }
}
