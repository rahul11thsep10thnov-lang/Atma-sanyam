#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "UCWorldActors.generated.h"

class AUCVehiclePawn;
class UBoxComponent;

/** Drive-through objective marker. Each player vehicle counts once. */
UCLASS()
class UNREALCOMBAT_API AUCCheckpoint : public AActor
{
	GENERATED_BODY()

public:
	AUCCheckpoint();

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Unreal Combat")
	TObjectPtr<UBoxComponent> Trigger;

	/** Presentation hook (server and clients are both notified through the overlap). */
	UFUNCTION(BlueprintImplementableEvent, Category = "Unreal Combat")
	void OnCheckpointReached(AUCVehiclePawn* Vehicle);

protected:
	virtual void BeginPlay() override;

	UFUNCTION()
	void HandleOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult);

private:
	TSet<TWeakObjectPtr<AController>> Visitors;
};

/** Service area: vehicles inside are repaired over time, extinguished and (optionally) rearmed. */
UCLASS()
class UNREALCOMBAT_API AUCRepairZone : public AActor
{
	GENERATED_BODY()

public:
	AUCRepairZone();

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Unreal Combat")
	TObjectPtr<UBoxComponent> Volume;

	/** Fraction of maximum health restored per second. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Unreal Combat", meta = (ClampMin = "0", ClampMax = "1"))
	float RepairFractionPerSecond = 0.1f;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Unreal Combat")
	bool bRepairArmor = true;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Unreal Combat")
	bool bRearmOnEnter = true;

	/** -1 = any team. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Unreal Combat")
	int32 TeamId = -1;

	virtual void Tick(float DeltaSeconds) override;

protected:
	virtual void BeginPlay() override;

	UFUNCTION()
	void HandleOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult);

private:
	bool Accepts(const AUCVehiclePawn* Vehicle) const;
};
