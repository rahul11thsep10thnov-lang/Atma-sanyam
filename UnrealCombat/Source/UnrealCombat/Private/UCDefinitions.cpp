#include "UCDefinitions.h"

#include UE_INLINE_GENERATED_CPP_BY_NAME(UCDefinitions)

uc::FWeaponSpec UUCWeaponDefinition::ToCoreSpec() const
{
	uc::FWeaponSpec Spec;
	Spec.Id = UC::ToStd(WeaponId);
	Spec.Damage = Damage;
	Spec.DamageType = static_cast<uc::EDamageType>(DamageType);
	Spec.FireInterval = FireInterval;
	Spec.MagazineSize = MagazineSize;
	Spec.ReserveAmmo = ReserveAmmo;
	Spec.ReloadTime = ReloadTime;
	Spec.HeatPerShot = HeatPerShot;
	Spec.HeatCoolPerSecond = HeatCoolPerSecond;
	Spec.OverheatRecoverLevel = OverheatRecoverLevel;
	Spec.SpreadDegrees = SpreadDegrees;
	Spec.Range = Range;
	Spec.ProjectileSpeed = ProjectileSpeed;
	Spec.Penetration = Penetration;
	Spec.PelletsPerShot = PelletsPerShot;
	Spec.bAutomatic = bAutomatic;
	return Spec;
}

uc::FAbilitySpec FUCAbilityDefinition::ToCoreSpec() const
{
	uc::FAbilitySpec Spec;
	Spec.Id = UC::ToStd(AbilityId);
	Spec.Duration = Duration;
	Spec.Cooldown = Cooldown;
	Spec.Charges = Charges;
	return Spec;
}

uc::FAIPersonality FUCAIPersonality::ToCore() const
{
	uc::FAIPersonality Out;
	Out.Aggression = Aggression;
	Out.RetreatHealthFraction = RetreatHealthFraction;
	Out.PreferredRangeFraction = PreferredRangeFraction;
	Out.AimToleranceDegrees = AimToleranceDegrees;
	return Out;
}

uc::FVehicleDamageSpec UUCVehicleDefinition::ToCoreDamageSpec() const
{
	uc::FVehicleDamageSpec Spec;
	for (const TPair<EUCVehicleComponent, float>& Pair : ComponentMaxHealth)
	{
		Spec.ComponentMaxHealth[static_cast<int32>(Pair.Key)] = FMath::Max(Pair.Value, 0.f);
	}
	for (const TPair<EUCArmorFacing, float>& Pair : ArmorPoints)
	{
		Spec.ArmorMaxPoints[static_cast<int32>(Pair.Key)] = FMath::Max(Pair.Value, 0.f);
	}
	for (const TPair<EUCDamageType, float>& Pair : DamageTypeMultiplier)
	{
		Spec.TypeMultiplier[static_cast<int32>(Pair.Key)] = FMath::Max(Pair.Value, 0.f);
	}
	Spec.ArmorAbsorption = ArmorAbsorption;
	Spec.ChassisBleed = ChassisBleed;
	Spec.FireDamagePerSecond = FireDamagePerSecond;
	Spec.FireDuration = FireDuration;
	return Spec;
}

uc::FShieldSpec UUCVehicleDefinition::ToCoreShieldSpec() const
{
	uc::FShieldSpec Spec;
	Spec.MaxStrength = ShieldStrength;
	Spec.RegenPerSecond = ShieldRegenPerSecond;
	Spec.RegenDelay = ShieldRegenDelay;
	return Spec;
}

uc::FCatalog UUCCatalog::ToCore() const
{
	uc::FCatalog Catalog;
	for (const FUCCatalogEntry& Entry : Items)
	{
		uc::FCatalogItem Item;
		Item.Id = UC::ToStd(Entry.ItemId);
		Item.Kind = static_cast<uc::EItemKind>(Entry.Kind);
		Item.Currency = static_cast<uc::ECurrency>(Entry.Currency);
		Item.Price = Entry.Price;
		Item.RequiredLevel = Entry.RequiredLevel;
		Catalog.Add(Item);
	}
	return Catalog;
}

const FUCCatalogEntry* UUCCatalog::FindEntry(FName ItemId) const
{
	return Items.FindByPredicate([ItemId](const FUCCatalogEntry& Entry) { return Entry.ItemId == ItemId; });
}

uc::FProgressionSpec UUCGameSettings::ToProgressionSpec() const
{
	uc::FProgressionSpec Spec;
	Spec.MaxLevel = MaxLevel;
	Spec.BaseXp = BaseXp;
	Spec.XpGrowthPerLevel = XpGrowthPerLevel;
	return Spec;
}
