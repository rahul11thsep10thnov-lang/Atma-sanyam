#pragma once

#include "CoreMinimal.h"
#include "AIController.h"
#include "UCCore/CombatAI.h"
#include "UCTypes.h"
#include "UCAIController.generated.h"

class AUCVehiclePawn;

/**
 * Drives and fights an AUCVehiclePawn. Decisions come from the rules core (uc::DecideState,
 * uc::SelectTarget, uc::ComputeDrive); this class gathers perception and applies the result.
 * Bosses are ordinary bots whose vehicle definition lists BossPhases.
 *
 * Steering is direct (no navmesh path following yet) with a forward obstacle probe and
 * stuck recovery, which suits open arenas. See Docs/Roadmap.md.
 */
UCLASS()
class UNREALCOMBAT_API AUCAIController : public AAIController
{
	GENERATED_BODY()

public:
	AUCAIController();

	UFUNCTION(BlueprintPure, Category = "Unreal Combat|AI")
	EUCAIState GetAIState() const { return static_cast<EUCAIState>(State); }

	UFUNCTION(BlueprintPure, Category = "Unreal Combat|AI")
	int32 GetBossPhaseIndex() const { return bIsBoss ? Boss.GetPhaseIndex() : 0; }

	/** How far from its spawn point the AI wanders when it has no target. */
	UPROPERTY(EditDefaultsOnly, Category = "Unreal Combat|AI")
	float PatrolRadius = 6000.f;

	/** Targets farther than this are ignored. */
	UPROPERTY(EditDefaultsOnly, Category = "Unreal Combat|AI")
	float SightRange = 30000.f;

	virtual void Tick(float DeltaSeconds) override;

protected:
	virtual void OnPossess(APawn* InPawn) override;

private:
	void UpdateTarget(AUCVehiclePawn* Vehicle);
	void UpdateBoss(AUCVehiclePawn* Vehicle);
	FVector ChoosePatrolPoint() const;

	uc::EAIState State = uc::EAIState::Patrol;
	uc::FAIPersonality Personality;
	uc::FBossController Boss;
	bool bIsBoss = false;

	TWeakObjectPtr<AUCVehiclePawn> Target;
	bool bTargetVisible = false;
	float RetargetTimer = 0.f;

	FVector HomeLocation = FVector::ZeroVector;
	FVector PatrolPoint = FVector::ZeroVector;
	float PatrolTimer = 0.f;

	float StuckTime = 0.f;
	float ReverseTime = 0.f;
	float ReverseSteer = 0.f;
};
