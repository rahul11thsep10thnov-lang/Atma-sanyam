#pragma once

#include "UCCore/Types.h"

namespace uc
{
	struct FShieldSpec
	{
		float MaxStrength = 0.f;
		float RegenPerSecond = 20.f;
		/** Seconds without damage before the shield starts to recharge. */
		float RegenDelay = 4.f;
	};

	/** Regenerating energy barrier that takes damage before armour and components. */
	class UCCORE_API FShield
	{
	public:
		FShield() = default;
		explicit FShield(const FShieldSpec& InSpec) { Reset(InSpec); }

		void Reset(const FShieldSpec& InSpec);
		/** Soak up to Amount of damage. Returns the damage that got through. */
		float Absorb(float Amount);
		void Tick(float DeltaSeconds);

		float GetStrength() const { return Strength; }
		float GetFraction() const { return Spec.MaxStrength > 0.f ? Strength / Spec.MaxStrength : 0.f; }
		bool IsDepleted() const { return Strength <= 0.f; }
		const FShieldSpec& GetSpec() const { return Spec; }
		void SetStrength(float InStrength) { Strength = ClampF(InStrength, 0.f, Spec.MaxStrength > 0.f ? Spec.MaxStrength : 0.f); }

	private:
		FShieldSpec Spec;
		float Strength = 0.f;
		float TimeSinceDamage = 0.f;
	};

	struct FAbilitySpec
	{
		FId Id;
		/** How long the effect lasts once triggered (0 = instant). */
		float Duration = 0.f;
		/** Seconds between the end of the effect and the next use. */
		float Cooldown = 10.f;
		/** Uses per life. Negative means unlimited. */
		int32_t Charges = -1;
	};

	/** Generic timed ability: countermeasures, boost, repair kit, boss specials. */
	class UCCORE_API FAbility
	{
	public:
		FAbility() = default;
		explicit FAbility(const FAbilitySpec& InSpec) { Reset(InSpec); }

		void Reset(const FAbilitySpec& InSpec);
		bool CanActivate() const { return !bActive && CooldownRemaining <= 0.f && ChargesRemaining != 0; }
		bool Activate();
		/** Returns true on the step the effect ends. */
		bool Tick(float DeltaSeconds);

		bool IsActive() const { return bActive; }
		float GetCooldownRemaining() const { return CooldownRemaining; }
		float GetActiveRemaining() const { return ActiveRemaining; }
		int32_t GetChargesRemaining() const { return ChargesRemaining; }
		const FAbilitySpec& GetSpec() const { return Spec; }

	private:
		FAbilitySpec Spec;
		float ActiveRemaining = 0.f;
		float CooldownRemaining = 0.f;
		int32_t ChargesRemaining = -1;
		bool bActive = false;
	};
}
