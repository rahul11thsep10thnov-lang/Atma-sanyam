#pragma once

#include "CoreMinimal.h"
#include <vector>
#include "Components/ActorComponent.h"
#include "UCCore/Defense.h"
#include "UCDefinitions.h"
#include "UCAbilityComponent.generated.h"

class UUCAbilityComponent;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FUCOnAbilitiesChanged, UUCAbilityComponent*, Abilities);

/** Replicated status of one ability slot. Times are server world seconds so UI can count down locally. */
USTRUCT(BlueprintType)
struct FUCAbilityState
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Ability")
	FName AbilityId;

	UPROPERTY(BlueprintReadOnly, Category = "Ability")
	bool bActive = false;

	/** Server time at which the effect ends (valid while bActive). */
	UPROPERTY(BlueprintReadOnly, Category = "Ability")
	float ActiveEndTime = 0.f;

	/** Server time at which the ability is ready again. */
	UPROPERTY(BlueprintReadOnly, Category = "Ability")
	float ReadyTime = 0.f;

	/** Negative = unlimited. */
	UPROPERTY(BlueprintReadOnly, Category = "Ability")
	int32 ChargesRemaining = -1;
};

/** Defensive / utility abilities of a vehicle (repair kit, boost, shield recharge, extinguisher). */
UCLASS(ClassGroup = (UnrealCombat), meta = (BlueprintSpawnableComponent))
class UNREALCOMBAT_API UUCAbilityComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	UUCAbilityComponent();

	/** Call on server and clients (clients only need the definitions to interpret replicated state). */
	void InitFromDefinition(const UUCVehicleDefinition* Definition);

	UFUNCTION(BlueprintCallable, Category = "Unreal Combat|Abilities")
	void ActivateAbility(int32 SlotIndex);

	/** Server only. Returns false when the id is unknown or the ability is not ready. */
	bool ActivateAbilityById(FName AbilityId);

	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Abilities")
	const TArray<FUCAbilityState>& GetAbilityStates() const { return States; }

	/** Product of all active Boost abilities (1 when none). Valid on server and clients. */
	float GetBoostScale() const;

	UPROPERTY(BlueprintAssignable, Category = "Unreal Combat|Abilities")
	FUCOnAbilitiesChanged OnAbilitiesChanged;

	virtual void TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction) override;
	virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const override;

private:
	UFUNCTION(Server, Reliable)
	void ServerActivateAbility(int32 SlotIndex);

	UFUNCTION()
	void OnRep_States();

	bool HasAuthority() const;
	bool ActivateSlot(int32 SlotIndex);
	void RefreshStates();
	float GetServerTime() const;

	UPROPERTY(ReplicatedUsing = OnRep_States)
	TArray<FUCAbilityState> States;

	TArray<FUCAbilityDefinition> Definitions;
	/** std::vector because the rules-core type holds a std::string and must not be memmoved by TArray. */
	std::vector<uc::FAbility> Abilities;
};
