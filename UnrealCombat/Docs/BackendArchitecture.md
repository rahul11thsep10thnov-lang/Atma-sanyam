# Multiplayer and backend architecture

Status: **design plus client-side seam**. The game currently runs with an on-device guest
profile (`FUCLocalBackendService`). No online service has been built or deployed.

## Target topology

```
 Android client --HTTPS--> API gateway --> Accounts   (sign-in, device/guest + platform login)
        |                              --> Profiles   (wallet, inventory, loadout, progression)
        |                              --> Catalog    (prices, level gates, live tuning)
        |                              --> Matchmaker (queues, allocates a game server)
        |
        +--UDP (Unreal replication)--> Dedicated game server (UnrealCombatServer)
                                            |
                                            +--HTTPS (service credential)--> Profiles: match results
```

## Trust model

| Decision | Today (offline) | Target |
| --- | --- | --- |
| Damage, ammo, scoring, match outcome | Game server / local authority | Dedicated server |
| Match rewards | Client applies the result it is sent | Game server posts the result; Profiles service computes and applies the reward |
| Purchases | Client applies against local wallet | Profiles service validates and applies; client mirrors |
| Vehicle / loadout used in a match | Game mode default vehicle | Server fetches the player's loadout and checks ownership |

The offline behaviour is acceptable for single-device play only. **Online play with a shared
economy must not ship until rewards and purchases are server-applied** - a modified client could
otherwise grant itself anything.

## Why the rules core matters here

`UnrealCombatCore` has no engine dependency, so the Profiles service can link the same
`PurchaseItem`, `ComputeMatchReward`, `ApplyMatchReward` and profile serialisation code the
client uses. Client and server cannot disagree about prices, level curves or save format.
Every mutating call already takes a transaction id and is idempotent, which makes retries over
a mobile network safe.

## Client seam

`IUCBackendService` (`UCProfileSubsystem.h`): `SignIn`, `LoadProfile`, `SaveProfile`, all
callback-based so an HTTP implementation drops in. `UUCProfileSubsystem` is the only caller.
To go online: add an `FUCOnlineBackendService`, replace whole-profile `SaveProfile` with
intent calls (purchase, equip), and keep the local service as offline cache.

## Open decisions (need product input)

* Hosting provider and regions; game-server hosting/fleet solution.
* Sign-in methods (guest only, Google Play Games, others).
* Whether premium currency is sold (requires Play Billing receipt validation).
* Player counts per match and matchmaking rules.
* Data protection requirements for the launch countries.
