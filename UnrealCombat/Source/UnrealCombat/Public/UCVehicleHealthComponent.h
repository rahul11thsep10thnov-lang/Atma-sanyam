#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "UCCore/Defense.h"
#include "UCCore/VehicleDamage.h"
#include "UCTypes.h"
#include "UCVehicleHealthComponent.generated.h"

class UUCVehicleDefinition;
class UUCVehicleHealthComponent;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FUCOnVehicleStateChanged, UUCVehicleHealthComponent*, Health);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FUCOnVehicleComponentDestroyed, UUCVehicleHealthComponent*, Health, EUCVehicleComponent, Component);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FUCOnVehicleDestroyed, UUCVehicleHealthComponent*, Health, AController*, Killer);

/** Replicated snapshot of the damage model. */
USTRUCT()
struct FUCVehicleDamageState
{
	GENERATED_BODY()

	UPROPERTY()
	TArray<float> Health;

	UPROPERTY()
	TArray<float> Armor;

	UPROPERTY()
	float Shield = 0.f;

	UPROPERTY()
	bool bOnFire = false;
};

/**
 * Server-authoritative durability for a vehicle: shield, directional armour, components, fire.
 * Rules live in uc::FVehicleDamageModel; this class adds replication and events.
 * Presentation (damage decals, smoke, wreck meshes) should listen to the delegates.
 */
UCLASS(ClassGroup = (UnrealCombat), meta = (BlueprintSpawnableComponent))
class UNREALCOMBAT_API UUCVehicleHealthComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	UUCVehicleHealthComponent();

	/** Call on server and clients before any damage is applied. */
	void InitFromDefinition(const UUCVehicleDefinition* Definition);

	/** Server only. Returns the total damage soaked by shield, armour and structure (for scoring). */
	UFUNCTION(BlueprintCallable, Category = "Unreal Combat|Health")
	float ApplyHit(const FUCHitInfo& Hit, AController* InstigatorController);

	/** Server only. Fraction is of each component's maximum (0..1). */
	UFUNCTION(BlueprintCallable, Category = "Unreal Combat|Health")
	void RepairAll(float Fraction, bool bIncludeArmor);

	UFUNCTION(BlueprintCallable, Category = "Unreal Combat|Health")
	void ExtinguishFire();

	UFUNCTION(BlueprintCallable, Category = "Unreal Combat|Health")
	void RechargeShield();

	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Health")
	float GetHealthFraction(EUCVehicleComponent Component) const;

	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Health")
	float GetArmorFraction(EUCArmorFacing Facing) const;

	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Health")
	float GetShieldFraction() const { return Shield.GetFraction(); }

	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Health")
	bool HasShield() const { return Shield.GetSpec().MaxStrength > 0.f; }

	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Health")
	bool IsDestroyed() const { return Model.IsDestroyed(); }

	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Health")
	bool IsOnFire() const { return Model.IsOnFire(); }

	/** Seconds since this vehicle last took damage (large if never). Server only. */
	float GetTimeSinceDamaged() const;
	AController* GetLastDamageInstigator() const { return LastInstigator.Get(); }
	uc::FPerformanceModifiers GetPerformanceModifiers() const { return Model.GetPerformanceModifiers(); }

	/** Which armour face a shot travelling in ShotDirection (world space) strikes. */
	EUCArmorFacing FacingFromShotDirection(const FVector& ShotDirection) const;
	/** Which component a hit lands on: bone mapping first, then a position heuristic. */
	EUCVehicleComponent ComponentFromHit(const FHitResult& Hit) const;
	/** Heuristic on a hit position normalised to the vehicle's bounds (-1..1 per axis, X forward, Y right). */
	static EUCVehicleComponent ComponentFromNormalizedLocation(const FVector& Normalized);

	/** Physics-asset body / bone names mapped to components. Authored per vehicle blueprint. */
	UPROPERTY(EditDefaultsOnly, Category = "Unreal Combat|Health")
	TMap<FName, EUCVehicleComponent> BoneToComponent;

	UPROPERTY(EditDefaultsOnly, Category = "Unreal Combat|Health")
	bool bUseLocationHeuristic = true;

	UPROPERTY(BlueprintAssignable, Category = "Unreal Combat|Health")
	FUCOnVehicleStateChanged OnStateChanged;

	UPROPERTY(BlueprintAssignable, Category = "Unreal Combat|Health")
	FUCOnVehicleComponentDestroyed OnComponentDestroyed;

	UPROPERTY(BlueprintAssignable, Category = "Unreal Combat|Health")
	FUCOnVehicleDestroyed OnVehicleDestroyed;

	virtual void TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction) override;
	virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const override;

private:
	UFUNCTION()
	void OnRep_State(const FUCVehicleDamageState& OldState);

	bool HasAuthority() const;
	void PushState();
	void ApplyStateToModel(const FUCVehicleDamageState& State);
	void HandleResult(const uc::FDamageResult& Result, AController* Killer);

	UPROPERTY(ReplicatedUsing = OnRep_State)
	FUCVehicleDamageState RepState;

	uc::FVehicleDamageModel Model;
	uc::FShield Shield;
	TWeakObjectPtr<AController> LastInstigator;
	double LastDamageTime = -1.0;
};
