#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameStateBase.h"
#include "GameFramework/PlayerController.h"
#include "GameFramework/PlayerState.h"
#include "UCTypes.h"
#include "UCGameFramework.generated.h"

class AUCGameState;
class AUCPlayerController;

/** Per-participant match record. Bots have one too, so scoring treats everyone the same. */
UCLASS()
class UNREALCOMBAT_API AUCPlayerState : public APlayerState
{
	GENERATED_BODY()

public:
	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Match")
	int32 GetTeamId() const { return TeamId; }

	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Match")
	int32 GetKills() const { return Kills; }

	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Match")
	int32 GetDeaths() const { return Deaths; }

	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Match")
	int32 GetMatchScore() const { return MatchScore; }

	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Match")
	bool IsBoss() const { return bIsBoss; }

	virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const override;

	// Written by AUCGameMode only.
	UPROPERTY(Replicated)
	int32 TeamId = INDEX_NONE;

	UPROPERTY(Replicated)
	int32 Kills = 0;

	UPROPERTY(Replicated)
	int32 Deaths = 0;

	UPROPERTY(Replicated)
	int32 MatchScore = 0;

	UPROPERTY(Replicated)
	bool bIsBoss = false;

	/** Id inside uc::FMatch. Server only. */
	int32 ParticipantId = INDEX_NONE;
};

USTRUCT(BlueprintType)
struct FUCObjectiveState
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Objective")
	FName ObjectiveId;

	UPROPERTY(BlueprintReadOnly, Category = "Objective")
	EUCObjectiveType Type = EUCObjectiveType::DestroyTargets;

	UPROPERTY(BlueprintReadOnly, Category = "Objective")
	int32 Required = 1;

	UPROPERTY(BlueprintReadOnly, Category = "Objective")
	int32 Progress = 0;

	UPROPERTY(BlueprintReadOnly, Category = "Objective")
	bool bOptional = false;

	bool operator==(const FUCObjectiveState& Other) const
	{
		return ObjectiveId == Other.ObjectiveId && Type == Other.Type && Required == Other.Required && Progress == Other.Progress && bOptional == Other.bOptional;
	}
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FUCOnMatchStateChanged, AUCGameState*, GameState);

/** Replicated view of the match for UI and presentation. Written by AUCGameMode. */
UCLASS()
class UNREALCOMBAT_API AUCGameState : public AGameStateBase
{
	GENERATED_BODY()

public:
	UPROPERTY(ReplicatedUsing = OnRep_MatchState, BlueprintReadOnly, Category = "Unreal Combat|Match")
	EUCMatchMode Mode = EUCMatchMode::FreeForAll;

	UPROPERTY(ReplicatedUsing = OnRep_MatchState, BlueprintReadOnly, Category = "Unreal Combat|Match")
	EUCMatchPhase Phase = EUCMatchPhase::Warmup;

	/** Whole seconds left in the current phase; negative when untimed. */
	UPROPERTY(ReplicatedUsing = OnRep_MatchState, BlueprintReadOnly, Category = "Unreal Combat|Match")
	int32 SecondsRemaining = 0;

	UPROPERTY(ReplicatedUsing = OnRep_MatchState, BlueprintReadOnly, Category = "Unreal Combat|Match")
	int32 ScoreLimit = 0;

	/** Index = team id. Empty in free-for-all (use player scores). */
	UPROPERTY(ReplicatedUsing = OnRep_MatchState, BlueprintReadOnly, Category = "Unreal Combat|Match")
	TArray<int32> TeamScores;

	UPROPERTY(ReplicatedUsing = OnRep_MatchState, BlueprintReadOnly, Category = "Unreal Combat|Match")
	TArray<FUCObjectiveState> Objectives;

	/** Mission modes: shared lives left; negative = unlimited. */
	UPROPERTY(ReplicatedUsing = OnRep_MatchState, BlueprintReadOnly, Category = "Unreal Combat|Match")
	int32 LivesRemaining = -1;

	/** Valid once Phase is Finished. Team id (team modes) or INDEX_NONE for a draw / free-for-all. */
	UPROPERTY(ReplicatedUsing = OnRep_MatchState, BlueprintReadOnly, Category = "Unreal Combat|Match")
	int32 WinningTeam = INDEX_NONE;

	/** Free-for-all winner, if any. */
	UPROPERTY(ReplicatedUsing = OnRep_MatchState, BlueprintReadOnly, Category = "Unreal Combat|Match")
	TObjectPtr<APlayerState> WinningPlayer;

	UPROPERTY(ReplicatedUsing = OnRep_MatchState, BlueprintReadOnly, Category = "Unreal Combat|Match")
	bool bMissionSucceeded = false;

	UPROPERTY(BlueprintAssignable, Category = "Unreal Combat|Match")
	FUCOnMatchStateChanged OnMatchStateChanged;

	/** Server: call after changing any of the fields above. */
	void NotifyMatchStateChanged() { OnMatchStateChanged.Broadcast(this); }

	virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const override;

private:
	UFUNCTION()
	void OnRep_MatchState();
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FUCOnMatchResult, AUCPlayerController*, Controller, const FUCMatchResult&, Result);

UCLASS()
class UNREALCOMBAT_API AUCPlayerController : public APlayerController
{
	GENERATED_BODY()

public:
	/** Server -> owning client at the end of a match. Applies rewards to the local profile. */
	UFUNCTION(Client, Reliable)
	void ClientReceiveMatchResult(const FUCMatchResult& Result);

	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Match")
	const FUCMatchResult& GetLastMatchResult() const { return LastMatchResult; }

	/** Levels gained from the last match result (0 if none or already applied). */
	UPROPERTY(BlueprintReadOnly, Category = "Unreal Combat|Match")
	int32 LastLevelsGained = 0;

	UPROPERTY(BlueprintAssignable, Category = "Unreal Combat|Match")
	FUCOnMatchResult OnMatchResult;

private:
	FUCMatchResult LastMatchResult;
};
