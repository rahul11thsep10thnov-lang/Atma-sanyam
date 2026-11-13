#include "UCCore/Defense.h"

namespace uc
{
	void FShield::Reset(const FShieldSpec& InSpec)
	{
		Spec = InSpec;
		Strength = Spec.MaxStrength > 0.f ? Spec.MaxStrength : 0.f;
		TimeSinceDamage = 0.f;
	}

	float FShield::Absorb(float Amount)
	{
		if (!(Amount > 0.f))
		{
			return 0.f;
		}
		TimeSinceDamage = 0.f;
		const float Soaked = Amount < Strength ? Amount : Strength;
		Strength -= Soaked;
		return Amount - Soaked;
	}

	void FShield::Tick(float DeltaSeconds)
	{
		if (!(DeltaSeconds > 0.f) || !(Spec.MaxStrength > 0.f))
		{
			return;
		}
		TimeSinceDamage += DeltaSeconds;
		if (TimeSinceDamage >= Spec.RegenDelay && Strength < Spec.MaxStrength)
		{
			Strength += Spec.RegenPerSecond * DeltaSeconds;
			if (Strength > Spec.MaxStrength)
			{
				Strength = Spec.MaxStrength;
			}
		}
	}

	void FAbility::Reset(const FAbilitySpec& InSpec)
	{
		Spec = InSpec;
		ActiveRemaining = 0.f;
		CooldownRemaining = 0.f;
		ChargesRemaining = Spec.Charges;
		bActive = false;
	}

	bool FAbility::Activate()
	{
		if (!CanActivate())
		{
			return false;
		}
		if (ChargesRemaining > 0)
		{
			--ChargesRemaining;
		}
		if (Spec.Duration > 0.f)
		{
			bActive = true;
			ActiveRemaining = Spec.Duration;
		}
		else
		{
			CooldownRemaining = Spec.Cooldown;
		}
		return true;
	}

	bool FAbility::Tick(float DeltaSeconds)
	{
		if (!(DeltaSeconds > 0.f))
		{
			return false;
		}
		if (bActive)
		{
			ActiveRemaining -= DeltaSeconds;
			if (ActiveRemaining <= 0.f)
			{
				ActiveRemaining = 0.f;
				bActive = false;
				CooldownRemaining = Spec.Cooldown;
				return true;
			}
			return false;
		}
		if (CooldownRemaining > 0.f)
		{
			CooldownRemaining -= DeltaSeconds;
			if (CooldownRemaining < 0.f)
			{
				CooldownRemaining = 0.f;
			}
		}
		return false;
	}
}
