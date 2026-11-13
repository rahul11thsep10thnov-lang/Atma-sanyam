#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "Engine/DeveloperSettings.h"
#include "UCCore/Defense.h"
#include "UCCore/Weapon.h"
#include "UCTypes.h"
#include "UCDefinitions.generated.h"

class AUCProjectile;
class AUCVehiclePawn;

/** Tuning for one weapon. All gameplay numbers live here, not in code. */
UCLASS(BlueprintType)
class UNREALCOMBAT_API UUCWeaponDefinition : public UPrimaryDataAsset
{
	GENERATED_BODY()

public:
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Weapon")
	FName WeaponId;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Weapon", meta = (ClampMin = "0"))
	float Damage = 20.f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Weapon")
	EUCDamageType DamageType = EUCDamageType::Kinetic;

	/** Seconds between shots. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Weapon", meta = (ClampMin = "0.01"))
	float FireInterval = 0.1f;

	/** 0 = no ammunition, limited by heat only. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Ammo", meta = (ClampMin = "0"))
	int32 MagazineSize = 30;

	/** Negative = unlimited reserve. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Ammo")
	int32 ReserveAmmo = 120;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Ammo", meta = (ClampMin = "0"))
	float ReloadTime = 2.f;

	/** Heat per shot; the weapon locks at 1.0. 0 disables heat. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Heat", meta = (ClampMin = "0", ClampMax = "1"))
	float HeatPerShot = 0.f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Heat", meta = (ClampMin = "0"))
	float HeatCoolPerSecond = 0.25f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Heat", meta = (ClampMin = "0", ClampMax = "1"))
	float OverheatRecoverLevel = 0.3f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Ballistics", meta = (ClampMin = "0"))
	float SpreadDegrees = 1.f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Ballistics", meta = (ClampMin = "0"))
	float Range = 15000.f;

	/** 0 = hitscan. Otherwise ProjectileClass is spawned with this speed. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Ballistics", meta = (ClampMin = "0"))
	float ProjectileSpeed = 0.f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Ballistics")
	TSubclassOf<AUCProjectile> ProjectileClass;

	/** Projectiles only: >0 deals area damage with linear falloff. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Ballistics", meta = (ClampMin = "0"))
	float ExplosionRadius = 0.f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Ballistics", meta = (ClampMin = "0", ClampMax = "1"))
	float Penetration = 0.f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Ballistics", meta = (ClampMin = "1"))
	int32 PelletsPerShot = 1;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Weapon")
	bool bAutomatic = true;

	uc::FWeaponSpec ToCoreSpec() const;
};

UENUM(BlueprintType)
enum class EUCAbilityEffect : uint8
{
	/** Restores Magnitude (0..1) of every component's max health and puts out fires. */
	RepairKit,
	/** Multiplies engine torque by Magnitude while active. */
	Boost,
	/** Refills the shield instantly. */
	ShieldRecharge,
	Extinguisher
};

USTRUCT(BlueprintType)
struct FUCAbilityDefinition
{
	GENERATED_BODY()

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Ability")
	FName AbilityId;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Ability")
	EUCAbilityEffect Effect = EUCAbilityEffect::RepairKit;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Ability")
	float Magnitude = 0.5f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Ability", meta = (ClampMin = "0"))
	float Duration = 0.f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Ability", meta = (ClampMin = "0"))
	float Cooldown = 20.f;

	/** Uses per life. Negative = unlimited. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Ability")
	int32 Charges = -1;

	uc::FAbilitySpec ToCoreSpec() const;
};

USTRUCT(BlueprintType)
struct FUCAIPersonality
{
	GENERATED_BODY()

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "AI", meta = (ClampMin = "0", ClampMax = "1"))
	float Aggression = 0.5f;

	/** <=0 never retreats (use for bosses). */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "AI", meta = (ClampMax = "1"))
	float RetreatHealthFraction = 0.25f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "AI", meta = (ClampMin = "0.1", ClampMax = "1"))
	float PreferredRangeFraction = 0.6f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "AI", meta = (ClampMin = "0"))
	float AimToleranceDegrees = 8.f;

	uc::FAIPersonality ToCore() const;
};

USTRUCT(BlueprintType)
struct FUCBossPhase
{
	GENERATED_BODY()

	/** Phase starts when chassis health fraction is at or below this. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Boss", meta = (ClampMin = "0", ClampMax = "1"))
	float HealthThreshold = 1.f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Boss", meta = (ClampMin = "0"))
	float DamageScale = 1.f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Boss", meta = (ClampMin = "0.1"))
	float FireRateScale = 1.f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Boss", meta = (ClampMin = "0"))
	float SpeedScale = 1.f;

	/** Optional: id of one of the vehicle's abilities to fire when the phase begins. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Boss")
	FName AbilityOnEnter;
};

/** Tuning for one vehicle: durability, defences, weapons, AI behaviour. */
UCLASS(BlueprintType)
class UNREALCOMBAT_API UUCVehicleDefinition : public UPrimaryDataAsset
{
	GENERATED_BODY()

public:
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Vehicle")
	FName VehicleId;

	/**
	 * Blueprint subclass of AUCVehiclePawn carrying the mesh, wheels and Chaos vehicle setup.
	 * Exterior design is supplied by the visual package; until then this is a placeholder.
	 */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Vehicle")
	TSubclassOf<AUCVehiclePawn> PawnClass;

	/** Components left out use the rules-core defaults. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Durability")
	TMap<EUCVehicleComponent, float> ComponentMaxHealth;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Durability")
	TMap<EUCArmorFacing, float> ArmorPoints;

	/** Incoming damage multiplier per type (1 = neutral). */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Durability")
	TMap<EUCDamageType, float> DamageTypeMultiplier;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Durability", meta = (ClampMin = "0", ClampMax = "1"))
	float ArmorAbsorption = 0.65f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Durability", meta = (ClampMin = "0", ClampMax = "1"))
	float ChassisBleed = 0.35f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Durability", meta = (ClampMin = "0"))
	float FireDamagePerSecond = 25.f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Durability")
	float FireDuration = 8.f;

	/** 0 = no shield. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Defense", meta = (ClampMin = "0"))
	float ShieldStrength = 0.f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Defense", meta = (ClampMin = "0"))
	float ShieldRegenPerSecond = 20.f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Defense", meta = (ClampMin = "0"))
	float ShieldRegenDelay = 4.f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Defense")
	TArray<FUCAbilityDefinition> Abilities;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Weapons")
	TObjectPtr<UUCWeaponDefinition> PrimaryWeapon;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Weapons")
	TObjectPtr<UUCWeaponDefinition> SecondaryWeapon;

	/** Collision damage = (impulse - threshold) * scale. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Collision", meta = (ClampMin = "0"))
	float CollisionImpulseThreshold = 400000.f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Collision", meta = (ClampMin = "0"))
	float CollisionDamagePerImpulse = 0.0001f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "AI")
	FUCAIPersonality AIPersonality;

	/** Leave empty for ordinary vehicles. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "AI")
	TArray<FUCBossPhase> BossPhases;

	uc::FVehicleDamageSpec ToCoreDamageSpec() const;
	uc::FShieldSpec ToCoreShieldSpec() const;
};

USTRUCT(BlueprintType)
struct FUCObjectiveDefinition
{
	GENERATED_BODY()

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Objective")
	FName ObjectiveId;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Objective")
	EUCObjectiveType Type = EUCObjectiveType::DestroyTargets;

	/** Count, or seconds for Survive. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Objective", meta = (ClampMin = "1"))
	int32 Required = 1;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Objective")
	bool bOptional = false;
};

USTRUCT(BlueprintType)
struct FUCEnemySpawn
{
	GENERATED_BODY()

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Enemy")
	TObjectPtr<UUCVehicleDefinition> Vehicle;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Enemy", meta = (ClampMin = "1"))
	int32 Count = 1;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Enemy")
	bool bIsBoss = false;
};

/** A PvE mission: objectives plus the opposition. */
UCLASS(BlueprintType)
class UNREALCOMBAT_API UUCMissionDefinition : public UPrimaryDataAsset
{
	GENERATED_BODY()

public:
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Mission")
	FName MissionId;

	/** Mission or BossHunt. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Mission")
	EUCMatchMode Mode = EUCMatchMode::Mission;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Mission")
	TArray<FUCObjectiveDefinition> Objectives;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Mission")
	TArray<FUCEnemySpawn> Enemies;

	/** Seconds; <=0 = untimed. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Mission")
	float TimeLimit = 600.f;

	/** Shared player deaths allowed before failure. Negative = unlimited. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Mission")
	int32 PlayerLives = 2;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Mission", meta = (ClampMin = "1"))
	int32 RequiredLevel = 1;
};

USTRUCT(BlueprintType)
struct FUCCatalogEntry
{
	GENERATED_BODY()

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Catalog")
	FName ItemId;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Catalog")
	EUCItemKind Kind = EUCItemKind::Upgrade;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Catalog")
	EUCCurrency Currency = EUCCurrency::Credits;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Catalog", meta = (ClampMin = "0"))
	int64 Price = 0;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Catalog", meta = (ClampMin = "1"))
	int32 RequiredLevel = 1;

	/** The vehicle / weapon definition this item unlocks, if any. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Catalog")
	TSoftObjectPtr<UPrimaryDataAsset> Definition;
};

/** Everything that can be bought or unlocked. */
UCLASS(BlueprintType)
class UNREALCOMBAT_API UUCCatalog : public UPrimaryDataAsset
{
	GENERATED_BODY()

public:
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Catalog")
	TArray<FUCCatalogEntry> Items;

	uc::FCatalog ToCore() const;
	const FUCCatalogEntry* FindEntry(FName ItemId) const;
};

/** Project-wide tuning (Project Settings > Game > Unreal Combat). */
UCLASS(Config = Game, DefaultConfig, meta = (DisplayName = "Unreal Combat"))
class UNREALCOMBAT_API UUCGameSettings : public UDeveloperSettings
{
	GENERATED_BODY()

public:
	UPROPERTY(Config, EditAnywhere, Category = "Progression", meta = (ClampMin = "1"))
	int32 MaxLevel = 50;

	UPROPERTY(Config, EditAnywhere, Category = "Progression", meta = (ClampMin = "1"))
	int64 BaseXp = 500;

	UPROPERTY(Config, EditAnywhere, Category = "Progression", meta = (ClampMin = "0"))
	int64 XpGrowthPerLevel = 250;

	UPROPERTY(Config, EditAnywhere, Category = "Economy", meta = (ClampMin = "0"))
	int64 StartingCredits = 1000;

	/** Granted free to every new profile. Must exist in the catalog to be equippable. */
	UPROPERTY(Config, EditAnywhere, Category = "Economy")
	TArray<FName> StarterItems;

	UPROPERTY(Config, EditAnywhere, Category = "Economy")
	TSoftObjectPtr<UUCCatalog> Catalog;

	uc::FProgressionSpec ToProgressionSpec() const;
};
