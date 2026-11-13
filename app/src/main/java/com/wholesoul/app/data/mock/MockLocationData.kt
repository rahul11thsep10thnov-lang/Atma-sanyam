package com.wholesoul.app.data.mock

import com.wholesoul.app.domain.model.ServiceableArea

/**
 * Manual location hierarchy + a configurable serviceable-PIN-code list (spec section 32).
 * There is no geocoding involved: a PIN code either appears in [serviceableAreas] or it
 * doesn't. Extend this list to add new delivery areas.
 */
object MockLocationData {

    val countries = listOf("India")

    val statesByCountry = mapOf(
        "India" to listOf("Maharashtra", "Delhi", "Karnataka", "Tamil Nadu", "Uttar Pradesh", "West Bengal", "Gujarat", "Telangana"),
    )

    val citiesByState = mapOf(
        "Maharashtra" to listOf("Mumbai", "Pune", "Nagpur", "Nashik"),
        "Delhi" to listOf("New Delhi"),
        "Karnataka" to listOf("Bengaluru", "Mysuru"),
        "Tamil Nadu" to listOf("Chennai", "Coimbatore"),
        "Uttar Pradesh" to listOf("Lucknow", "Noida"),
        "West Bengal" to listOf("Kolkata"),
        "Gujarat" to listOf("Ahmedabad", "Surat"),
        "Telangana" to listOf("Hyderabad"),
    )

    val serviceableAreas: List<ServiceableArea> = listOf(
        ServiceableArea("400001", "Mumbai", "Maharashtra", true),
        ServiceableArea("400050", "Mumbai", "Maharashtra", true),
        ServiceableArea("400058", "Mumbai", "Maharashtra", true),
        ServiceableArea("411001", "Pune", "Maharashtra", true),
        ServiceableArea("411014", "Pune", "Maharashtra", true),
        ServiceableArea("440001", "Nagpur", "Maharashtra", true),
        ServiceableArea("422001", "Nashik", "Maharashtra", true),
        ServiceableArea("110001", "New Delhi", "Delhi", true),
        ServiceableArea("110016", "New Delhi", "Delhi", true),
        ServiceableArea("110024", "New Delhi", "Delhi", true, "Delivery in 30-60 mins"),
        ServiceableArea("560001", "Bengaluru", "Karnataka", true),
        ServiceableArea("560034", "Bengaluru", "Karnataka", true),
        ServiceableArea("570001", "Mysuru", "Karnataka", true),
        ServiceableArea("600001", "Chennai", "Tamil Nadu", true),
        ServiceableArea("641001", "Coimbatore", "Tamil Nadu", true),
        ServiceableArea("226001", "Lucknow", "Uttar Pradesh", true),
        ServiceableArea("201301", "Noida", "Uttar Pradesh", true),
        ServiceableArea("700001", "Kolkata", "West Bengal", true),
        ServiceableArea("380001", "Ahmedabad", "Gujarat", true),
        ServiceableArea("395001", "Surat", "Gujarat", true),
        ServiceableArea("500001", "Hyderabad", "Telangana", true),
    )
}
