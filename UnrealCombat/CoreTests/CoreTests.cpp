// Headless tests for the Unreal Combat rules core. No engine required.
#include "UCCore/CombatAI.h"
#include "UCCore/Defense.h"
#include "UCCore/Match.h"
#include "UCCore/Profile.h"
#include "UCCore/VehicleDamage.h"
#include "UCCore/Weapon.h"

#include <cmath>
#include <cstdio>

using namespace uc;

static int GChecks = 0;
static int GFailures = 0;

#define CHECK(Expr) \
	do { ++GChecks; if (!(Expr)) { ++GFailures; std::printf("  FAIL %s:%d  %s\n", __FILE__, __LINE__, #Expr); } } while (0)
#define CHECK_NEAR(A, B) CHECK(std::fabs(static_cast<double>(A) - static_cast<double>(B)) < 1e-3)

// ---- Vehicle damage ----------------------------------------------------

static void TestArmorAndChassis()
{
	FVehicleDamageSpec Spec;
	FVehicleDamageModel Model(Spec);
	FHit Hit;
	Hit.Amount = 100.f;
	Hit.Facing = EArmorFacing::Front;
	const FDamageResult Result = Model.ApplyHit(Hit);
	CHECK_NEAR(Result.AbsorbedByArmor, 65.f);
	CHECK_NEAR(Result.AppliedToChassis, 35.f);
	CHECK_NEAR(Model.GetArmor(EArmorFacing::Front), 335.f);
	CHECK_NEAR(Model.GetHealth(EVehicleComponent::Chassis), 965.f);
	CHECK_NEAR(Model.GetArmor(EArmorFacing::Rear), 250.f); // other facings untouched

	// Full penetration ignores armour entirely.
	Hit.Penetration = 1.f;
	const FDamageResult Pierce = Model.ApplyHit(Hit);
	CHECK_NEAR(Pierce.AbsorbedByArmor, 0.f);
	CHECK_NEAR(Pierce.AppliedToChassis, 100.f);

	// Stripped armour stops absorbing.
	FHit Rear;
	Rear.Amount = 1000.f;
	Rear.Facing = EArmorFacing::Rear;
	const FDamageResult Strip = Model.ApplyHit(Rear);
	CHECK_NEAR(Strip.AbsorbedByArmor, 250.f);
	CHECK_NEAR(Model.GetArmor(EArmorFacing::Rear), 0.f);
	CHECK(!Strip.bVehicleDestroyed);
	CHECK(Model.ApplyHit(Rear).bVehicleDestroyed);
	CHECK(Model.IsDestroyed());

	// A wreck takes no further damage and cannot be repaired.
	CHECK_NEAR(Model.ApplyHit(Rear).AppliedToChassis, 0.f);
	CHECK_NEAR(Model.Repair(EVehicleComponent::Chassis, 100.f), 0.f);
	CHECK(Model.GetPerformanceModifiers().bImmobilised);
}

static void TestComponentDamage()
{
	FVehicleDamageSpec Spec;
	for (float& Points : Spec.ArmorMaxPoints) { Points = 0.f; }
	FVehicleDamageModel Model(Spec);

	FHit Hit;
	Hit.Amount = 100.f;
	Hit.Target = EVehicleComponent::Engine;
	FDamageResult Result = Model.ApplyHit(Hit);
	CHECK_NEAR(Result.AppliedToComponent, 65.f);
	CHECK_NEAR(Result.AppliedToChassis, 35.f);
	CHECK_NEAR(Model.GetPerformanceModifiers().EnginePowerScale, 1.f); // still above half health

	Hit.Amount = 200.f; // engine 235 -> 105 (35%)
	Model.ApplyHit(Hit);
	const float Power = Model.GetPerformanceModifiers().EnginePowerScale;
	CHECK(Power < 1.f && Power > 0.35f);

	Hit.Amount = 400.f; // kills the engine, overkill spills to chassis
	Result = Model.ApplyHit(Hit);
	CHECK(Result.bComponentDestroyed);
	CHECK(Result.DestroyedComponent == EVehicleComponent::Engine);
	CHECK_NEAR(Result.AppliedToComponent, 105.f);
	CHECK_NEAR(Result.AppliedToChassis, 400.f - 105.f);
	CHECK(Model.GetPerformanceModifiers().bImmobilised);
	CHECK(!Model.IsDestroyed());

	// Hitting a dead component goes straight to the chassis.
	Hit.Amount = 50.f;
	Result = Model.ApplyHit(Hit);
	CHECK_NEAR(Result.AppliedToComponent, 0.f);
	CHECK_NEAR(Result.AppliedToChassis, 50.f);

	// Repair brings the engine back.
	CHECK_NEAR(Model.Repair(EVehicleComponent::Engine, 1000.f), 300.f);
	CHECK(!Model.GetPerformanceModifiers().bImmobilised);
}

static void TestWheelsWeaponsAndFire()
{
	FVehicleDamageSpec Spec;
	for (float& Points : Spec.ArmorMaxPoints) { Points = 0.f; }
	Spec.ChassisBleed = 0.f;
	FVehicleDamageModel Model(Spec);

	FHit Hit;
	Hit.Amount = 150.f;
	Hit.Target = EVehicleComponent::WheelFL;
	Model.ApplyHit(Hit);
	FPerformanceModifiers Mods = Model.GetPerformanceModifiers();
	CHECK_NEAR(Mods.WheelGripScale[0], 0.25f);
	CHECK_NEAR(Mods.WheelGripScale[1], 1.f);
	CHECK_NEAR(Mods.SteeringScale, 0.625f);

	Hit.Amount = 200.f;
	Hit.Target = EVehicleComponent::WeaponPrimary;
	Model.ApplyHit(Hit);
	Mods = Model.GetPerformanceModifiers();
	CHECK(!Mods.bPrimaryWeaponOnline);
	CHECK(Mods.bSecondaryWeaponOnline);

	// Fuel tank rupture starts a fire that burns the chassis for FireDuration seconds.
	Hit.Target = EVehicleComponent::FuelTank;
	const FDamageResult Rupture = Model.ApplyHit(Hit);
	CHECK(Rupture.bFireStarted);
	CHECK(Model.IsOnFire());
	const float Before = Model.GetHealth(EVehicleComponent::Chassis);
	Model.Tick(1.f);
	CHECK_NEAR(Before - Model.GetHealth(EVehicleComponent::Chassis), 25.f);
	Model.Tick(100.f); // remaining 7 s only
	CHECK(!Model.IsOnFire());
	CHECK_NEAR(Before - Model.GetHealth(EVehicleComponent::Chassis), 200.f);

	// Resistances scale incoming damage.
	FVehicleDamageSpec Resistant = Spec;
	Resistant.TypeMultiplier[static_cast<int>(EDamageType::Energy)] = 0.5f;
	FVehicleDamageModel Tank(Resistant);
	FHit Laser;
	Laser.Amount = 100.f;
	Laser.Type = EDamageType::Energy;
	CHECK_NEAR(Tank.ApplyHit(Laser).AppliedToChassis, 50.f);

	// Snapshot restore clamps to the spec.
	float Health[NumVehicleComponents];
	float Armor[NumArmorFacings];
	for (float& Value : Health) { Value = 99999.f; }
	for (float& Value : Armor) { Value = -5.f; }
	Tank.SetState(Health, Armor, true);
	CHECK_NEAR(Tank.GetHealth(EVehicleComponent::Chassis), 1000.f);
	CHECK_NEAR(Tank.GetArmor(EArmorFacing::Front), 0.f);
	CHECK(Tank.IsOnFire());
}

// ---- Weapons -------------------------------------------------------------

static void TestWeaponFireAndReload()
{
	FWeaponSpec Spec;
	Spec.FireInterval = 0.1f;
	Spec.MagazineSize = 5;
	Spec.ReserveAmmo = 7;
	Spec.ReloadTime = 1.f;
	FWeapon Weapon(Spec);

	CHECK(Weapon.Tick(1.f) == 0); // trigger not held
	Weapon.SetTriggerHeld(true);
	CHECK(Weapon.Tick(0.016f) == 1); // first shot is immediate
	CHECK(Weapon.Tick(0.016f) == 0); // waiting on the fire interval

	int Total = 1;
	for (int i = 0; i < 100 && !Weapon.IsReloading(); ++i) { Total += Weapon.Tick(0.05f); }
	CHECK(Total == 5);
	CHECK(Weapon.IsReloading()); // auto reload when dry
	CHECK(Weapon.Tick(0.5f) == 0);
	CHECK(Weapon.Tick(0.6f) == 0); // reload completes this step
	CHECK(Weapon.GetAmmoInMagazine() == 5);
	CHECK(Weapon.GetReserveAmmo() == 2);

	// Burn through everything: 5 + 2 more rounds, then permanently dry.
	Total = 0;
	for (int i = 0; i < 400; ++i) { Total += Weapon.Tick(0.05f); }
	CHECK(Total == 7);
	CHECK(Weapon.GetAmmoInMagazine() == 0 && Weapon.GetReserveAmmo() == 0);
	CHECK(!Weapon.CanFire());
	Weapon.AddReserveAmmo(3);
	for (int i = 0; i < 100; ++i) { Total += Weapon.Tick(0.05f); }
	CHECK(Total == 10);

	// A long frame fires several rounds but never more than the interval allows.
	FWeapon Burst(Spec);
	Burst.SetTriggerHeld(true);
	CHECK(Burst.Tick(0.35f) == 4); // t=0, 0.1, 0.2, 0.3

	// Disabled mounts cannot fire.
	FWeapon Broken(Spec);
	Broken.SetEnabled(false);
	Broken.SetTriggerHeld(true);
	CHECK(Broken.Tick(1.f) == 0);
}

static void TestWeaponHeatAndSemiAuto()
{
	FWeaponSpec Spec;
	Spec.MagazineSize = 0; // energy weapon
	Spec.FireInterval = 0.1f;
	Spec.HeatPerShot = 0.25f;
	Spec.HeatCoolPerSecond = 0.1f;
	Spec.OverheatRecoverLevel = 0.3f;
	FWeapon Laser(Spec);
	Laser.SetTriggerHeld(true);

	int Total = 0;
	for (int i = 0; i < 20 && !Laser.IsOverheated(); ++i) { Total += Laser.Tick(0.1f); }
	CHECK(Laser.IsOverheated());
	CHECK(Total >= 4 && Total <= 5);
	CHECK(Laser.Tick(1.f) == 0); // locked out while hot
	int Recovered = 0;
	for (int i = 0; i < 100 && Recovered == 0; ++i) { Recovered += Laser.Tick(0.1f); }
	CHECK(Recovered == 1);
	CHECK(Laser.GetHeat() <= 0.3f + 0.25f + 1e-3f);

	FWeaponSpec Cannon;
	Cannon.bAutomatic = false;
	Cannon.FireInterval = 0.5f;
	FWeapon Semi(Cannon);
	Semi.SetTriggerHeld(true);
	int Shots = 0;
	for (int i = 0; i < 50; ++i) { Shots += Semi.Tick(0.1f); }
	CHECK(Shots == 1); // one shot per trigger pull
	Semi.SetTriggerHeld(false);
	Semi.SetTriggerHeld(true);
	CHECK(Semi.Tick(0.1f) == 1);
}

// ---- Defence -------------------------------------------------------------

static void TestShieldAndAbility()
{
	FShieldSpec Spec;
	Spec.MaxStrength = 100.f;
	Spec.RegenPerSecond = 10.f;
	Spec.RegenDelay = 2.f;
	FShield Shield(Spec);
	CHECK_NEAR(Shield.Absorb(30.f), 0.f);
	CHECK_NEAR(Shield.GetStrength(), 70.f);
	CHECK_NEAR(Shield.Absorb(100.f), 30.f);
	CHECK(Shield.IsDepleted());
	Shield.Tick(1.f);
	CHECK(Shield.IsDepleted()); // still inside the regen delay
	Shield.Tick(1.f);
	Shield.Tick(1.f);
	CHECK(Shield.GetStrength() > 0.f);
	Shield.Absorb(1.f); // damage restarts the delay
	const float After = Shield.GetStrength();
	Shield.Tick(1.f);
	CHECK_NEAR(Shield.GetStrength(), After);
	for (int i = 0; i < 100; ++i) { Shield.Tick(1.f); }
	CHECK_NEAR(Shield.GetStrength(), 100.f);

	FShield None; // vehicles without a shield pass damage straight through
	CHECK_NEAR(None.Absorb(50.f), 50.f);

	FAbilitySpec AbilitySpec;
	AbilitySpec.Duration = 3.f;
	AbilitySpec.Cooldown = 5.f;
	AbilitySpec.Charges = 2;
	FAbility Ability(AbilitySpec);
	CHECK(Ability.Activate());
	CHECK(Ability.IsActive());
	CHECK(!Ability.Activate()); // already running
	CHECK(!Ability.Tick(2.f));
	CHECK(Ability.Tick(1.5f)); // effect ends
	CHECK(!Ability.Activate()); // cooling down
	Ability.Tick(5.f);
	CHECK(Ability.Activate());
	Ability.Tick(3.f);
	Ability.Tick(5.f);
	CHECK(!Ability.Activate()); // out of charges
	CHECK(Ability.GetChargesRemaining() == 0);
}

// ---- Economy, progression, persistence -----------------------------------

static FCatalog MakeCatalog()
{
	FCatalog Catalog;
	FCatalogItem Item;
	Item.Id = "vehicle.scout"; Item.Kind = EItemKind::Vehicle; Item.Price = 0; Item.RequiredLevel = 1; Catalog.Add(Item);
	Item.Id = "vehicle.bruiser"; Item.Kind = EItemKind::Vehicle; Item.Price = 5000; Item.RequiredLevel = 5; Catalog.Add(Item);
	Item.Id = "weapon.mg"; Item.Kind = EItemKind::Weapon; Item.Price = 300; Item.RequiredLevel = 1; Catalog.Add(Item);
	Item.Id = "consumable.repair"; Item.Kind = EItemKind::Consumable; Item.Price = 50; Item.RequiredLevel = 1; Catalog.Add(Item);
	Item.Id = "upgrade.gold"; Item.Kind = EItemKind::Upgrade; Item.Currency = ECurrency::Premium; Item.Price = 10; Catalog.Add(Item);
	return Catalog;
}

static void TestEconomy()
{
	const FCatalog Catalog = MakeCatalog();
	FPlayerProfile Profile;

	CHECK(GrantCurrency(Profile, ECurrency::Credits, 1000, "tx-1") == ETxResult::Ok);
	CHECK(GrantCurrency(Profile, ECurrency::Credits, 1000, "tx-1") == ETxResult::Duplicate); // idempotent
	CHECK(Profile.Balance[0] == 1000);
	CHECK(GrantCurrency(Profile, ECurrency::Credits, -5, "tx-2") == ETxResult::InvalidAmount);
	CHECK(GrantCurrency(Profile, ECurrency::Credits, 5, "bad id!") == ETxResult::InvalidId);
	CHECK(SpendCurrency(Profile, ECurrency::Credits, 5000, "tx-3") == ETxResult::InsufficientFunds);
	CHECK(SpendCurrency(Profile, ECurrency::Credits, 100, "tx-3") == ETxResult::Ok); // failed tx id is reusable
	CHECK(Profile.Balance[0] == 900);

	CHECK(PurchaseItem(Profile, Catalog, "weapon.mg", "buy-1") == ETxResult::Ok);
	CHECK(Profile.Balance[0] == 600 && Profile.Owns("weapon.mg"));
	CHECK(PurchaseItem(Profile, Catalog, "weapon.mg", "buy-1") == ETxResult::Duplicate);
	CHECK(PurchaseItem(Profile, Catalog, "weapon.mg", "buy-2") == ETxResult::AlreadyOwned);
	CHECK(PurchaseItem(Profile, Catalog, "weapon.nope", "buy-3") == ETxResult::UnknownItem);
	CHECK(PurchaseItem(Profile, Catalog, "vehicle.bruiser", "buy-4") == ETxResult::LevelTooLow);
	CHECK(PurchaseItem(Profile, Catalog, "upgrade.gold", "buy-5") == ETxResult::InsufficientFunds);
	CHECK(PurchaseItem(Profile, Catalog, "consumable.repair", "buy-6") == ETxResult::Ok);
	CHECK(PurchaseItem(Profile, Catalog, "consumable.repair", "buy-7") == ETxResult::Ok); // stackable
	CHECK(Profile.Balance[0] == 500);

	CHECK(EquipItem(Profile, Catalog, ELoadoutSlot::PrimaryWeapon, "weapon.mg") == ETxResult::Ok);
	CHECK(EquipItem(Profile, Catalog, ELoadoutSlot::Vehicle, "weapon.mg") == ETxResult::WrongItemKind);
	CHECK(EquipItem(Profile, Catalog, ELoadoutSlot::Vehicle, "vehicle.bruiser") == ETxResult::NotOwned);
	CHECK(Profile.Loadout[static_cast<int>(ELoadoutSlot::PrimaryWeapon)] == "weapon.mg");
}

static void TestProgressionAndRewards()
{
	FProgressionSpec Spec;
	Spec.MaxLevel = 4;
	FPlayerProfile Profile;
	CHECK(XpForNextLevel(Spec, 1) == 500);
	CHECK(XpForNextLevel(Spec, 3) == 1000);
	CHECK(AddXp(Profile, Spec, 499) == 0);
	CHECK(AddXp(Profile, Spec, 1) == 1);
	CHECK(Profile.Level == 2 && Profile.Xp == 0);
	CHECK(AddXp(Profile, Spec, 750 + 1000 + 99999) == 2); // capped at max level
	CHECK(Profile.Level == 4 && Profile.Xp == 0);
	CHECK(AddXp(Profile, Spec, 100) == 0);

	FMatchPerformance Performance;
	Performance.Kills = 3;
	Performance.Assists = 1;
	Performance.DamageDealt = 2500.f;
	Performance.bWon = true;
	const FMatchReward Reward = ComputeMatchReward(Performance, FRewardSpec());
	CHECK(Reward.Xp == 100 + 300 + 40 + 125 + 300);
	CHECK(Reward.Credits == 50 + 150 + 200);

	FPlayerProfile Fresh;
	CHECK(ApplyMatchReward(Fresh, FProgressionSpec(), Reward, "match-42") == 1);
	const int64_t Credits = Fresh.Balance[0];
	CHECK(Credits == Reward.Credits);
	CHECK(ApplyMatchReward(Fresh, FProgressionSpec(), Reward, "match-42") == 0); // never paid twice
	CHECK(Fresh.Balance[0] == Credits);
}

static void TestProfileSerialization()
{
	FPlayerProfile Profile;
	Profile.PlayerId = "player-001";
	Profile.DisplayName = "Rex = 100%, \"driver\"\nline2";
	Profile.Level = 7;
	Profile.Xp = 321;
	Profile.Balance[0] = 12345;
	Profile.Balance[1] = 6;
	Profile.OwnedItems = { "vehicle.scout", "weapon.mg" };
	Profile.Loadout[0] = "vehicle.scout";
	Profile.Loadout[1] = "weapon.mg";
	Profile.CompletedMissions = { "mission.01" };
	Profile.AppliedTransactions = { "tx-1", "buy-1" };

	const std::string Text = SerializeProfile(Profile);
	FPlayerProfile Loaded;
	CHECK(DeserializeProfile(Text, Loaded));
	CHECK(Loaded.PlayerId == Profile.PlayerId);
	CHECK(Loaded.DisplayName == Profile.DisplayName);
	CHECK(Loaded.Level == 7 && Loaded.Xp == 321);
	CHECK(Loaded.Balance[0] == 12345 && Loaded.Balance[1] == 6);
	CHECK(Loaded.OwnedItems == Profile.OwnedItems);
	CHECK(Loaded.Loadout[0] == "vehicle.scout" && Loaded.Loadout[1] == "weapon.mg" && Loaded.Loadout[2].empty());
	CHECK(Loaded.CompletedMissions == Profile.CompletedMissions);
	CHECK(Loaded.AppliedTransactions == Profile.AppliedTransactions);
	CHECK(SerializeProfile(Loaded) == Text);

	// Corrupt or hostile input is rejected and leaves the output untouched.
	FPlayerProfile Untouched;
	Untouched.Level = 99;
	CHECK(!DeserializeProfile("", Untouched));
	CHECK(!DeserializeProfile("level=5\n", Untouched)); // no header
	CHECK(!DeserializeProfile("uc_profile=999\n", Untouched)); // newer schema
	CHECK(!DeserializeProfile("uc_profile=1\nlevel=-3\n", Untouched));
	CHECK(!DeserializeProfile("uc_profile=1\ncredits=99999999999999999999999\n", Untouched));
	CHECK(!DeserializeProfile("uc_profile=1\nowned=ok,bad id\n", Untouched));
	CHECK(!DeserializeProfile("uc_profile=1\ndisplay_name=%Z\n", Untouched));
	CHECK(!DeserializeProfile("uc_profile=1\ngarbage\n", Untouched));
	CHECK(Untouched.Level == 99);
	CHECK(DeserializeProfile("uc_profile=1\r\nfuture_field=whatever\r\nlevel=2\r\n", Untouched)); // additive fields + CRLF
	CHECK(Untouched.Level == 2);
}

// ---- Match rules -----------------------------------------------------------

static void TestFreeForAll()
{
	FMatchConfig Config;
	Config.ScoreLimit = 3;
	Config.WarmupTime = 5.f;
	Config.TimeLimit = 60.f;
	FMatch Match;
	Match.Configure(Config);
	const int A = Match.AddParticipant(-1, false);
	const int B = Match.AddParticipant(-1, true);
	const int C = Match.AddParticipant(-1, true);

	Match.RecordKill(A, B); // ignored during warm-up
	CHECK(Match.FindParticipant(A)->Kills == 0);
	Match.Tick(6.f);
	CHECK(Match.GetPhase() == EMatchPhase::InProgress);
	CHECK_NEAR(Match.GetElapsed(), 1.f);

	Match.RecordKill(A, B);
	Match.RecordKill(-1, C); // environment death costs a point
	CHECK(Match.FindParticipant(C)->Score == -1);
	Match.RecordDamage(A, 1500.f);
	Match.RecordKill(A, C);
	CHECK(Match.GetPhase() == EMatchPhase::InProgress);
	Match.RecordKill(A, B);
	CHECK(Match.GetPhase() == EMatchPhase::Finished);
	CHECK(Match.GetWinner() == A);
	CHECK(Match.IsWinner(A) && !Match.IsWinner(B));
	const FMatchPerformance Performance = Match.BuildPerformance(A);
	CHECK(Performance.Kills == 3 && Performance.bWon && !Performance.bMissionCompleted);
	CHECK_NEAR(Performance.DamageDealt, 1500.f);
	Match.RecordKill(B, A); // nothing counts after the end
	CHECK(Match.FindParticipant(B)->Kills == 0);

	// Time-out with a tie is a draw.
	FMatch Draw;
	Draw.Configure(Config);
	const int D = Draw.AddParticipant(-1, false);
	const int E = Draw.AddParticipant(-1, false);
	Draw.Tick(5.f);
	Draw.RecordKill(D, E);
	Draw.RecordKill(E, D);
	Draw.Tick(61.f);
	CHECK(Draw.GetPhase() == EMatchPhase::Finished);
	CHECK(Draw.GetWinner() == NoWinner);
	CHECK_NEAR(Draw.GetTimeRemaining(), 0.f);
}

static void TestTeamDeathmatch()
{
	FMatchConfig Config;
	Config.Mode = EMatchMode::TeamDeathmatch;
	Config.ScoreLimit = 2;
	Config.WarmupTime = 0.f;
	FMatch Match;
	Match.Configure(Config);
	const int A = Match.AddParticipant(-1, false);
	const int B = Match.AddParticipant(-1, false);
	const int C = Match.AddParticipant(-1, false);
	const int D = Match.AddParticipant(-1, false);
	CHECK(Match.FindParticipant(A)->Team == 0 && Match.FindParticipant(B)->Team == 1);
	CHECK(Match.FindParticipant(C)->Team == 0 && Match.FindParticipant(D)->Team == 1);

	Match.RecordKill(A, C); // team kill
	CHECK(Match.FindParticipant(A)->Score == -1 && Match.FindParticipant(A)->Kills == 0);
	Match.RecordKill(B, A);
	Match.RecordKill(D, C);
	CHECK(Match.GetPhase() == EMatchPhase::Finished);
	CHECK(Match.GetWinner() == 1);
	CHECK(Match.IsWinner(B) && Match.IsWinner(D) && !Match.IsWinner(A));
}

static void TestMissions()
{
	FMatchConfig Config;
	Config.Mode = EMatchMode::BossHunt;
	Config.WarmupTime = 0.f;
	Config.TimeLimit = 300.f;
	Config.PlayerLives = 1;

	std::vector<FObjective> Objectives(3);
	Objectives[0].Id = "escorts"; Objectives[0].Type = EObjectiveType::DestroyTargets; Objectives[0].Required = 2;
	Objectives[1].Id = "boss"; Objectives[1].Type = EObjectiveType::DefeatBoss;
	Objectives[2].Id = "bonus"; Objectives[2].Type = EObjectiveType::ReachCheckpoints; Objectives[2].Required = 3; Objectives[2].bOptional = true;

	FMatch Match;
	Match.Configure(Config, Objectives);
	const int Player = Match.AddParticipant(-1, false);
	const int Bot1 = Match.AddParticipant(-1, true);
	const int Bot2 = Match.AddParticipant(-1, true);
	const int Boss = Match.AddParticipant(-1, true);
	CHECK(Match.FindParticipant(Player)->Team == MissionPlayerTeam);
	CHECK(Match.FindParticipant(Boss)->Team == MissionEnemyTeam);

	Match.RecordKill(Player, Bot1);
	Match.RecordKill(Bot2, Player); // one life lost, one allowed
	CHECK(Match.GetLivesRemaining() == 0);
	CHECK(Match.GetPhase() == EMatchPhase::InProgress);
	Match.RecordKill(Player, Bot2);
	CHECK(Match.GetObjectives()[0].IsComplete());
	Match.RecordKill(Player, Boss, true);
	CHECK(Match.GetPhase() == EMatchPhase::Finished);
	CHECK(Match.DidMissionSucceed()); // optional objective not needed
	const FMatchPerformance Performance = Match.BuildPerformance(Player);
	CHECK(Performance.bMissionCompleted && Performance.bWon && Performance.BossesDefeated == 1 && Performance.Kills == 3);

	// Running out of lives fails the mission.
	FMatch Fail;
	Fail.Configure(Config, Objectives);
	const int P2 = Fail.AddParticipant(-1, false);
	const int E2 = Fail.AddParticipant(-1, true);
	Fail.RecordKill(E2, P2);
	Fail.RecordKill(E2, P2);
	CHECK(Fail.GetPhase() == EMatchPhase::Finished && !Fail.DidMissionSucceed());
	CHECK(!Fail.BuildPerformance(P2).bWon);

	// Survive objective completes on the clock; time limit fails unfinished missions.
	FMatchConfig SurviveConfig;
	SurviveConfig.Mode = EMatchMode::Mission;
	SurviveConfig.WarmupTime = 0.f;
	SurviveConfig.TimeLimit = 0.f;
	std::vector<FObjective> Survive(1);
	Survive[0].Type = EObjectiveType::Survive;
	Survive[0].Required = 30;
	FMatch Hold;
	Hold.Configure(SurviveConfig, Survive);
	Hold.AddParticipant(-1, false);
	Hold.Tick(29.f);
	CHECK(Hold.GetPhase() == EMatchPhase::InProgress);
	Hold.Tick(2.f);
	CHECK(Hold.GetPhase() == EMatchPhase::Finished && Hold.DidMissionSucceed());

	FMatch Timeout;
	Timeout.Configure(Config, Objectives);
	Timeout.AddParticipant(-1, false);
	Timeout.Tick(301.f);
	CHECK(Timeout.GetPhase() == EMatchPhase::Finished && !Timeout.DidMissionSucceed());
}

// ---- AI ----------------------------------------------------------------------

static void TestAIDecisions()
{
	FAIPersonality Personality;
	FAIPerception Perception;
	CHECK(DecideState(EAIState::Engage, Perception, Personality) == EAIState::Patrol); // no target

	Perception.bHasTarget = true;
	Perception.TargetDistance = 20000.f;
	Perception.bHasLineOfSight = true;
	CHECK(DecideState(EAIState::Patrol, Perception, Personality) == EAIState::Pursue);
	Perception.TargetDistance = 14000.f; // inside range but in the hysteresis band
	CHECK(DecideState(EAIState::Pursue, Perception, Personality) == EAIState::Pursue);
	CHECK(DecideState(EAIState::Engage, Perception, Personality) == EAIState::Engage);
	Perception.TargetDistance = 8000.f;
	CHECK(DecideState(EAIState::Pursue, Perception, Personality) == EAIState::Engage);
	Perception.bHasLineOfSight = false;
	CHECK(DecideState(EAIState::Engage, Perception, Personality) == EAIState::Pursue);
	Perception.bHasLineOfSight = true;

	Perception.bUnderFire = true;
	Perception.SelfHealthFraction = 0.3f;
	CHECK(DecideState(EAIState::Engage, Perception, Personality) == EAIState::Evade);
	FAIPersonality Reckless = Personality;
	Reckless.Aggression = 1.f;
	CHECK(DecideState(EAIState::Engage, Perception, Reckless) == EAIState::Engage);

	Perception.SelfHealthFraction = 0.2f;
	CHECK(DecideState(EAIState::Engage, Perception, Personality) == EAIState::Retreat);
	Perception.SelfHealthFraction = 0.35f; // not yet recovered past the hysteresis margin
	Perception.bUnderFire = false;
	CHECK(DecideState(EAIState::Retreat, Perception, Personality) == EAIState::Retreat);
	Perception.SelfHealthFraction = 0.5f;
	CHECK(DecideState(EAIState::Retreat, Perception, Personality) == EAIState::Engage);

	FAIPersonality BossMind;
	BossMind.RetreatHealthFraction = 0.f;
	BossMind.Aggression = 1.f;
	Perception.SelfHealthFraction = 0.01f;
	CHECK(DecideState(EAIState::Engage, Perception, BossMind) == EAIState::Engage);
}

static void TestAITargetingAndDriving()
{
	FAIPersonality Personality;
	std::vector<FAITargetCandidate> Candidates(3);
	Candidates[0].Id = 10; Candidates[0].Distance = 9000.f;
	Candidates[1].Id = 11; Candidates[1].Distance = 3000.f;
	Candidates[2].Id = 12; Candidates[2].Distance = 500.f; Candidates[2].HealthFraction = 0.f; // dead
	CHECK(SelectTarget(Candidates, Personality, -1, 10000.f) == 11);
	Candidates[0].bIsAttackingMe = true;
	Candidates[0].bHasLineOfSight = true;
	CHECK(SelectTarget(Candidates, Personality, -1, 10000.f) == 10); // shooter with line of sight wins
	CHECK(SelectTarget(Candidates, Personality, -1, 2000.f) == -1); // nobody in range
	CHECK(SelectTarget(std::vector<FAITargetCandidate>(), Personality, 10, 10000.f) == -1);

	FAIPerception Perception;
	Perception.bHasTarget = true;
	Perception.bHasLineOfSight = true;
	Perception.WeaponRange = 10000.f;

	FAIDriveInput Input = ComputeDrive(EAIState::Pursue, 5000.f, 0.f, Perception, Personality);
	CHECK_NEAR(Input.Steering, 0.f);
	CHECK_NEAR(Input.Throttle, 1.f);
	CHECK(!Input.bFire);
	Input = ComputeDrive(EAIState::Pursue, 0.f, 5000.f, Perception, Personality); // hard right
	CHECK_NEAR(Input.Steering, 1.f);
	CHECK(Input.Throttle < 1.f);
	Input = ComputeDrive(EAIState::Pursue, 1000.f, -1000.f, Perception, Personality);
	CHECK(Input.Steering < 0.f);

	Input = ComputeDrive(EAIState::Engage, 6000.f, 100.f, Perception, Personality);
	CHECK(Input.bFire); // lined up, in range
	Input = ComputeDrive(EAIState::Engage, 6000.f, 3000.f, Perception, Personality);
	CHECK(!Input.bFire); // outside aim tolerance
	Input = ComputeDrive(EAIState::Engage, 1000.f, 0.f, Perception, Personality);
	CHECK(Input.Throttle < 0.f && Input.bFire); // too close: reverse while shooting
	Perception.bHasLineOfSight = false;
	Input = ComputeDrive(EAIState::Engage, 6000.f, 0.f, Perception, Personality);
	CHECK(!Input.bFire);

	Input = ComputeDrive(EAIState::Retreat, 5000.f, 100.f, Perception, Personality); // threat ahead-right: turn left, away
	CHECK(Input.Steering < 0.f);
	CHECK_NEAR(Input.Throttle, 1.f);
	Input = ComputeDrive(EAIState::Retreat, -5000.f, 0.f, Perception, Personality); // threat dead astern: straight on
	CHECK_NEAR(Input.Steering, 0.f);
	Input = ComputeDrive(EAIState::Evade, 0.f, 5000.f, Perception, Personality); // already on the beam
	CHECK_NEAR(Input.Steering, 0.f);
	Input = ComputeDrive(EAIState::Patrol, 0.f, 0.f, Perception, Personality); // at the waypoint
	CHECK_NEAR(Input.Throttle, 0.f);
}

static void TestBossPhases()
{
	std::vector<FBossPhase> Phases(3);
	Phases[0].HealthThreshold = 0.3f; Phases[0].DamageScale = 2.f; Phases[0].AbilityOnEnter = "ability.enrage";
	Phases[1].HealthThreshold = 1.f;
	Phases[2].HealthThreshold = 0.6f; Phases[2].DamageScale = 1.5f;

	FBossController Boss;
	Boss.Reset(Phases); // sorts by threshold
	CHECK(Boss.GetPhaseIndex() == 0);
	CHECK(!Boss.Update(0.9f));
	CHECK(Boss.Update(0.6f));
	CHECK(Boss.GetPhaseIndex() == 1);
	CHECK_NEAR(Boss.GetPhase().DamageScale, 1.5f);
	CHECK(!Boss.Update(1.f)); // repairs never roll a phase back
	CHECK(Boss.GetPhaseIndex() == 1);
	CHECK(Boss.Update(0.05f));
	CHECK(Boss.GetPhaseIndex() == 2);
	CHECK(Boss.GetPhase().AbilityOnEnter == "ability.enrage");

	FBossController Skip;
	Skip.Reset(Phases);
	CHECK(Skip.Update(0.1f)); // a huge hit can jump straight to the last phase
	CHECK(Skip.GetPhaseIndex() == 2);

	FBossController Empty;
	Empty.Reset(std::vector<FBossPhase>());
	CHECK(Empty.GetPhaseCount() == 1 && !Empty.Update(0.f));
}

int main()
{
	struct FTest { const char* Name; void (*Run)(); };
	const FTest Tests[] = {
		{ "VehicleDamage.ArmorAndChassis", TestArmorAndChassis },
		{ "VehicleDamage.Components", TestComponentDamage },
		{ "VehicleDamage.WheelsWeaponsFire", TestWheelsWeaponsAndFire },
		{ "Weapon.FireAndReload", TestWeaponFireAndReload },
		{ "Weapon.HeatAndSemiAuto", TestWeaponHeatAndSemiAuto },
		{ "Defense.ShieldAndAbility", TestShieldAndAbility },
		{ "Profile.Economy", TestEconomy },
		{ "Profile.ProgressionAndRewards", TestProgressionAndRewards },
		{ "Profile.Serialization", TestProfileSerialization },
		{ "Match.FreeForAll", TestFreeForAll },
		{ "Match.TeamDeathmatch", TestTeamDeathmatch },
		{ "Match.Missions", TestMissions },
		{ "AI.Decisions", TestAIDecisions },
		{ "AI.TargetingAndDriving", TestAITargetingAndDriving },
		{ "AI.BossPhases", TestBossPhases },
	};
	for (const FTest& Test : Tests)
	{
		const int Before = GFailures;
		Test.Run();
		std::printf("[%s] %s\n", GFailures == Before ? " OK " : "FAIL", Test.Name);
	}
	std::printf("%d checks, %d failures\n", GChecks, GFailures);
	return GFailures == 0 ? 0 : 1;
}
