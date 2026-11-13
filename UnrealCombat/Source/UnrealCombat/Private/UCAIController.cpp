#include "UCAIController.h"

#include "Engine/World.h"
#include "EngineUtils.h"
#include "UCAbilityComponent.h"
#include "UCDefinitions.h"
#include "UCVehicleHealthComponent.h"
#include "UCVehiclePawn.h"
#include "UCWeaponComponent.h"

#include UE_INLINE_GENERATED_CPP_BY_NAME(UCAIController)

AUCAIController::AUCAIController()
{
	PrimaryActorTick.bCanEverTick = true;
	bWantsPlayerState = true; // bots score like players
}

void AUCAIController::OnPossess(APawn* InPawn)
{
	Super::OnPossess(InPawn);
	const AUCVehiclePawn* Vehicle = Cast<AUCVehiclePawn>(InPawn);
	if (Vehicle == nullptr)
	{
		return;
	}
	HomeLocation = Vehicle->GetActorLocation();
	PatrolPoint = ChoosePatrolPoint();
	PatrolTimer = 0.f;
	State = uc::EAIState::Patrol;
	Target.Reset();
	StuckTime = 0.f;
	ReverseTime = 0.f;

	bIsBoss = false;
	if (const UUCVehicleDefinition* Definition = Vehicle->GetDefinition())
	{
		Personality = Definition->AIPersonality.ToCore();
		if (Definition->BossPhases.Num() > 0)
		{
			std::vector<uc::FBossPhase> Phases;
			for (const FUCBossPhase& Phase : Definition->BossPhases)
			{
				uc::FBossPhase Out;
				Out.HealthThreshold = Phase.HealthThreshold;
				Out.DamageScale = Phase.DamageScale;
				Out.FireRateScale = Phase.FireRateScale;
				Out.SpeedScale = Phase.SpeedScale;
				Out.AbilityOnEnter = UC::ToStd(Phase.AbilityOnEnter);
				Phases.push_back(Out);
			}
			Boss.Reset(Phases);
			bIsBoss = true;
		}
	}
}

FVector AUCAIController::ChoosePatrolPoint() const
{
	const FVector2D Offset = FMath::RandPointInCircle(PatrolRadius);
	return HomeLocation + FVector(Offset.X, Offset.Y, 0.0);
}

void AUCAIController::UpdateTarget(AUCVehiclePawn* Vehicle)
{
	std::vector<uc::FAITargetCandidate> Candidates;
	TArray<AUCVehiclePawn*> Pawns;
	const int32 MyTeam = Vehicle->GetTeamId();
	const AController* LastAttacker = Vehicle->Health->GetTimeSinceDamaged() < 5.f ? Vehicle->Health->GetLastDamageInstigator() : nullptr;

	for (TActorIterator<AUCVehiclePawn> It(GetWorld()); It; ++It)
	{
		AUCVehiclePawn* Other = *It;
		if (Other == Vehicle || Other->IsWrecked() || Other->GetTeamId() == MyTeam)
		{
			continue;
		}
		uc::FAITargetCandidate Candidate;
		Candidate.Id = Pawns.Add(Other);
		Candidate.Distance = static_cast<float>(FVector::Dist(Vehicle->GetActorLocation(), Other->GetActorLocation()));
		Candidate.HealthFraction = Other->Health->GetHealthFraction(EUCVehicleComponent::Chassis);
		Candidate.bHasLineOfSight = LineOfSightTo(Other);
		Candidate.bIsAttackingMe = LastAttacker != nullptr && Other->GetController() == LastAttacker;
		Candidates.push_back(Candidate);
	}

	const int32 CurrentId = Target.IsValid() ? Pawns.IndexOfByKey(Target.Get()) : INDEX_NONE;
	const int32 Chosen = uc::SelectTarget(Candidates, Personality, CurrentId, SightRange);
	Target = Pawns.IsValidIndex(Chosen) ? Pawns[Chosen] : nullptr;
	bTargetVisible = Chosen >= 0 && Candidates[static_cast<size_t>(Chosen)].bHasLineOfSight;
}

void AUCAIController::UpdateBoss(AUCVehiclePawn* Vehicle)
{
	if (!bIsBoss || !Boss.Update(Vehicle->Health->GetHealthFraction(EUCVehicleComponent::Chassis)))
	{
		return;
	}
	const uc::FBossPhase& Phase = Boss.GetPhase();
	Vehicle->PrimaryWeapon->SetCombatScales(Phase.DamageScale, Phase.FireRateScale);
	Vehicle->SecondaryWeapon->SetCombatScales(Phase.DamageScale, Phase.FireRateScale);
	Vehicle->SetAISpeedScale(Phase.SpeedScale);
	if (!Phase.AbilityOnEnter.empty())
	{
		Vehicle->Abilities->ActivateAbilityById(UC::ToFName(Phase.AbilityOnEnter));
	}
}

void AUCAIController::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	AUCVehiclePawn* Vehicle = Cast<AUCVehiclePawn>(GetPawn());
	if (Vehicle == nullptr || !Vehicle->HasAuthority() || Vehicle->IsWrecked())
	{
		return;
	}

	RetargetTimer -= DeltaSeconds;
	if (RetargetTimer <= 0.f || (Target.IsValid() && Target->IsWrecked()))
	{
		RetargetTimer = 0.25f;
		UpdateTarget(Vehicle);
	}
	UpdateBoss(Vehicle);

	const AUCVehiclePawn* TargetVehicle = Target.Get();
	uc::FAIPerception Perception;
	Perception.SelfHealthFraction = Vehicle->Health->GetHealthFraction(EUCVehicleComponent::Chassis);
	Perception.bUnderFire = Vehicle->Health->GetTimeSinceDamaged() < 3.f;
	Perception.WeaponRange = Vehicle->PrimaryWeapon->HasWeapon() ? Vehicle->PrimaryWeapon->GetRange() : Vehicle->SecondaryWeapon->GetRange();
	Perception.bHasTarget = TargetVehicle != nullptr;
	if (TargetVehicle != nullptr)
	{
		Perception.TargetDistance = static_cast<float>(FVector::Dist(Vehicle->GetActorLocation(), TargetVehicle->GetActorLocation()));
		Perception.bHasLineOfSight = bTargetVisible;
	}
	State = uc::DecideState(State, Perception, Personality);

	// Focus point: the target, or a wandering patrol waypoint.
	FVector Focus;
	if (State == uc::EAIState::Patrol || TargetVehicle == nullptr)
	{
		PatrolTimer += DeltaSeconds;
		if (PatrolTimer > 15.f || FVector::DistSquared2D(Vehicle->GetActorLocation(), PatrolPoint) < FMath::Square(800.0))
		{
			PatrolPoint = ChoosePatrolPoint();
			PatrolTimer = 0.f;
		}
		Focus = PatrolPoint;
	}
	else
	{
		Focus = TargetVehicle->GetActorLocation();
	}

	const FVector Local = Vehicle->GetActorTransform().InverseTransformPosition(Focus);
	uc::FAIDriveInput Input = uc::ComputeDrive(State, static_cast<float>(Local.X), static_cast<float>(Local.Y), Perception, Personality);

	// Obstacle probe: if something solid is dead ahead, steer around it.
	if (Input.Throttle > 0.f)
	{
		const FVector Start = Vehicle->GetActorLocation() + FVector(0.0, 0.0, 60.0);
		const FVector Forward = Vehicle->GetActorForwardVector();
		FCollisionQueryParams Params(SCENE_QUERY_STAT(UCAIProbe), false, Vehicle);
		FHitResult Hit;
		if (GetWorld()->LineTraceSingleByChannel(Hit, Start, Start + Forward * 1500.0, ECC_WorldStatic, Params))
		{
			const double Side = FVector::DotProduct(Hit.ImpactNormal, Vehicle->GetActorRightVector());
			Input.Steering = Side >= 0.0 ? 1.f : -1.f;
			Input.Throttle = FMath::Min(Input.Throttle, 0.6f);
		}
	}

	// Stuck recovery: pushing forward but not moving -> back out with opposite lock.
	const float Speed = FMath::Abs(Vehicle->GetSpeedKmh());
	if (ReverseTime > 0.f)
	{
		ReverseTime -= DeltaSeconds;
		Input.Throttle = -1.f;
		Input.Steering = ReverseSteer;
	}
	else if (Input.Throttle > 0.3f && Speed < 3.f)
	{
		StuckTime += DeltaSeconds;
		if (StuckTime > 2.f)
		{
			StuckTime = 0.f;
			ReverseTime = 1.5f;
			ReverseSteer = Input.Steering >= 0.f ? -1.f : 1.f;
		}
	}
	else
	{
		StuckTime = 0.f;
	}

	Vehicle->SetDriveInput(Input.Throttle, Input.Steering, Input.bHandbrake);
	Vehicle->SetFiring(Input.bFire, Input.bFire);
}
