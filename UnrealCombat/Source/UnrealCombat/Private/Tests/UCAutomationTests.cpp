// In-editor automation tests (Session Frontend > Automation > UnrealCombat).
// The rules themselves are covered headlessly by CoreTests; these check the Unreal-side glue.
#include "Misc/AutomationTest.h"
#include "UCDefinitions.h"
#include "UCVehicleHealthComponent.h"

#if WITH_DEV_AUTOMATION_TESTS

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUCDefinitionConversionTest, "UnrealCombat.Definitions.ConvertToCore", EAutomationTestFlags_ApplicationContextMask | EAutomationTestFlags::ProductFilter)

bool FUCDefinitionConversionTest::RunTest(const FString& Parameters)
{
	UUCWeaponDefinition* Weapon = NewObject<UUCWeaponDefinition>();
	Weapon->WeaponId = TEXT("weapon.test");
	Weapon->Damage = 42.f;
	Weapon->DamageType = EUCDamageType::Energy;
	Weapon->MagazineSize = 0;
	const uc::FWeaponSpec WeaponSpec = Weapon->ToCoreSpec();
	TestEqual(TEXT("weapon id"), UC::ToFString(WeaponSpec.Id), FString(TEXT("weapon.test")));
	TestEqual(TEXT("weapon damage"), WeaponSpec.Damage, 42.f);
	TestTrue(TEXT("weapon damage type"), WeaponSpec.DamageType == uc::EDamageType::Energy);
	TestEqual(TEXT("weapon magazine"), WeaponSpec.MagazineSize, 0);

	UUCVehicleDefinition* Vehicle = NewObject<UUCVehicleDefinition>();
	Vehicle->ComponentMaxHealth.Add(EUCVehicleComponent::Engine, 555.f);
	Vehicle->ArmorPoints.Add(EUCArmorFacing::Rear, 77.f);
	Vehicle->DamageTypeMultiplier.Add(EUCDamageType::Fire, 0.5f);
	const uc::FVehicleDamageSpec DamageSpec = Vehicle->ToCoreDamageSpec();
	TestEqual(TEXT("engine health override"), DamageSpec.ComponentMaxHealth[static_cast<int32>(uc::EVehicleComponent::Engine)], 555.f);
	TestEqual(TEXT("chassis keeps core default"), DamageSpec.ComponentMaxHealth[0], uc::FVehicleDamageSpec().ComponentMaxHealth[0]);
	TestEqual(TEXT("rear armour override"), DamageSpec.ArmorMaxPoints[static_cast<int32>(uc::EArmorFacing::Rear)], 77.f);
	TestEqual(TEXT("fire multiplier"), DamageSpec.TypeMultiplier[static_cast<int32>(uc::EDamageType::Fire)], 0.5f);

	UUCCatalog* Catalog = NewObject<UUCCatalog>();
	FUCCatalogEntry Entry;
	Entry.ItemId = TEXT("vehicle.test");
	Entry.Kind = EUCItemKind::Vehicle;
	Entry.Price = 1234;
	Catalog->Items.Add(Entry);
	const uc::FCatalog CoreCatalog = Catalog->ToCore();
	const uc::FCatalogItem* Item = CoreCatalog.Find("vehicle.test");
	TestNotNull(TEXT("catalog item"), Item);
	if (Item != nullptr)
	{
		TestTrue(TEXT("catalog price and kind"), Item->Price == 1234 && Item->Kind == uc::EItemKind::Vehicle);
	}
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUCHitLocationTest, "UnrealCombat.Health.HitLocationHeuristic", EAutomationTestFlags_ApplicationContextMask | EAutomationTestFlags::ProductFilter)

bool FUCHitLocationTest::RunTest(const FString& Parameters)
{
	using C = EUCVehicleComponent;
	TestTrue(TEXT("front-left wheel"), UUCVehicleHealthComponent::ComponentFromNormalizedLocation(FVector(0.8, -0.9, -0.8)) == C::WheelFL);
	TestTrue(TEXT("front-right wheel"), UUCVehicleHealthComponent::ComponentFromNormalizedLocation(FVector(0.8, 0.9, -0.8)) == C::WheelFR);
	TestTrue(TEXT("rear-left wheel"), UUCVehicleHealthComponent::ComponentFromNormalizedLocation(FVector(-0.8, -0.9, -0.8)) == C::WheelRL);
	TestTrue(TEXT("rear-right wheel"), UUCVehicleHealthComponent::ComponentFromNormalizedLocation(FVector(-0.8, 0.9, -0.8)) == C::WheelRR);
	TestTrue(TEXT("engine bay"), UUCVehicleHealthComponent::ComponentFromNormalizedLocation(FVector(0.8, 0.0, 0.2)) == C::Engine);
	TestTrue(TEXT("fuel tank"), UUCVehicleHealthComponent::ComponentFromNormalizedLocation(FVector(-0.8, 0.0, 0.2)) == C::FuelTank);
	TestTrue(TEXT("cabin"), UUCVehicleHealthComponent::ComponentFromNormalizedLocation(FVector(0.0, 0.0, 0.5)) == C::Chassis);
	return true;
}

#endif // WITH_DEV_AUTOMATION_TESTS
