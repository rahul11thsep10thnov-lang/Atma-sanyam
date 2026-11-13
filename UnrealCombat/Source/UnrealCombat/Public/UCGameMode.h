#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "UCCore/Match.h"
#include "UCTypes.h"
#include "UCGameMode.generated.h"

class AUCAIController;
class AUCPlayerState;
class AUCVehiclePawn;
class UUCMissionDefinition;
class UUCVehicleDefinition;

/**
 * Server-side match flow for every mode. Rules live in uc::FMatch; this class connects them to
 * Unreal: spawning vehicles and bots, feeding kills / damage / objectives in, replicating the
 * result through AUCGameState and AUCPlayerState, and handing out match results.
 */
UCLASS()
class UNREALCOMBAT_API AUCGameMode : public AGameModeBase
{
	GENERATED_BODY()

public:
	AUCGameMode();

	/** Ignored when Mission is set (the mission decides the mode). */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Unreal Combat|Match")
	EUCMatchMode Mode = EUCMatchMode::FreeForAll;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Unreal Combat|Match")
	int32 ScoreLimit = 20;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Unreal Combat|Match")
	float TimeLimit = 600.f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Unreal Combat|Match")
	float WarmupTime = 5.f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Unreal Combat|Match")
	float RespawnDelay = 5.f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Unreal Combat|Match")
	bool bFriendlyFire = false;

	/** PvE content. When set, enemies and objectives come from here. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Unreal Combat|Match")
	TObjectPtr<UUCMissionDefinition> Mission;

	/** Vehicle given to players. (Per-player loadouts arrive with the backend ownership check.) */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Unreal Combat|Vehicles")
	TObjectPtr<UUCVehicleDefinition> DefaultVehicle;

	/** Competitive modes: AI opponents added at match start. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Unreal Combat|Bots", meta = (ClampMin = "0"))
	int32 NumBots = 3;

	/** Falls back to DefaultVehicle. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Unreal Combat|Bots")
	TObjectPtr<UUCVehicleDefinition> BotVehicle;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Unreal Combat|Bots")
	TSubclassOf<AUCAIController> BotControllerClass;

	// ---- Events from gameplay (server only) ----
	void NotifyDamageDealt(AController* InstigatorController, float Amount);
	void NotifyVehicleDestroyed(AUCVehiclePawn* Victim, AController* Killer);
	/** Called by checkpoints when a player drives through. */
	void NotifyCheckpointReached(AController* Controller);

	const uc::FMatch& GetMatch() const { return Match; }

	virtual void InitGame(const FString& MapName, const FString& Options, FString& ErrorMessage) override;
	virtual void StartPlay() override;
	virtual void Tick(float DeltaSeconds) override;
	virtual void HandleStartingNewPlayer_Implementation(APlayerController* NewPlayer) override;
	virtual void RestartPlayer(AController* NewPlayer) override;

private:
	void RegisterParticipant(AController* Controller, int32 Team, bool bIsBot, bool bIsBoss, const UUCVehicleDefinition* Vehicle);
	void SpawnBot(const UUCVehicleDefinition* Vehicle, bool bIsBoss);
	void RespawnController(TWeakObjectPtr<AController> Controller);
	void RemoveController(TWeakObjectPtr<AController> Controller);
	void SyncReplicatedState();
	void HandleMatchFinished();
	const UUCVehicleDefinition* ResolveVehicle(AController* Controller) const;

	uc::FMatch Match;
	FString MatchId;
	bool bFinishHandled = false;

	/** Vehicle assigned to each controller (players and bots). */
	UPROPERTY()
	TMap<TObjectPtr<AController>, TObjectPtr<const UUCVehicleDefinition>> AssignedVehicles;
};
