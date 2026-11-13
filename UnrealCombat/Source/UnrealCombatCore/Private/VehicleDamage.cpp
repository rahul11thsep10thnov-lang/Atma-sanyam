#include "UCCore/VehicleDamage.h"

namespace uc
{
	bool IsValidId(const FId& Id)
	{
		if (Id.empty() || Id.size() > 64)
		{
			return false;
		}
		for (const char C : Id)
		{
			const bool bOk = (C >= 'a' && C <= 'z') || (C >= 'A' && C <= 'Z') || (C >= '0' && C <= '9') || C == '_' || C == '.' || C == '-';
			if (!bOk)
			{
				return false;
			}
		}
		return true;
	}

	void FVehicleDamageModel::Reset(const FVehicleDamageSpec& InSpec)
	{
		Spec = InSpec;
		for (int32_t i = 0; i < NumVehicleComponents; ++i)
		{
			Health[i] = Spec.ComponentMaxHealth[i] > 0.f ? Spec.ComponentMaxHealth[i] : 0.f;
		}
		for (int32_t i = 0; i < NumArmorFacings; ++i)
		{
			Armor[i] = Spec.ArmorMaxPoints[i] > 0.f ? Spec.ArmorMaxPoints[i] : 0.f;
		}
		FireRemaining = 0.f;
		bOnFire = false;
	}

	float FVehicleDamageModel::GetHealthFraction(EVehicleComponent Component) const
	{
		const float Max = GetMaxHealth(Component);
		return Max > 0.f ? ClampF(GetHealth(Component) / Max, 0.f, 1.f) : 0.f;
	}

	float FVehicleDamageModel::GetArmorFraction(EArmorFacing Facing) const
	{
		const float Max = Spec.ArmorMaxPoints[static_cast<int32_t>(Facing)];
		return Max > 0.f ? ClampF(GetArmor(Facing) / Max, 0.f, 1.f) : 0.f;
	}

	float FVehicleDamageModel::DamageComponent(EVehicleComponent Component, float Amount, FDamageResult& Result)
	{
		const int32_t Index = static_cast<int32_t>(Component);
		if (Amount <= 0.f || Health[Index] <= 0.f)
		{
			return 0.f;
		}
		const float Applied = Amount < Health[Index] ? Amount : Health[Index];
		Health[Index] -= Applied;
		if (Health[Index] <= 0.f)
		{
			Health[Index] = 0.f;
			if (Component == EVehicleComponent::Chassis)
			{
				Result.bVehicleDestroyed = true;
				bOnFire = false;
				FireRemaining = 0.f;
			}
			else
			{
				// Report the first sub-component lost in this hit.
				if (!Result.bComponentDestroyed)
				{
					Result.bComponentDestroyed = true;
					Result.DestroyedComponent = Component;
				}
				if (Component == EVehicleComponent::FuelTank && !bOnFire)
				{
					bOnFire = true;
					FireRemaining = Spec.FireDuration;
					Result.bFireStarted = true;
				}
			}
		}
		return Applied;
	}

	FDamageResult FVehicleDamageModel::ApplyHit(const FHit& Hit)
	{
		FDamageResult Result;
		if (IsDestroyed() || !(Hit.Amount > 0.f))
		{
			return Result;
		}

		float Damage = Hit.Amount * Spec.TypeMultiplier[static_cast<int32_t>(Hit.Type)];
		if (!(Damage > 0.f))
		{
			return Result;
		}

		// Ablative armour soaks a share of the non-penetrating part of the hit.
		const int32_t FacingIndex = static_cast<int32_t>(Hit.Facing);
		const float Penetration = ClampF(Hit.Penetration, 0.f, 1.f);
		const float Soakable = Damage * (1.f - Penetration) * ClampF(Spec.ArmorAbsorption, 0.f, 1.f);
		const float Absorbed = Soakable < Armor[FacingIndex] ? Soakable : Armor[FacingIndex];
		Armor[FacingIndex] -= Absorbed;
		Damage -= Absorbed;
		Result.AbsorbedByArmor = Absorbed;

		EVehicleComponent Target = Hit.Target;
		if (Target != EVehicleComponent::Chassis && IsComponentDestroyed(Target))
		{
			// Nothing left to hit there: the whole remainder goes to the chassis.
			Target = EVehicleComponent::Chassis;
		}

		if (Target == EVehicleComponent::Chassis)
		{
			Result.AppliedToChassis = DamageComponent(EVehicleComponent::Chassis, Damage, Result);
		}
		else
		{
			const float Bleed = ClampF(Spec.ChassisBleed, 0.f, 1.f);
			const float ToComponent = Damage * (1.f - Bleed);
			Result.AppliedToComponent = DamageComponent(Target, ToComponent, Result);
			// Overkill on the component spills onto the chassis together with the bleed share.
			const float ToChassis = Damage * Bleed + (ToComponent - Result.AppliedToComponent);
			Result.AppliedToChassis = DamageComponent(EVehicleComponent::Chassis, ToChassis, Result);
		}
		return Result;
	}

	FDamageResult FVehicleDamageModel::Tick(float DeltaSeconds)
	{
		FDamageResult Result;
		if (!bOnFire || IsDestroyed() || !(DeltaSeconds > 0.f))
		{
			return Result;
		}
		float BurnTime = DeltaSeconds;
		if (Spec.FireDuration > 0.f)
		{
			if (BurnTime >= FireRemaining)
			{
				BurnTime = FireRemaining;
				bOnFire = false;
			}
			FireRemaining -= BurnTime;
		}
		Result.AppliedToChassis = DamageComponent(EVehicleComponent::Chassis, Spec.FireDamagePerSecond * BurnTime, Result);
		return Result;
	}

	float FVehicleDamageModel::Repair(EVehicleComponent Component, float Amount)
	{
		if (IsDestroyed() || !(Amount > 0.f))
		{
			return 0.f;
		}
		const int32_t Index = static_cast<int32_t>(Component);
		const float Missing = Spec.ComponentMaxHealth[Index] - Health[Index];
		const float Restored = Amount < Missing ? Amount : Missing;
		Health[Index] += Restored;
		return Restored;
	}

	float FVehicleDamageModel::RepairArmor(EArmorFacing Facing, float Amount)
	{
		if (IsDestroyed() || !(Amount > 0.f))
		{
			return 0.f;
		}
		const int32_t Index = static_cast<int32_t>(Facing);
		const float Missing = Spec.ArmorMaxPoints[Index] - Armor[Index];
		const float Restored = Amount < Missing ? Amount : Missing;
		Armor[Index] += Restored;
		return Restored;
	}

	FPerformanceModifiers FVehicleDamageModel::GetPerformanceModifiers() const
	{
		FPerformanceModifiers Mods;
		if (IsDestroyed())
		{
			Mods.EnginePowerScale = 0.f;
			Mods.SteeringScale = 0.f;
			Mods.bImmobilised = true;
			Mods.bPrimaryWeaponOnline = false;
			Mods.bSecondaryWeaponOnline = false;
			for (float& Grip : Mods.WheelGripScale)
			{
				Grip = 0.f;
			}
			return Mods;
		}

		// Engine: full power above half health, then falls off to 35% just before failure.
		const float Engine = GetHealthFraction(EVehicleComponent::Engine);
		if (Engine <= 0.f)
		{
			Mods.EnginePowerScale = 0.f;
			Mods.bImmobilised = true;
		}
		else if (Engine < 0.5f)
		{
			Mods.EnginePowerScale = LerpF(0.35f, 1.f, Engine / 0.5f);
		}

		// Wheels: grip fades with damage; a destroyed wheel keeps a little drag (running on the rim).
		const EVehicleComponent Wheels[NumWheels] = { EVehicleComponent::WheelFL, EVehicleComponent::WheelFR, EVehicleComponent::WheelRL, EVehicleComponent::WheelRR };
		for (int32_t i = 0; i < NumWheels; ++i)
		{
			const float Fraction = GetHealthFraction(Wheels[i]);
			Mods.WheelGripScale[i] = Fraction <= 0.f ? 0.25f : LerpF(0.6f, 1.f, Fraction);
		}
		// Steering depends on the front axle.
		Mods.SteeringScale = 0.5f * (Mods.WheelGripScale[0] + Mods.WheelGripScale[1]);

		Mods.bPrimaryWeaponOnline = !IsComponentDestroyed(EVehicleComponent::WeaponPrimary);
		Mods.bSecondaryWeaponOnline = !IsComponentDestroyed(EVehicleComponent::WeaponSecondary);
		return Mods;
	}

	void FVehicleDamageModel::SetState(const float* InHealth, const float* InArmor, bool bInOnFire)
	{
		for (int32_t i = 0; i < NumVehicleComponents; ++i)
		{
			Health[i] = ClampF(InHealth[i], 0.f, Spec.ComponentMaxHealth[i] > 0.f ? Spec.ComponentMaxHealth[i] : 0.f);
		}
		for (int32_t i = 0; i < NumArmorFacings; ++i)
		{
			Armor[i] = ClampF(InArmor[i], 0.f, Spec.ArmorMaxPoints[i] > 0.f ? Spec.ArmorMaxPoints[i] : 0.f);
		}
		bOnFire = bInOnFire && !IsDestroyed();
		FireRemaining = bOnFire ? Spec.FireDuration : 0.f;
	}
}
