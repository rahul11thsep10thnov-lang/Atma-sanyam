#include "UCWeaponComponent.h"

#include "Engine/World.h"
#include "GameFramework/Controller.h"
#include "GameFramework/GameStateBase.h"
#include "GameFramework/Pawn.h"
#include "Net/UnrealNetwork.h"
#include "UCCombatStatics.h"
#include "UCDefinitions.h"
#include "UCProjectile.h"

#include UE_INLINE_GENERATED_CPP_BY_NAME(UCWeaponComponent)

UUCWeaponComponent::UUCWeaponComponent()
{
	PrimaryComponentTick.bCanEverTick = true;
	SetIsReplicatedByDefault(true);
}

void UUCWeaponComponent::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
	Super::GetLifetimeReplicatedProps(OutLifetimeProps);
	DOREPLIFETIME(UUCWeaponComponent, Definition);
	DOREPLIFETIME(UUCWeaponComponent, State);
}

bool UUCWeaponComponent::HasAuthority() const
{
	const AActor* Owner = GetOwner();
	return Owner != nullptr && Owner->HasAuthority();
}

AController* UUCWeaponComponent::GetInstigatorController() const
{
	const APawn* Pawn = Cast<APawn>(GetOwner());
	return Pawn != nullptr ? Pawn->GetController() : nullptr;
}

float UUCWeaponComponent::GetServerTime() const
{
	const UWorld* World = GetWorld();
	const AGameStateBase* GameState = World != nullptr ? World->GetGameState() : nullptr;
	return GameState != nullptr ? static_cast<float>(GameState->GetServerWorldTimeSeconds()) : 0.f;
}

float UUCWeaponComponent::GetReloadProgress() const
{
	if (!State.bReloading || !(State.ReloadDuration > 0.f))
	{
		return 0.f;
	}
	return FMath::Clamp(1.f - (State.ReloadEndTime - GetServerTime()) / State.ReloadDuration, 0.f, 1.f);
}

float UUCWeaponComponent::GetRange() const
{
	return Definition != nullptr ? Definition->Range : 0.f;
}

void UUCWeaponComponent::SetDefinition(UUCWeaponDefinition* InDefinition)
{
	if (!HasAuthority())
	{
		return;
	}
	Definition = InDefinition;
	const bool bWasOnline = Weapon.IsEnabled();
	Weapon.Reset(Definition != nullptr ? Definition->ToCoreSpec() : uc::FWeaponSpec());
	Weapon.SetEnabled(bWasOnline && Definition != nullptr);
	RefreshState();
}

void UUCWeaponComponent::SetTriggerHeld(bool bHeld)
{
	if (HasAuthority())
	{
		Weapon.SetTriggerHeld(bHeld && Definition != nullptr);
	}
	else
	{
		ServerSetTriggerHeld(bHeld);
	}
}

void UUCWeaponComponent::ServerSetTriggerHeld_Implementation(bool bHeld)
{
	Weapon.SetTriggerHeld(bHeld && Definition != nullptr);
}

void UUCWeaponComponent::RequestReload()
{
	if (HasAuthority())
	{
		Weapon.StartReload();
		RefreshState();
	}
	else
	{
		ServerRequestReload();
	}
}

void UUCWeaponComponent::ServerRequestReload_Implementation()
{
	Weapon.StartReload();
	RefreshState();
}

void UUCWeaponComponent::SetMountOnline(bool bOnline)
{
	if (HasAuthority())
	{
		Weapon.SetEnabled(bOnline && Definition != nullptr);
		RefreshState();
	}
}

void UUCWeaponComponent::SetCombatScales(float InDamageScale, float InFireRateScale)
{
	DamageScale = FMath::Max(InDamageScale, 0.f);
	FireRateScale = FMath::Clamp(InFireRateScale, 0.1f, 10.f);
}

void UUCWeaponComponent::Rearm()
{
	if (HasAuthority() && Definition != nullptr)
	{
		const bool bWasOnline = Weapon.IsEnabled();
		Weapon.Reset(Definition->ToCoreSpec());
		Weapon.SetEnabled(bWasOnline);
		RefreshState();
	}
}

void UUCWeaponComponent::TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction)
{
	Super::TickComponent(DeltaTime, TickType, ThisTickFunction);
	if (!HasAuthority() || Definition == nullptr)
	{
		return;
	}
	// Scaling time speeds up the whole weapon cycle (fire interval, reload, cooling) for boss phases.
	const int32 Shots = Weapon.Tick(DeltaTime * FireRateScale);
	for (int32 Shot = 0; Shot < Shots; ++Shot)
	{
		FireShot();
	}
	RefreshState();
}

void UUCWeaponComponent::FireShot()
{
	UWorld* World = GetWorld();
	AActor* Owner = GetOwner();
	if (World == nullptr || Owner == nullptr || Definition == nullptr)
	{
		return;
	}

	const FVector Muzzle = GetComponentLocation();
	const FVector Aim = GetForwardVector();
	const float HalfAngle = FMath::DegreesToRadians(Definition->SpreadDegrees * 0.5f);
	const float Damage = Definition->Damage * DamageScale;
	AController* InstigatorController = GetInstigatorController();
	const int32 Pellets = FMath::Max(Definition->PelletsPerShot, 1);

	FVector LastEnd = Muzzle + Aim * Definition->Range;
	bool bAnyHit = false;

	for (int32 Pellet = 0; Pellet < Pellets; ++Pellet)
	{
		const FVector Direction = HalfAngle > 0.f ? FMath::VRandCone(Aim, HalfAngle) : Aim;

		if (Definition->ProjectileSpeed > 0.f && Definition->ProjectileClass != nullptr)
		{
			FActorSpawnParameters SpawnParams;
			SpawnParams.Owner = Owner;
			SpawnParams.Instigator = Cast<APawn>(Owner);
			SpawnParams.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
			if (AUCProjectile* Projectile = World->SpawnActor<AUCProjectile>(Definition->ProjectileClass, Muzzle, Direction.Rotation(), SpawnParams))
			{
				Projectile->Launch(Direction, Definition->ProjectileSpeed, Damage, Definition->DamageType, Definition->Penetration, Definition->ExplosionRadius, Definition->Range);
			}
			LastEnd = Muzzle + Direction * Definition->Range;
			continue;
		}

		const FVector End = Muzzle + Direction * Definition->Range;
		FCollisionQueryParams Params(SCENE_QUERY_STAT(UCWeaponTrace), /*bTraceComplex*/ false, Owner);
		Params.bReturnPhysicalMaterial = false;
		FHitResult Hit;
		if (World->LineTraceSingleByChannel(Hit, Muzzle, End, ECC_Visibility, Params))
		{
			bAnyHit = true;
			LastEnd = Hit.ImpactPoint;
			UUCCombatStatics::ApplyImpact(Hit, Direction, Damage, Definition->DamageType, Definition->Penetration, InstigatorController, Owner);
		}
		else
		{
			LastEnd = End;
		}
	}

	MulticastFired(Muzzle, LastEnd, bAnyHit);
}

void UUCWeaponComponent::MulticastFired_Implementation(FVector_NetQuantize MuzzleLocation, FVector_NetQuantize EndLocation, bool bHitSomething)
{
	OnFired.Broadcast(this, MuzzleLocation, EndLocation, bHitSomething);
}

void UUCWeaponComponent::RefreshState()
{
	FUCWeaponState NewState;
	NewState.AmmoInMagazine = Weapon.GetAmmoInMagazine();
	NewState.ReserveAmmo = Weapon.GetReserveAmmo();
	NewState.HeatByte = static_cast<uint8>(FMath::Clamp(FMath::RoundToInt(Weapon.GetHeat() * 255.f), 0, 255));
	NewState.bOverheated = Weapon.IsOverheated();
	NewState.bReloading = Weapon.IsReloading();
	if (NewState.bReloading)
	{
		if (State.bReloading)
		{
			// Keep the times fixed for the whole reload so they replicate once, not every tick.
			NewState.ReloadEndTime = State.ReloadEndTime;
			NewState.ReloadDuration = State.ReloadDuration;
		}
		else
		{
			// The weapon cycle runs FireRateScale times faster (boss phases), reloads included.
			NewState.ReloadDuration = Weapon.GetSpec().ReloadTime / FireRateScale;
			NewState.ReloadEndTime = GetServerTime() + Weapon.GetReloadRemaining() / FireRateScale;
		}
	}
	NewState.bOnline = Weapon.IsEnabled();
	if (!(NewState == State))
	{
		State = NewState;
		OnStateChanged.Broadcast(this);
	}
}

void UUCWeaponComponent::OnRep_State()
{
	OnStateChanged.Broadcast(this);
}
