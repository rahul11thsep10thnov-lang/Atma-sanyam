#include "UCCore/Weapon.h"

namespace uc
{
	// Guards against a huge DeltaSeconds producing an unbounded burst in one step.
	static const int32_t MaxShotsPerTick = 16;

	void FWeapon::Reset(const FWeaponSpec& InSpec)
	{
		Spec = InSpec;
		if (!(Spec.FireInterval > 0.001f))
		{
			Spec.FireInterval = 0.001f;
		}
		AmmoInMagazine = Spec.MagazineSize > 0 ? Spec.MagazineSize : 0;
		ReserveAmmo = Spec.ReserveAmmo;
		Heat = 0.f;
		Cooldown = 0.f;
		ReloadRemaining = 0.f;
		bOverheated = false;
		bTriggerHeld = false;
		bTriggerConsumed = false;
		bEnabled = true;
	}

	void FWeapon::SetTriggerHeld(bool bHeld)
	{
		if (!bHeld)
		{
			bTriggerConsumed = false;
		}
		bTriggerHeld = bHeld;
	}

	bool FWeapon::CanFire() const
	{
		if (!bEnabled || bOverheated || IsReloading())
		{
			return false;
		}
		return !UsesAmmo() || AmmoInMagazine > 0;
	}

	bool FWeapon::StartReload()
	{
		if (!UsesAmmo() || IsReloading() || AmmoInMagazine >= Spec.MagazineSize || ReserveAmmo == 0)
		{
			return false;
		}
		ReloadRemaining = Spec.ReloadTime > 0.f ? Spec.ReloadTime : 0.0001f;
		return true;
	}

	void FWeapon::FinishReload()
	{
		ReloadRemaining = 0.f;
		const int32_t Needed = Spec.MagazineSize - AmmoInMagazine;
		if (ReserveAmmo < 0)
		{
			AmmoInMagazine = Spec.MagazineSize;
		}
		else
		{
			const int32_t Loaded = Needed < ReserveAmmo ? Needed : ReserveAmmo;
			AmmoInMagazine += Loaded;
			ReserveAmmo -= Loaded;
		}
	}

	void FWeapon::AddReserveAmmo(int32_t Rounds)
	{
		if (Rounds > 0 && ReserveAmmo >= 0)
		{
			ReserveAmmo += Rounds;
		}
	}

	int32_t FWeapon::Tick(float DeltaSeconds)
	{
		if (!(DeltaSeconds > 0.f))
		{
			return 0;
		}

		// Cooling always runs, including during reloads and lockouts.
		if (Heat > 0.f)
		{
			Heat -= Spec.HeatCoolPerSecond * DeltaSeconds;
			if (Heat < 0.f)
			{
				Heat = 0.f;
			}
		}
		if (bOverheated && Heat <= Spec.OverheatRecoverLevel)
		{
			bOverheated = false;
		}

		Cooldown -= DeltaSeconds;

		if (IsReloading())
		{
			ReloadRemaining -= DeltaSeconds;
			if (ReloadRemaining <= 0.f)
			{
				FinishReload();
			}
			if (Cooldown < 0.f)
			{
				Cooldown = 0.f;
			}
			return 0;
		}

		int32_t Shots = 0;
		while (bTriggerHeld && !bTriggerConsumed && Cooldown < 0.f && CanFire() && Shots < MaxShotsPerTick)
		{
			++Shots;
			Cooldown += Spec.FireInterval;
			if (UsesAmmo())
			{
				--AmmoInMagazine;
			}
			if (Spec.HeatPerShot > 0.f)
			{
				Heat += Spec.HeatPerShot;
				if (Heat >= 1.f)
				{
					Heat = 1.f;
					bOverheated = true;
				}
			}
			if (!Spec.bAutomatic)
			{
				bTriggerConsumed = true;
			}
		}

		// Unused fire time is not banked: the next shot is never "owed" from idle time.
		if (Cooldown < 0.f)
		{
			Cooldown = 0.f;
		}

		// Running dry starts a reload automatically when spare rounds exist.
		if (UsesAmmo() && AmmoInMagazine == 0)
		{
			StartReload();
		}
		return Shots;
	}
}
