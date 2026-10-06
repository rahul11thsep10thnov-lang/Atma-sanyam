package com.rangepatte.app.net.nearby

import android.content.Context
import com.google.android.gms.nearby.Nearby
import com.google.android.gms.nearby.connection.AdvertisingOptions
import com.google.android.gms.nearby.connection.ConnectionInfo
import com.google.android.gms.nearby.connection.ConnectionLifecycleCallback
import com.google.android.gms.nearby.connection.ConnectionResolution
import com.google.android.gms.nearby.connection.ConnectionsClient
import com.google.android.gms.nearby.connection.DiscoveredEndpointInfo
import com.google.android.gms.nearby.connection.DiscoveryOptions
import com.google.android.gms.nearby.connection.EndpointDiscoveryCallback
import com.google.android.gms.nearby.connection.Payload
import com.google.android.gms.nearby.connection.PayloadCallback
import com.google.android.gms.nearby.connection.PayloadTransferUpdate
import com.google.android.gms.nearby.connection.Strategy
import com.rangepatte.app.net.Transport

/**
 * Carries table messages between phones that are close to each other, over Bluetooth and Wi-Fi, with
 * no internet — Google's Nearby Connections in "star" mode: the host advertises, guests discover it and
 * connect, and every guest talks only to the host.
 *
 * What the lobby screen needs to know (a host was found, someone connected, something failed) is
 * reported through [events]; table messages arrive through [listener].
 */
class NearbyTransport(
    context: Context,
    private val displayName: String,
    private val maxGuests: Int = 5
) : Transport {

    interface Events {
        /** A table is being offered nearby ([advertisedName] is "Name|GAME"). Guests only. */
        fun onHostFound(endpointId: String, advertisedName: String)
        fun onHostLost(endpointId: String)
        /** A connection is ready for messages: for the host, a guest; for a guest, the host. */
        fun onConnected(endpointId: String)
        fun onFailure(message: String)
    }

    private val client: ConnectionsClient = Nearby.getConnectionsClient(context.applicationContext)
    private val connected = LinkedHashSet<String>()

    override var listener: Transport.Listener? = null
    var events: Events? = null

    private val payloadCallback = object : PayloadCallback() {
        override fun onPayloadReceived(endpointId: String, payload: Payload) {
            val bytes = payload.asBytes() ?: return
            listener?.onMessage(endpointId, String(bytes, Charsets.UTF_8))
        }

        override fun onPayloadTransferUpdate(endpointId: String, update: PayloadTransferUpdate) = Unit
    }

    private val connectionCallback = object : ConnectionLifecycleCallback() {
        override fun onConnectionInitiated(endpointId: String, info: ConnectionInfo) {
            // Both sides accept; whether a guest is let in is decided by the lobby (it can Reject).
            if (asHost && connected.size >= maxGuests) client.rejectConnection(endpointId)
            else client.acceptConnection(endpointId, payloadCallback)
        }

        override fun onConnectionResult(endpointId: String, result: ConnectionResolution) {
            if (result.status.isSuccess) {
                connected += endpointId
                events?.onConnected(endpointId)
            } else {
                events?.onFailure("Could not connect (${result.status.statusCode})")
            }
        }

        override fun onDisconnected(endpointId: String) {
            if (connected.remove(endpointId)) listener?.onPeerLost(endpointId)
        }
    }

    private val discoveryCallback = object : EndpointDiscoveryCallback() {
        override fun onEndpointFound(endpointId: String, info: DiscoveredEndpointInfo) {
            events?.onHostFound(endpointId, info.endpointName)
        }

        override fun onEndpointLost(endpointId: String) {
            events?.onHostLost(endpointId)
        }
    }

    private var asHost = false

    /** Host: make this table visible to phones nearby. [advertisedName] should be "Name|GAME". */
    fun startAdvertising(advertisedName: String) {
        asHost = true
        client.startAdvertising(
            advertisedName,
            SERVICE_ID,
            connectionCallback,
            AdvertisingOptions.Builder().setStrategy(Strategy.P2P_STAR).build()
        ).addOnFailureListener { events?.onFailure(it.message ?: "Could not start the table") }
    }

    /** Host: stop being discoverable once the table is full or has started. */
    fun stopAdvertising() = client.stopAdvertising()

    /** Guest: look for tables nearby. */
    fun startDiscovery() {
        asHost = false
        client.startDiscovery(
            SERVICE_ID,
            discoveryCallback,
            DiscoveryOptions.Builder().setStrategy(Strategy.P2P_STAR).build()
        ).addOnFailureListener { events?.onFailure(it.message ?: "Could not search for tables") }
    }

    /** Guest: ask to join the table at [endpointId]. */
    fun connectTo(endpointId: String) {
        client.requestConnection(displayName, endpointId, connectionCallback)
            .addOnFailureListener { events?.onFailure(it.message ?: "Could not connect") }
    }

    fun stopDiscovery() = client.stopDiscovery()

    private fun send(endpointIds: List<String>, text: String) {
        if (endpointIds.isEmpty()) return
        client.sendPayload(endpointIds, Payload.fromBytes(text.toByteArray(Charsets.UTF_8)))
    }

    override fun sendToHost(text: String) = send(connected.toList(), text)

    override fun sendToPeer(peerId: String, text: String) = send(listOf(peerId), text)

    override fun broadcast(text: String) = send(connected.toList(), text)

    override fun close() {
        client.stopAdvertising()
        client.stopDiscovery()
        client.stopAllEndpoints()
        connected.clear()
    }

    companion object {
        /** Identifies this app's tables, so we never see (or join) another app's. */
        const val SERVICE_ID = "com.rangepatte.app.taash.table"
    }
}
