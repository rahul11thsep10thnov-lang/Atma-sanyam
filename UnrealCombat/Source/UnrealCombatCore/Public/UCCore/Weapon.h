#pragma once

#include "UCCore/Types.h"

namespace uc
{
	/** Static tuning for one weapon. Authored as data (UUCWeaponDefinition in Unreal). */
	struct FWeaponSpec
	{
		FId Id;
		float Damage = 20.f;
		EDamageType DamageType = EDamageType::Kinetic;
		/** Seconds between shots. */
		float FireInterval = 0.1f;
		/** Rounds per magazine. 0 means the weapon does not use ammunition (heat-limited). */
		int32_t MagazineSize = 30;
		/** Spare rounds carried at spawn. Negative means unlimited reserve. */
		int32_t ReserveAmmo = 120;
		float ReloadTime = 2.f;
		/** Heat added per shot; the weapon locks out at 1.0. 0 disables heat. */
		float HeatPerShot = 0.f;
		float HeatCoolPerSecond = 0.25f;
		/** After overheating the weapon stays locked until heat falls to this level. */
		float OverheatRecoverLevel = 0.3f;
		float SpreadDegrees = 1.f;
		float Range = 15000.f;
		/** 0 = hitscan, otherwise a projectile is spawned with this speed. */
		float ProjectileSpeed = 0.f;
		float Penetration = 0.f;
		int32_t PelletsPerShot = 1;
		bool bAutomatic = true;
	};

	class UCCORE_API FWeapon
	{
	public:
		FWeapon() { Reset(FWeaponSpec()); }
		explicit FWeapon(const FWeaponSpec& InSpec) { Reset(InSpec); }

		void Reset(const FWeaponSpec& InSpec);

		void SetTriggerHeld(bool bHeld);
		/** External lockout, e.g. the weapon mount was destroyed. */
		void SetEnabled(bool bInEnabled) { bEnabled = bInEnabled; }

		/** Advance the weapon. Returns the number of shots fired during this step. */
		int32_t Tick(float DeltaSeconds);

		/** Begin a manual reload. Returns false when a reload is impossible or pointless. */
		bool StartReload();
		void AddReserveAmmo(int32_t Rounds);

		bool UsesAmmo() const { return Spec.MagazineSize > 0; }
		int32_t GetAmmoInMagazine() const { return AmmoInMagazine; }
		int32_t GetReserveAmmo() const { return ReserveAmmo; }
		float GetHeat() const { return Heat; }
		bool IsOverheated() const { return bOverheated; }
		bool IsReloading() const { return ReloadRemaining > 0.f; }
		float GetReloadRemaining() const { return ReloadRemaining; }
		bool IsEnabled() const { return bEnabled; }
		/** True when pulling the trigger right now would fire (ignoring the fire-interval cooldown). */
		bool CanFire() const;
		const FWeaponSpec& GetSpec() const { return Spec; }

	private:
		void FinishReload();

		FWeaponSpec Spec;
		int32_t AmmoInMagazine = 0;
		int32_t ReserveAmmo = 0;
		float Heat = 0.f;
		float Cooldown = 0.f;
		float ReloadRemaining = 0.f;
		bool bOverheated = false;
		bool bTriggerHeld = false;
		bool bTriggerConsumed = false;
		bool bEnabled = true;
	};
}
