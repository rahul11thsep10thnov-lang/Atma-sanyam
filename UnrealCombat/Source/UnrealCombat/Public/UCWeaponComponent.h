#pragma once

#include "CoreMinimal.h"
#include "Components/SceneComponent.h"
#include "Engine/NetSerialization.h"
#include "UCCore/Weapon.h"
#include "UCWeaponComponent.generated.h"

class UUCWeaponComponent;
class UUCWeaponDefinition;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_FourParams(FUCOnWeaponFired, UUCWeaponComponent*, Weapon, FVector, MuzzleLocation, FVector, EndLocation, bool, bHitSomething);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FUCOnWeaponStateChanged, UUCWeaponComponent*, Weapon);

/** Replicated weapon status for UI and presentation. */
USTRUCT(BlueprintType)
struct FUCWeaponState
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Weapon")
	int32 AmmoInMagazine = 0;

	/** Negative = unlimited. */
	UPROPERTY(BlueprintReadOnly, Category = "Weapon")
	int32 ReserveAmmo = 0;

	/** 0..1, quantised to 1/255 to limit network traffic. */
	UPROPERTY(BlueprintReadOnly, Category = "Weapon")
	uint8 HeatByte = 0;

	UPROPERTY(BlueprintReadOnly, Category = "Weapon")
	bool bOverheated = false;

	UPROPERTY(BlueprintReadOnly, Category = "Weapon")
	bool bReloading = false;

	UPROPERTY(BlueprintReadOnly, Category = "Weapon")
	bool bOnline = true;

	bool operator==(const FUCWeaponState& Other) const
	{
		return AmmoInMagazine == Other.AmmoInMagazine && ReserveAmmo == Other.ReserveAmmo && HeatByte == Other.HeatByte
			&& bOverheated == Other.bOverheated && bReloading == Other.bReloading && bOnline == Other.bOnline;
	}
};

/**
 * One weapon mount. The component's transform is the muzzle: X forward is the line of fire.
 * Firing is simulated on the server by uc::FWeapon; clients only send trigger state.
 */
UCLASS(ClassGroup = (UnrealCombat), meta = (BlueprintSpawnableComponent))
class UNREALCOMBAT_API UUCWeaponComponent : public USceneComponent
{
	GENERATED_BODY()

public:
	UUCWeaponComponent();

	/** Server only. */
	void SetDefinition(const UUCWeaponDefinition* InDefinition);

	UFUNCTION(BlueprintCallable, Category = "Unreal Combat|Weapon")
	void SetTriggerHeld(bool bHeld);

	UFUNCTION(BlueprintCallable, Category = "Unreal Combat|Weapon")
	void RequestReload();

	/** Server only: mount destroyed / repaired. */
	void SetMountOnline(bool bOnline);
	/** Server only: boss phase and upgrade multipliers. */
	void SetCombatScales(float InDamageScale, float InFireRateScale);
	/** Server only: resupply (repair zones, pickups). */
	void Rearm();

	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Weapon")
	const UUCWeaponDefinition* GetDefinition() const { return Definition; }

	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Weapon")
	const FUCWeaponState& GetWeaponState() const { return State; }

	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Weapon")
	float GetHeat() const { return static_cast<float>(State.HeatByte) / 255.f; }

	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Weapon")
	bool HasWeapon() const { return Definition != nullptr; }

	float GetRange() const;

	/** Fired on server and all clients for every shot. Hook muzzle flash, tracers and audio here. */
	UPROPERTY(BlueprintAssignable, Category = "Unreal Combat|Weapon")
	FUCOnWeaponFired OnFired;

	UPROPERTY(BlueprintAssignable, Category = "Unreal Combat|Weapon")
	FUCOnWeaponStateChanged OnStateChanged;

	virtual void TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction) override;
	virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const override;

private:
	UFUNCTION(Server, Reliable)
	void ServerSetTriggerHeld(bool bHeld);

	UFUNCTION(Server, Reliable)
	void ServerRequestReload();

	UFUNCTION(NetMulticast, Unreliable)
	void MulticastFired(FVector_NetQuantize MuzzleLocation, FVector_NetQuantize EndLocation, bool bHitSomething);

	UFUNCTION()
	void OnRep_State();

	bool HasAuthority() const;
	void FireShot();
	void RefreshState();
	AController* GetInstigatorController() const;

	UPROPERTY(Replicated)
	TObjectPtr<const UUCWeaponDefinition> Definition;

	UPROPERTY(ReplicatedUsing = OnRep_State)
	FUCWeaponState State;

	uc::FWeapon Weapon;
	float DamageScale = 1.f;
	float FireRateScale = 1.f;
};
