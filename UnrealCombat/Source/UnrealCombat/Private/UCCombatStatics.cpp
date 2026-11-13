#include "UCCombatStatics.h"

#include "Engine/DamageEvents.h"
#include "Engine/Engine.h"
#include "Engine/OverlapResult.h"
#include "Engine/World.h"
#include "GameFramework/Controller.h"
#include "GameFramework/Pawn.h"
#include "Kismet/GameplayStatics.h"
#include "UCGameFramework.h"
#include "UCGameMode.h"
#include "UCVehicleHealthComponent.h"

#include UE_INLINE_GENERATED_CPP_BY_NAME(UCCombatStatics)

bool UUCCombatStatics::CanDamage(const AController* InstigatorController, const AActor* Target)
{
	if (Target == nullptr)
	{
		return false;
	}
	const APawn* TargetPawn = Cast<APawn>(Target);
	if (InstigatorController == nullptr || TargetPawn == nullptr)
	{
		return true; // world hazards hurt everyone; non-pawn targets have no team
	}
	if (TargetPawn->GetController() == InstigatorController)
	{
		return false;
	}
	const AUCPlayerState* InstigatorState = InstigatorController->GetPlayerState<AUCPlayerState>();
	const AUCPlayerState* TargetState = TargetPawn->GetPlayerState<AUCPlayerState>();
	if (InstigatorState == nullptr || TargetState == nullptr || InstigatorState->GetTeamId() != TargetState->GetTeamId())
	{
		return true;
	}
	const UWorld* World = Target->GetWorld();
	const AUCGameMode* GameMode = World != nullptr ? World->GetAuthGameMode<AUCGameMode>() : nullptr;
	return GameMode != nullptr && GameMode->bFriendlyFire;
}

float UUCCombatStatics::ApplyImpact(const FHitResult& Hit, const FVector& ShotDirection, float Damage, EUCDamageType DamageType, float Penetration, AController* InstigatorController, AActor* DamageCauser)
{
	AActor* Target = Hit.GetActor();
	if (Target == nullptr || !Target->HasAuthority() || !(Damage > 0.f) || !CanDamage(InstigatorController, Target))
	{
		return 0.f;
	}

	if (UUCVehicleHealthComponent* Health = Target->FindComponentByClass<UUCVehicleHealthComponent>())
	{
		FUCHitInfo Info;
		Info.Amount = Damage;
		Info.DamageType = DamageType;
		Info.Penetration = Penetration;
		Info.Facing = Health->FacingFromShotDirection(ShotDirection);
		Info.Target = Health->ComponentFromHit(Hit);
		const float Dealt = Health->ApplyHit(Info, InstigatorController);
		if (Dealt > 0.f)
		{
			if (AUCGameMode* GameMode = Target->GetWorld()->GetAuthGameMode<AUCGameMode>())
			{
				GameMode->NotifyDamageDealt(InstigatorController, Dealt);
			}
		}
		return Dealt;
	}

	// Non-vehicle actors (props, destructible scenery) use the engine's damage path.
	return UGameplayStatics::ApplyPointDamage(Target, Damage, ShotDirection, Hit, InstigatorController, DamageCauser, nullptr);
}

void UUCCombatStatics::ApplyExplosion(const UObject* WorldContextObject, const FVector& Origin, float Radius, float Damage, EUCDamageType DamageType, AController* InstigatorController, AActor* DamageCauser)
{
	UWorld* World = GEngine != nullptr ? GEngine->GetWorldFromContextObject(WorldContextObject, EGetWorldErrorMode::ReturnNull) : nullptr;
	if (World == nullptr || World->GetNetMode() == NM_Client || !(Radius > 0.f) || !(Damage > 0.f))
	{
		return;
	}

	TArray<FOverlapResult> Overlaps;
	FCollisionQueryParams Params(SCENE_QUERY_STAT(UCExplosion), false, DamageCauser);
	World->OverlapMultiByObjectType(Overlaps, Origin, FQuat::Identity, FCollisionObjectQueryParams(FCollisionObjectQueryParams::AllDynamicObjects), FCollisionShape::MakeSphere(Radius), Params);

	TSet<AActor*> Damaged;
	for (const FOverlapResult& Overlap : Overlaps)
	{
		AActor* Target = Overlap.GetActor();
		if (Target == nullptr || Damaged.Contains(Target))
		{
			continue;
		}
		Damaged.Add(Target);

		const FVector ToTarget = Target->GetActorLocation() - Origin;
		const float Falloff = 1.f - FMath::Clamp(static_cast<float>(ToTarget.Size()) / Radius, 0.f, 1.f);
		if (Falloff <= 0.f)
		{
			continue;
		}
		FHitResult Hit;
		Hit.HitObjectHandle = FActorInstanceHandle(Target);
		Hit.Component = Overlap.GetComponent();
		Hit.ImpactPoint = Target->GetActorLocation();
		Hit.Location = Hit.ImpactPoint;
		ApplyImpact(Hit, ToTarget.GetSafeNormal(), Damage * Falloff, DamageType, 0.f, InstigatorController, DamageCauser);
	}
}
