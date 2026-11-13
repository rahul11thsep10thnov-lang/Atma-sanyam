#include "UCVehicleHealthComponent.h"

#include "Engine/World.h"
#include "GameFramework/Actor.h"
#include "GameFramework/Controller.h"
#include "Net/UnrealNetwork.h"
#include "UCDefinitions.h"

#include UE_INLINE_GENERATED_CPP_BY_NAME(UCVehicleHealthComponent)

UUCVehicleHealthComponent::UUCVehicleHealthComponent()
{
	PrimaryComponentTick.bCanEverTick = true;
	SetIsReplicatedByDefault(true);
}

void UUCVehicleHealthComponent::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
	Super::GetLifetimeReplicatedProps(OutLifetimeProps);
	DOREPLIFETIME(UUCVehicleHealthComponent, RepState);
}

bool UUCVehicleHealthComponent::HasAuthority() const
{
	const AActor* Owner = GetOwner();
	return Owner != nullptr && Owner->HasAuthority();
}

void UUCVehicleHealthComponent::InitFromDefinition(const UUCVehicleDefinition* Definition)
{
	if (Definition == nullptr)
	{
		return;
	}
	Model.Reset(Definition->ToCoreDamageSpec());
	Shield.Reset(Definition->ToCoreShieldSpec());
	if (HasAuthority())
	{
		PushState();
	}
	else if (RepState.Health.Num() > 0)
	{
		// The snapshot can arrive before the definition; re-apply it against the real spec.
		ApplyStateToModel(RepState);
		OnStateChanged.Broadcast(this);
	}
}

float UUCVehicleHealthComponent::ApplyHit(const FUCHitInfo& Hit, AController* InstigatorController)
{
	if (!HasAuthority() || Model.IsDestroyed() || !(Hit.Amount > 0.f))
	{
		return 0.f;
	}

	const float PastShield = Shield.Absorb(Hit.Amount);

	uc::FHit CoreHit;
	CoreHit.Amount = PastShield;
	CoreHit.Type = static_cast<uc::EDamageType>(Hit.DamageType);
	CoreHit.Facing = static_cast<uc::EArmorFacing>(Hit.Facing);
	CoreHit.Target = static_cast<uc::EVehicleComponent>(Hit.Target);
	CoreHit.Penetration = Hit.Penetration;
	const uc::FDamageResult Result = Model.ApplyHit(CoreHit);

	if (const UWorld* World = GetWorld())
	{
		LastDamageTime = World->GetTimeSeconds();
	}
	if (InstigatorController != nullptr)
	{
		LastInstigator = InstigatorController;
	}

	PushState();
	HandleResult(Result, InstigatorController);
	return (Hit.Amount - PastShield) + Result.AbsorbedByArmor + Result.AppliedToComponent + Result.AppliedToChassis;
}

void UUCVehicleHealthComponent::HandleResult(const uc::FDamageResult& Result, AController* Killer)
{
	if (Result.bComponentDestroyed)
	{
		OnComponentDestroyed.Broadcast(this, static_cast<EUCVehicleComponent>(Result.DestroyedComponent));
	}
	if (Result.bVehicleDestroyed)
	{
		OnVehicleDestroyed.Broadcast(this, Killer);
	}
}

void UUCVehicleHealthComponent::TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction)
{
	Super::TickComponent(DeltaTime, TickType, ThisTickFunction);
	if (!HasAuthority() || Model.IsDestroyed())
	{
		return;
	}

	const float ShieldBefore = Shield.GetStrength();
	Shield.Tick(DeltaTime);
	const bool bWasOnFire = Model.IsOnFire();
	const uc::FDamageResult Burn = Model.Tick(DeltaTime);

	if (bWasOnFire || Burn.AppliedToChassis > 0.f || !FMath::IsNearlyEqual(ShieldBefore, Shield.GetStrength()))
	{
		PushState();
		// Burning to death is credited to whoever last hit the vehicle.
		HandleResult(Burn, LastInstigator.Get());
	}
}

void UUCVehicleHealthComponent::RepairAll(float Fraction, bool bIncludeArmor)
{
	if (!HasAuthority() || Model.IsDestroyed() || !(Fraction > 0.f))
	{
		return;
	}
	for (int32 Index = 0; Index < uc::NumVehicleComponents; ++Index)
	{
		const uc::EVehicleComponent Component = static_cast<uc::EVehicleComponent>(Index);
		Model.Repair(Component, Model.GetMaxHealth(Component) * Fraction);
	}
	if (bIncludeArmor)
	{
		for (int32 Index = 0; Index < uc::NumArmorFacings; ++Index)
		{
			Model.RepairArmor(static_cast<uc::EArmorFacing>(Index), Model.GetSpec().ArmorMaxPoints[Index] * Fraction);
		}
	}
	PushState();
}

void UUCVehicleHealthComponent::ExtinguishFire()
{
	if (HasAuthority() && Model.IsOnFire())
	{
		Model.ExtinguishFire();
		PushState();
	}
}

void UUCVehicleHealthComponent::RechargeShield()
{
	if (HasAuthority() && HasShield() && !Model.IsDestroyed())
	{
		Shield.SetStrength(Shield.GetSpec().MaxStrength);
		PushState();
	}
}

float UUCVehicleHealthComponent::GetHealthFraction(EUCVehicleComponent Component) const
{
	return Model.GetHealthFraction(static_cast<uc::EVehicleComponent>(Component));
}

float UUCVehicleHealthComponent::GetArmorFraction(EUCArmorFacing Facing) const
{
	return Model.GetArmorFraction(static_cast<uc::EArmorFacing>(Facing));
}

float UUCVehicleHealthComponent::GetTimeSinceDamaged() const
{
	const UWorld* World = GetWorld();
	if (World == nullptr || LastDamageTime < 0.0)
	{
		return UE_BIG_NUMBER;
	}
	return static_cast<float>(World->GetTimeSeconds() - LastDamageTime);
}

void UUCVehicleHealthComponent::PushState()
{
	RepState.Health.SetNum(uc::NumVehicleComponents);
	for (int32 Index = 0; Index < uc::NumVehicleComponents; ++Index)
	{
		RepState.Health[Index] = Model.GetHealth(static_cast<uc::EVehicleComponent>(Index));
	}
	RepState.Armor.SetNum(uc::NumArmorFacings);
	for (int32 Index = 0; Index < uc::NumArmorFacings; ++Index)
	{
		RepState.Armor[Index] = Model.GetArmor(static_cast<uc::EArmorFacing>(Index));
	}
	RepState.Shield = Shield.GetStrength();
	RepState.bOnFire = Model.IsOnFire();
	OnStateChanged.Broadcast(this);
}

void UUCVehicleHealthComponent::ApplyStateToModel(const FUCVehicleDamageState& State)
{
	if (State.Health.Num() != uc::NumVehicleComponents || State.Armor.Num() != uc::NumArmorFacings)
	{
		return;
	}
	Model.SetState(State.Health.GetData(), State.Armor.GetData(), State.bOnFire);
	Shield.SetStrength(State.Shield);
}

void UUCVehicleHealthComponent::OnRep_State(const FUCVehicleDamageState& OldState)
{
	const bool bWasDestroyed = Model.IsDestroyed();
	ApplyStateToModel(RepState);
	OnStateChanged.Broadcast(this);

	// Clients derive the one-shot events by comparing snapshots.
	if (OldState.Health.Num() == RepState.Health.Num())
	{
		for (int32 Index = 1; Index < RepState.Health.Num(); ++Index)
		{
			if (OldState.Health[Index] > 0.f && RepState.Health[Index] <= 0.f)
			{
				OnComponentDestroyed.Broadcast(this, static_cast<EUCVehicleComponent>(Index));
			}
		}
	}
	if (!bWasDestroyed && Model.IsDestroyed())
	{
		OnVehicleDestroyed.Broadcast(this, nullptr);
	}
}

EUCArmorFacing UUCVehicleHealthComponent::FacingFromShotDirection(const FVector& ShotDirection) const
{
	const AActor* Owner = GetOwner();
	if (Owner == nullptr)
	{
		return EUCArmorFacing::Front;
	}
	// The face struck looks back along the shot.
	const FVector Local = Owner->GetActorTransform().InverseTransformVectorNoScale(-ShotDirection.GetSafeNormal());
	const FVector Abs = Local.GetAbs();
	if (Abs.Z >= Abs.X && Abs.Z >= Abs.Y)
	{
		return Local.Z >= 0.0 ? EUCArmorFacing::Top : EUCArmorFacing::Bottom;
	}
	if (Abs.X >= Abs.Y)
	{
		return Local.X >= 0.0 ? EUCArmorFacing::Front : EUCArmorFacing::Rear;
	}
	return Local.Y >= 0.0 ? EUCArmorFacing::Right : EUCArmorFacing::Left;
}

EUCVehicleComponent UUCVehicleHealthComponent::ComponentFromNormalizedLocation(const FVector& N)
{
	const bool bLow = N.Z < -0.3;
	if (bLow && FMath::Abs(N.X) > 0.45 && FMath::Abs(N.Y) > 0.55)
	{
		if (N.X > 0.0)
		{
			return N.Y < 0.0 ? EUCVehicleComponent::WheelFL : EUCVehicleComponent::WheelFR;
		}
		return N.Y < 0.0 ? EUCVehicleComponent::WheelRL : EUCVehicleComponent::WheelRR;
	}
	if (N.X > 0.45)
	{
		return EUCVehicleComponent::Engine;
	}
	if (N.X < -0.55)
	{
		return EUCVehicleComponent::FuelTank;
	}
	return EUCVehicleComponent::Chassis;
}

EUCVehicleComponent UUCVehicleHealthComponent::ComponentFromHit(const FHitResult& Hit) const
{
	if (const EUCVehicleComponent* Mapped = BoneToComponent.Find(Hit.BoneName))
	{
		return *Mapped;
	}
	const AActor* Owner = GetOwner();
	if (!bUseLocationHeuristic || Owner == nullptr)
	{
		return EUCVehicleComponent::Chassis;
	}
	const FBox LocalBounds = Owner->CalculateComponentsBoundingBoxInLocalSpace(/*bNonColliding*/ false);
	const FVector Extent = LocalBounds.GetExtent();
	if (!LocalBounds.IsValid || Extent.GetMin() <= KINDA_SMALL_NUMBER)
	{
		return EUCVehicleComponent::Chassis;
	}
	const FVector Local = Owner->GetActorTransform().InverseTransformPosition(Hit.ImpactPoint);
	return ComponentFromNormalizedLocation((Local - LocalBounds.GetCenter()) / Extent);
}
