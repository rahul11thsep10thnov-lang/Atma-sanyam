#include "UCAbilityComponent.h"

#include "Engine/World.h"
#include "GameFramework/GameStateBase.h"
#include "Net/UnrealNetwork.h"
#include "UCVehicleHealthComponent.h"

#include UE_INLINE_GENERATED_CPP_BY_NAME(UCAbilityComponent)

UUCAbilityComponent::UUCAbilityComponent()
{
	PrimaryComponentTick.bCanEverTick = true;
	SetIsReplicatedByDefault(true);
}

void UUCAbilityComponent::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
	Super::GetLifetimeReplicatedProps(OutLifetimeProps);
	DOREPLIFETIME(UUCAbilityComponent, States);
}

bool UUCAbilityComponent::HasAuthority() const
{
	const AActor* Owner = GetOwner();
	return Owner != nullptr && Owner->HasAuthority();
}

float UUCAbilityComponent::GetServerTime() const
{
	const UWorld* World = GetWorld();
	const AGameStateBase* GameState = World != nullptr ? World->GetGameState() : nullptr;
	return GameState != nullptr ? static_cast<float>(GameState->GetServerWorldTimeSeconds()) : 0.f;
}

void UUCAbilityComponent::InitFromDefinition(const UUCVehicleDefinition* Definition)
{
	if (Definition == nullptr)
	{
		return;
	}
	Definitions = Definition->Abilities;
	if (!HasAuthority())
	{
		return;
	}
	Abilities.clear();
	for (const FUCAbilityDefinition& AbilityDefinition : Definitions)
	{
		Abilities.emplace_back(AbilityDefinition.ToCoreSpec());
	}
	RefreshStates();
}

void UUCAbilityComponent::ActivateAbility(int32 SlotIndex)
{
	if (HasAuthority())
	{
		ActivateSlot(SlotIndex);
	}
	else
	{
		ServerActivateAbility(SlotIndex);
	}
}

void UUCAbilityComponent::ServerActivateAbility_Implementation(int32 SlotIndex)
{
	ActivateSlot(SlotIndex);
}

bool UUCAbilityComponent::ActivateAbilityById(FName AbilityId)
{
	for (int32 Index = 0; Index < Definitions.Num(); ++Index)
	{
		if (Definitions[Index].AbilityId == AbilityId)
		{
			return ActivateSlot(Index);
		}
	}
	return false;
}

bool UUCAbilityComponent::ActivateSlot(int32 SlotIndex)
{
	if (!HasAuthority() || SlotIndex < 0 || SlotIndex >= static_cast<int32>(Abilities.size()))
	{
		return false;
	}
	uc::FAbility& Ability = Abilities[static_cast<size_t>(SlotIndex)];
	UUCVehicleHealthComponent* Health = GetOwner()->FindComponentByClass<UUCVehicleHealthComponent>();
	if (Health == nullptr || Health->IsDestroyed() || !Ability.Activate())
	{
		return false;
	}

	const FUCAbilityDefinition& Definition = Definitions[SlotIndex];
	switch (Definition.Effect)
	{
	case EUCAbilityEffect::RepairKit:
		Health->RepairAll(FMath::Clamp(Definition.Magnitude, 0.f, 1.f), /*bIncludeArmor*/ false);
		Health->ExtinguishFire();
		break;
	case EUCAbilityEffect::ShieldRecharge:
		Health->RechargeShield();
		break;
	case EUCAbilityEffect::Extinguisher:
		Health->ExtinguishFire();
		break;
	case EUCAbilityEffect::Boost:
		break; // continuous effect, evaluated in RefreshStates
	}
	RefreshStates();
	return true;
}

void UUCAbilityComponent::TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction)
{
	Super::TickComponent(DeltaTime, TickType, ThisTickFunction);
	if (!HasAuthority())
	{
		return;
	}
	bool bChanged = false;
	for (uc::FAbility& Ability : Abilities)
	{
		const bool bWasCooling = Ability.GetCooldownRemaining() > 0.f;
		const bool bEnded = Ability.Tick(DeltaTime);
		bChanged = bChanged || bEnded || (bWasCooling && Ability.GetCooldownRemaining() <= 0.f);
	}
	if (bChanged)
	{
		RefreshStates();
	}
}

void UUCAbilityComponent::RefreshStates()
{
	const float Now = GetServerTime();
	const int32 Count = static_cast<int32>(Abilities.size());
	States.SetNum(Count);
	for (int32 Index = 0; Index < Count; ++Index)
	{
		const uc::FAbility& Ability = Abilities[static_cast<size_t>(Index)];
		FUCAbilityState& State = States[Index];
		State.AbilityId = Definitions[Index].AbilityId;
		State.bActive = Ability.IsActive();
		State.ActiveEndTime = Now + Ability.GetActiveRemaining();
		State.ReadyTime = Now + Ability.GetActiveRemaining() + (Ability.IsActive() ? Ability.GetSpec().Cooldown : Ability.GetCooldownRemaining());
		State.ChargesRemaining = Ability.GetChargesRemaining();
	}
	OnAbilitiesChanged.Broadcast(this);
}

float UUCAbilityComponent::GetBoostScale() const
{
	float Scale = 1.f;
	for (int32 Index = 0; Index < States.Num() && Index < Definitions.Num(); ++Index)
	{
		if (States[Index].bActive && Definitions[Index].Effect == EUCAbilityEffect::Boost)
		{
			Scale *= FMath::Max(Definitions[Index].Magnitude, 0.f);
		}
	}
	return Scale;
}

void UUCAbilityComponent::OnRep_States()
{
	OnAbilitiesChanged.Broadcast(this);
}
