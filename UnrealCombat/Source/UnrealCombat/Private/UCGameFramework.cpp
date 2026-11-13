#include "UCGameFramework.h"

#include "Engine/GameInstance.h"
#include "Net/UnrealNetwork.h"
#include "UCProfileSubsystem.h"

#include UE_INLINE_GENERATED_CPP_BY_NAME(UCGameFramework)

void AUCPlayerState::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
	Super::GetLifetimeReplicatedProps(OutLifetimeProps);
	DOREPLIFETIME(AUCPlayerState, TeamId);
	DOREPLIFETIME(AUCPlayerState, Kills);
	DOREPLIFETIME(AUCPlayerState, Deaths);
	DOREPLIFETIME(AUCPlayerState, MatchScore);
	DOREPLIFETIME(AUCPlayerState, bIsBoss);
}

void AUCGameState::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
	Super::GetLifetimeReplicatedProps(OutLifetimeProps);
	DOREPLIFETIME(AUCGameState, Mode);
	DOREPLIFETIME(AUCGameState, Phase);
	DOREPLIFETIME(AUCGameState, SecondsRemaining);
	DOREPLIFETIME(AUCGameState, ScoreLimit);
	DOREPLIFETIME(AUCGameState, TeamScores);
	DOREPLIFETIME(AUCGameState, Objectives);
	DOREPLIFETIME(AUCGameState, LivesRemaining);
	DOREPLIFETIME(AUCGameState, WinningTeam);
	DOREPLIFETIME(AUCGameState, WinningPlayer);
	DOREPLIFETIME(AUCGameState, bMissionSucceeded);
}

void AUCGameState::OnRep_MatchState()
{
	OnMatchStateChanged.Broadcast(this);
}

void AUCPlayerController::ClientReceiveMatchResult_Implementation(const FUCMatchResult& Result)
{
	LastMatchResult = Result;
	LastLevelsGained = 0;
	if (const UGameInstance* GameInstance = GetGameInstance())
	{
		if (UUCProfileSubsystem* Profile = GameInstance->GetSubsystem<UUCProfileSubsystem>())
		{
			LastLevelsGained = Profile->ApplyMatchResult(Result);
		}
	}
	OnMatchResult.Broadcast(this, Result);
}
