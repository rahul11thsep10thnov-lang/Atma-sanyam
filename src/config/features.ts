// Product switches decided at build time, not by the server.
//
// Membership billing and rewarded ads are placeholders: no store billing or
// ad network is wired in yet. Version 1 ships without them, so the Membership
// card and the "watch an ad" box stay hidden until real providers exist.
export const MONETIZATION_ENABLED = false;

// DADU (Dadaji's Miniverse) is the product; the earlier Tame focus timer
// stays in the build behind this switch and is reachable from DADU's parent
// settings. Set to false to boot the legacy navigator instead (reversible).
export const DADU_ENABLED = true;
