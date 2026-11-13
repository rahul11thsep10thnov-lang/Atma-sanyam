#pragma once

#include "UCCore/Types.h"

namespace uc
{
	enum class EVehicleComponent : uint8_t
	{
		Chassis = 0,
		Engine,
		FuelTank,
		WheelFL,
		WheelFR,
		WheelRL,
		WheelRR,
		WeaponPrimary,
		WeaponSecondary,
		Count
	};

	enum class EArmorFacing : uint8_t
	{
		Front = 0,
		Rear,
		Left,
		Right,
		Top,
		Bottom,
		Count
	};

	constexpr int32_t NumVehicleComponents = static_cast<int32_t>(EVehicleComponent::Count);
	constexpr int32_t NumArmorFacings = static_cast<int32_t>(EArmorFacing::Count);
	constexpr int32_t NumDamageTypes = static_cast<int32_t>(EDamageType::Count);
	constexpr int32_t NumWheels = 4;

	/** Static tuning for one vehicle. Authored as data (UUCVehicleDefinition in Unreal). */
	struct FVehicleDamageSpec
	{
		float ComponentMaxHealth[NumVehicleComponents] = { 1000.f, 300.f, 200.f, 150.f, 150.f, 150.f, 150.f, 200.f, 200.f };
		float ArmorMaxPoints[NumArmorFacings] = { 400.f, 250.f, 300.f, 300.f, 150.f, 100.f };
		/** Incoming damage multiplier per damage type (1 = neutral, <1 = resistant). */
		float TypeMultiplier[NumDamageTypes] = { 1.f, 1.f, 1.f, 1.f, 1.f };
		/** Share of non-penetrating damage intact armour soaks up (0..1). */
		float ArmorAbsorption = 0.65f;
		/** Share of damage dealt to a sub-component that also reaches the chassis (0..1). */
		float ChassisBleed = 0.35f;
		/** Chassis damage per second while the fuel tank burns. */
		float FireDamagePerSecond = 25.f;
		/** Seconds a fire burns before it goes out by itself (<=0 burns until extinguished). */
		float FireDuration = 8.f;
	};

	struct FHit
	{
		float Amount = 0.f;
		EDamageType Type = EDamageType::Kinetic;
		EArmorFacing Facing = EArmorFacing::Front;
		EVehicleComponent Target = EVehicleComponent::Chassis;
		/** Share of the hit that ignores armour (0..1). */
		float Penetration = 0.f;
	};

	struct FDamageResult
	{
		float AbsorbedByArmor = 0.f;
		float AppliedToComponent = 0.f;
		float AppliedToChassis = 0.f;
		bool bComponentDestroyed = false;
		EVehicleComponent DestroyedComponent = EVehicleComponent::Chassis;
		bool bVehicleDestroyed = false;
		bool bFireStarted = false;
	};

	/** How current damage changes handling and combat. Consumed by the vehicle movement layer. */
	struct FPerformanceModifiers
	{
		float EnginePowerScale = 1.f;
		float SteeringScale = 1.f;
		float WheelGripScale[NumWheels] = { 1.f, 1.f, 1.f, 1.f };
		bool bImmobilised = false;
		bool bPrimaryWeaponOnline = true;
		bool bSecondaryWeaponOnline = true;
	};

	class UCCORE_API FVehicleDamageModel
	{
	public:
		FVehicleDamageModel() { Reset(FVehicleDamageSpec()); }
		explicit FVehicleDamageModel(const FVehicleDamageSpec& InSpec) { Reset(InSpec); }

		/** Restore everything to factory state with a (possibly new) spec. */
		void Reset(const FVehicleDamageSpec& InSpec);

		FDamageResult ApplyHit(const FHit& Hit);

		/** Advance timed effects (fire). Returns chassis damage dealt this step. */
		FDamageResult Tick(float DeltaSeconds);

		/** Repair one component; returns the health actually restored. Destroyed vehicles cannot be repaired. */
		float Repair(EVehicleComponent Component, float Amount);
		float RepairArmor(EArmorFacing Facing, float Amount);
		void ExtinguishFire() { FireRemaining = 0.f; bOnFire = false; }

		float GetHealth(EVehicleComponent Component) const { return Health[static_cast<int32_t>(Component)]; }
		float GetMaxHealth(EVehicleComponent Component) const { return Spec.ComponentMaxHealth[static_cast<int32_t>(Component)]; }
		float GetHealthFraction(EVehicleComponent Component) const;
		float GetArmor(EArmorFacing Facing) const { return Armor[static_cast<int32_t>(Facing)]; }
		float GetArmorFraction(EArmorFacing Facing) const;
		bool IsComponentDestroyed(EVehicleComponent Component) const { return GetHealth(Component) <= 0.f; }
		bool IsDestroyed() const { return IsComponentDestroyed(EVehicleComponent::Chassis); }
		bool IsOnFire() const { return bOnFire; }

		FPerformanceModifiers GetPerformanceModifiers() const;
		const FVehicleDamageSpec& GetSpec() const { return Spec; }

		/** Snapshot restore for replication / save games. Values are clamped to the spec. */
		void SetState(const float* InHealth, const float* InArmor, bool bInOnFire);

	private:
		/** Returns damage actually removed from the component. */
		float DamageComponent(EVehicleComponent Component, float Amount, FDamageResult& Result);

		FVehicleDamageSpec Spec;
		float Health[NumVehicleComponents] = {};
		float Armor[NumArmorFacings] = {};
		float FireRemaining = 0.f;
		bool bOnFire = false;
	};
}
