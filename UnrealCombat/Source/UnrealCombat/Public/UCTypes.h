#pragma once

#include "CoreMinimal.h"
#include "UCCore/CombatAI.h"
#include "UCCore/Match.h"
#include "UCCore/Profile.h"
#include "UCCore/VehicleDamage.h"
#include "UCTypes.generated.h"

// Reflected mirrors of the rules-core enums. Order must match; see the static_asserts below.

UENUM(BlueprintType)
enum class EUCVehicleComponent : uint8
{
	Chassis,
	Engine,
	FuelTank,
	WheelFL,
	WheelFR,
	WheelRL,
	WheelRR,
	WeaponPrimary,
	WeaponSecondary
};

UENUM(BlueprintType)
enum class EUCArmorFacing : uint8
{
	Front,
	Rear,
	Left,
	Right,
	Top,
	Bottom
};

UENUM(BlueprintType)
enum class EUCDamageType : uint8
{
	Kinetic,
	Explosive,
	Energy,
	Fire,
	Collision
};

UENUM(BlueprintType)
enum class EUCMatchMode : uint8
{
	FreeForAll,
	TeamDeathmatch,
	Mission,
	BossHunt
};

UENUM(BlueprintType)
enum class EUCMatchPhase : uint8
{
	Warmup,
	InProgress,
	Finished
};

UENUM(BlueprintType)
enum class EUCObjectiveType : uint8
{
	DestroyTargets,
	DefeatBoss,
	Survive,
	ReachCheckpoints
};

UENUM(BlueprintType)
enum class EUCAIState : uint8
{
	Patrol,
	Pursue,
	Engage,
	Evade,
	Retreat
};

UENUM(BlueprintType)
enum class EUCCurrency : uint8
{
	Credits,
	Premium
};

UENUM(BlueprintType)
enum class EUCItemKind : uint8
{
	Vehicle,
	Weapon,
	Upgrade,
	Consumable
};

UENUM(BlueprintType)
enum class EUCLoadoutSlot : uint8
{
	Vehicle,
	PrimaryWeapon,
	SecondaryWeapon
};

UENUM(BlueprintType)
enum class EUCTransactionResult : uint8
{
	Ok,
	Duplicate,
	InvalidId,
	InvalidAmount,
	InsufficientFunds,
	UnknownItem,
	AlreadyOwned,
	NotOwned,
	LevelTooLow,
	WrongItemKind
};

static_assert(static_cast<int32>(EUCVehicleComponent::WeaponSecondary) + 1 == uc::NumVehicleComponents, "EUCVehicleComponent out of sync with core");
static_assert(static_cast<int32>(EUCArmorFacing::Bottom) + 1 == uc::NumArmorFacings, "EUCArmorFacing out of sync with core");
static_assert(static_cast<int32>(EUCDamageType::Collision) + 1 == uc::NumDamageTypes, "EUCDamageType out of sync with core");
static_assert(static_cast<uint8>(EUCMatchMode::BossHunt) == static_cast<uint8>(uc::EMatchMode::BossHunt), "EUCMatchMode out of sync with core");
static_assert(static_cast<uint8>(EUCMatchPhase::Finished) == static_cast<uint8>(uc::EMatchPhase::Finished), "EUCMatchPhase out of sync with core");
static_assert(static_cast<uint8>(EUCObjectiveType::ReachCheckpoints) == static_cast<uint8>(uc::EObjectiveType::ReachCheckpoints), "EUCObjectiveType out of sync with core");
static_assert(static_cast<uint8>(EUCAIState::Retreat) == static_cast<uint8>(uc::EAIState::Retreat), "EUCAIState out of sync with core");
static_assert(static_cast<uint8>(EUCItemKind::Consumable) == static_cast<uint8>(uc::EItemKind::Consumable), "EUCItemKind out of sync with core");
static_assert(static_cast<uint8>(EUCTransactionResult::WrongItemKind) == static_cast<uint8>(uc::ETxResult::WrongItemKind), "EUCTransactionResult out of sync with core");

namespace UC
{
	inline std::string ToStd(const FString& In) { return std::string(TCHAR_TO_UTF8(*In)); }
	inline std::string ToStd(const FName& In) { return In.IsNone() ? std::string() : ToStd(In.ToString()); }
	inline FString ToFString(const std::string& In) { return FString(UTF8_TO_TCHAR(In.c_str())); }
	inline FName ToFName(const std::string& In) { return In.empty() ? FName() : FName(*ToFString(In)); }
}

/** One hit against a vehicle, in gameplay terms. */
USTRUCT(BlueprintType)
struct FUCHitInfo
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Hit")
	float Amount = 0.f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Hit")
	EUCDamageType DamageType = EUCDamageType::Kinetic;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Hit")
	EUCArmorFacing Facing = EUCArmorFacing::Front;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Hit")
	EUCVehicleComponent Target = EUCVehicleComponent::Chassis;

	/** Share of the hit that ignores armour (0..1). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Hit")
	float Penetration = 0.f;
};

/** What one player did in a finished match; the input to rewards. */
USTRUCT(BlueprintType)
struct FUCMatchResult
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Match")
	FString MatchId;

	UPROPERTY(BlueprintReadOnly, Category = "Match")
	FName MissionId;

	UPROPERTY(BlueprintReadOnly, Category = "Match")
	int32 Kills = 0;

	UPROPERTY(BlueprintReadOnly, Category = "Match")
	int32 Assists = 0;

	UPROPERTY(BlueprintReadOnly, Category = "Match")
	int32 Deaths = 0;

	UPROPERTY(BlueprintReadOnly, Category = "Match")
	int32 BossesDefeated = 0;

	UPROPERTY(BlueprintReadOnly, Category = "Match")
	float DamageDealt = 0.f;

	UPROPERTY(BlueprintReadOnly, Category = "Match")
	bool bWon = false;

	UPROPERTY(BlueprintReadOnly, Category = "Match")
	bool bMissionCompleted = false;
};
