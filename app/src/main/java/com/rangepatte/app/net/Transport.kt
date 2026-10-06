package com.rangepatte.app.net

/**
 * How phones exchange text messages, hub-and-spoke: every other phone talks only to the host. One
 * implementation carries them over Bluetooth/Wi-Fi (Nearby Connections), another over the internet
 * (Firestore). The game never knows which.
 */
interface Transport {
    interface Listener {
        /** A message arrived from [peerId] (for a client, the only peer is the host). Called on any thread. */
        fun onMessage(peerId: String, text: String)

        /** [peerId] disconnected or timed out. Called on any thread. */
        fun onPeerLost(peerId: String)
    }

    var listener: Listener?

    /** Client → host. */
    fun sendToHost(text: String)

    /** Host → one client. */
    fun sendToPeer(peerId: String, text: String)

    /** Host → every client. */
    fun broadcast(text: String)

    /** Leaves the table and releases radios / network listeners. */
    fun close()
}
