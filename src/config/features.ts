// Product switches decided at build time, not by the server.
//
// Membership billing and rewarded ads are placeholders: no store billing or
// ad network is wired in yet. Version 1 ships without them, so the Membership
// card and the "watch an ad" box stay hidden until real providers exist.
export const MONETIZATION_ENABLED = false;

// A development-only prototype of a 3D "Solarpunk Botanical Conservatory"
// (src/prototype/solarpunk). Off unless EXPO_PUBLIC_SOLARPUNK_PROTOTYPE=1, and
// even then it reads and writes no production data.
export const SOLARPUNK_PROTOTYPE = process.env.EXPO_PUBLIC_SOLARPUNK_PROTOTYPE === '1';
