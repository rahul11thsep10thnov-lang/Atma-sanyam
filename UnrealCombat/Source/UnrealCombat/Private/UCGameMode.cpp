#include "UCGameMode.h"

#include "Engine/World.h"
#include "EngineUtils.h"
#include "GameFramework/PlayerStart.h"
#include "TimerManager.h"
#include "UCAIController.h"
#include "UCDebugHUD.h"
#include "UCDefinitions.h"
#include "UCGameFramework.h"
#include "UCVehiclePawn.h"
#include "UnrealCombat.h"

#include UE_INLINE_GENERATED_CPP_BY_NAME(UCGameMode)

AUCGameMode::AUCGameMode()
{
	PrimaryActorTick.bCanEverTick = true;
	GameStateClass = AUCGameState::StaticClass();
	PlayerStateClass = AUCPlayerState::StaticClass();
	PlayerControllerClass = AUCPlayerController::StaticClass();
	BotControllerClass = AUCAIController::StaticClass();
	// Placeholder until the approved HUD is delivered (register entry PH-HUD-001).
	HUDClass = AUCDebugHUD::StaticClass();
	// Vehicles are spawned from definitions in RestartPlayer.
	DefaultPawnClass = nullptr;
}

void AUCGameMode::InitGame(const FString& MapName, const FString& Options, FString& ErrorMessage)
{
	Super::InitGame(MapName, Options, ErrorMessage);

	uc::FMatchConfig Config;
	Config.Mode = static_cast<uc::EMatchMode>(Mission != nullptr ? Mission->Mode : Mode);
	Config.ScoreLimit = ScoreLimit;
	Config.TimeLimit = Mission != nullptr ? Mission->TimeLimit : TimeLimit;
	Config.WarmupTime = WarmupTime;
	Config.RespawnDelay = RespawnDelay;
	Config.PlayerLives = Mission != nullptr ? Mission->PlayerLives : -1;

	std::vector<uc::FObjective> Objectives;
	if (Mission != nullptr)
	{
		for (const FUCObjectiveDefinition& Definition : Mission->Objectives)
		{
			uc::FObjective Objective;
			Objective.Id = UC::ToStd(Definition.ObjectiveId);
			Objective.Type = static_cast<uc::EObjectiveType>(Definition.Type);
			Objective.Required = Definition.Required;
			Objective.bOptional = Definition.bOptional;
			Objectives.push_back(Objective);
		}
	}
	Match.Configure(Config, Objectives);
	MatchId = FString::Printf(TEXT("match-%s"), *FGuid::NewGuid().ToString(EGuidFormats::Digits));
	bFinishHandled = false;

	if (Match.IsObjectiveMode() && Mission == nullptr)
	{
		UE_LOG(LogUnrealCombat, Warning, TEXT("Mode is Mission/BossHunt but no Mission asset is set; the match cannot be completed."));
	}
}

void AUCGameMode::StartPlay()
{
	Super::StartPlay();

	if (Mission != nullptr)
	{
		for (const FUCEnemySpawn& Enemy : Mission->Enemies)
		{
			for (int32 Index = 0; Index < Enemy.Count; ++Index)
			{
				SpawnBot(Enemy.Vehicle, Enemy.bIsBoss);
			}
		}
	}
	else
	{
		const UUCVehicleDefinition* Vehicle = BotVehicle != nullptr ? BotVehicle.Get() : DefaultVehicle.Get();
		for (int32 Index = 0; Index < NumBots; ++Index)
		{
			SpawnBot(Vehicle, false);
		}
	}
	SyncReplicatedState();
}

void AUCGameMode::RegisterParticipant(AController* Controller, int32 Team, bool bIsBot, bool bIsBoss, const UUCVehicleDefinition* Vehicle)
{
	AUCPlayerState* State = Controller != nullptr ? Controller->GetPlayerState<AUCPlayerState>() : nullptr;
	if (State == nullptr || State->ParticipantId != INDEX_NONE)
	{
		return;
	}
	State->ParticipantId = Match.AddParticipant(Team, bIsBot);
	State->bIsBoss = bIsBoss;
	if (const uc::FParticipant* Participant = Match.FindParticipant(State->ParticipantId))
	{
		State->TeamId = Participant->Team;
	}
	AssignedVehicles.Add(Controller, Vehicle);
}

void AUCGameMode::HandleStartingNewPlayer_Implementation(APlayerController* NewPlayer)
{
	RegisterParticipant(NewPlayer, INDEX_NONE, /*bIsBot*/ false, /*bIsBoss*/ false, DefaultVehicle);
	Super::HandleStartingNewPlayer_Implementation(NewPlayer); // calls RestartPlayer
	SyncReplicatedState();
}

void AUCGameMode::SpawnBot(const UUCVehicleDefinition* Vehicle, bool bIsBoss)
{
	UWorld* World = GetWorld();
	if (World == nullptr || Vehicle == nullptr || BotControllerClass == nullptr)
	{
		UE_LOG(LogUnrealCombat, Warning, TEXT("Cannot spawn bot: missing vehicle definition or controller class."));
		return;
	}
	FActorSpawnParameters Params;
	Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
	AUCAIController* Bot = World->SpawnActor<AUCAIController>(BotControllerClass, FTransform::Identity, Params);
	if (Bot == nullptr)
	{
		return;
	}
	const int32 Team = Match.IsObjectiveMode() ? uc::MissionEnemyTeam : INDEX_NONE;
	RegisterParticipant(Bot, Team, /*bIsBot*/ true, bIsBoss, Vehicle);
	RestartPlayer(Bot);
}

const UUCVehicleDefinition* AUCGameMode::ResolveVehicle(AController* Controller) const
{
	if (const TObjectPtr<const UUCVehicleDefinition>* Assigned = AssignedVehicles.Find(Controller))
	{
		if (*Assigned != nullptr)
		{
			return *Assigned;
		}
	}
	return DefaultVehicle;
}

void AUCGameMode::RestartPlayer(AController* NewPlayer)
{
	UWorld* World = GetWorld();
	if (World == nullptr || NewPlayer == nullptr || NewPlayer->IsPendingKillPending())
	{
		return;
	}
	const UUCVehicleDefinition* Vehicle = ResolveVehicle(NewPlayer);
	if (Vehicle == nullptr || Vehicle->PawnClass == nullptr)
	{
		UE_LOG(LogUnrealCombat, Warning, TEXT("No vehicle definition / pawn class for %s; set DefaultVehicle on the game mode."), *NewPlayer->GetName());
		return;
	}

	if (APawn* OldPawn = NewPlayer->GetPawn())
	{
		NewPlayer->UnPossess();
		OldPawn->Destroy();
	}

	const AActor* Start = FindPlayerStart(NewPlayer);
	const FTransform SpawnTransform = Start != nullptr ? FTransform(Start->GetActorRotation(), Start->GetActorLocation()) : FTransform::Identity;

	AUCVehiclePawn* Pawn = World->SpawnActorDeferred<AUCVehiclePawn>(Vehicle->PawnClass, SpawnTransform, NewPlayer, nullptr, ESpawnActorCollisionHandlingMethod::AdjustIfPossibleButAlwaysSpawn);
	if (Pawn == nullptr)
	{
		return;
	}
	Pawn->InitFromDefinition(Vehicle);
	Pawn->FinishSpawning(SpawnTransform);
	NewPlayer->Possess(Pawn);
}

void AUCGameMode::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	Match.Tick(DeltaSeconds);
	SyncReplicatedState();
	if (Match.GetPhase() == uc::EMatchPhase::Finished && !bFinishHandled)
	{
		HandleMatchFinished();
	}
}

void AUCGameMode::NotifyDamageDealt(AController* InstigatorController, float Amount)
{
	const AUCPlayerState* State = InstigatorController != nullptr ? InstigatorController->GetPlayerState<AUCPlayerState>() : nullptr;
	if (State != nullptr)
	{
		Match.RecordDamage(State->ParticipantId, Amount);
	}
}

void AUCGameMode::NotifyCheckpointReached(AController* Controller)
{
	const AUCPlayerState* State = Controller != nullptr ? Controller->GetPlayerState<AUCPlayerState>() : nullptr;
	if (State != nullptr && !State->IsABot())
	{
		Match.ReportObjectiveEvent(uc::EObjectiveType::ReachCheckpoints);
		SyncReplicatedState();
	}
}

void AUCGameMode::NotifyVehicleDestroyed(AUCVehiclePawn* Victim, AController* Killer)
{
	AController* VictimController = Victim != nullptr ? Victim->GetController() : nullptr;
	const AUCPlayerState* VictimState = VictimController != nullptr ? VictimController->GetPlayerState<AUCPlayerState>() : nullptr;
	if (VictimState == nullptr)
	{
		return;
	}
	const AUCPlayerState* KillerState = Killer != nullptr ? Killer->GetPlayerState<AUCPlayerState>() : nullptr;
	Match.RecordKill(KillerState != nullptr ? KillerState->ParticipantId : INDEX_NONE, VictimState->ParticipantId, VictimState->bIsBoss);
	SyncReplicatedState();

	// The wreck stays in the world for the respawn delay, then is cleaned up.
	const float Delay = FMath::Max(RespawnDelay, 0.5f);
	Victim->SetLifeSpan(Delay + 0.1f);
	if (Match.GetPhase() == uc::EMatchPhase::Finished)
	{
		return;
	}

	FTimerHandle Handle;
	const TWeakObjectPtr<AController> WeakController(VictimController);
	const bool bMissionEnemy = Match.IsObjectiveMode() && VictimState->TeamId == uc::MissionEnemyTeam;
	if (bMissionEnemy)
	{
		// Mission enemies do not come back.
		GetWorldTimerManager().SetTimer(Handle, FTimerDelegate::CreateUObject(this, &AUCGameMode::RemoveController, WeakController), Delay, false);
	}
	else
	{
		GetWorldTimerManager().SetTimer(Handle, FTimerDelegate::CreateUObject(this, &AUCGameMode::RespawnController, WeakController), Delay, false);
	}
}

void AUCGameMode::RespawnController(TWeakObjectPtr<AController> Controller)
{
	if (Controller.IsValid() && Match.GetPhase() != uc::EMatchPhase::Finished)
	{
		RestartPlayer(Controller.Get());
	}
}

void AUCGameMode::RemoveController(TWeakObjectPtr<AController> Controller)
{
	if (AController* Raw = Controller.Get())
	{
		AssignedVehicles.Remove(Raw);
		if (APawn* Pawn = Raw->GetPawn())
		{
			Raw->UnPossess();
			Pawn->Destroy();
		}
		Raw->Destroy();
	}
}

void AUCGameMode::SyncReplicatedState()
{
	AUCGameState* State = GetGameState<AUCGameState>();
	if (State == nullptr)
	{
		return;
	}
	bool bChanged = false;
	auto Assign = [&bChanged](auto& Target, const auto& Value)
	{
		if (!(Target == Value))
		{
			Target = Value;
			bChanged = true;
		}
	};

	Assign(State->Mode, static_cast<EUCMatchMode>(Match.GetConfig().Mode));
	Assign(State->Phase, static_cast<EUCMatchPhase>(Match.GetPhase()));
	const float Remaining = Match.GetTimeRemaining();
	Assign(State->SecondsRemaining, Remaining < 0.f ? -1 : FMath::CeilToInt(Remaining));
	Assign(State->ScoreLimit, Match.GetConfig().ScoreLimit);
	Assign(State->LivesRemaining, Match.GetLivesRemaining());
	Assign(State->bMissionSucceeded, Match.DidMissionSucceed());

	TArray<int32> TeamScores;
	if (Match.GetConfig().Mode != uc::EMatchMode::FreeForAll)
	{
		for (int32 Team = 0; Team < Match.GetConfig().TeamCount; ++Team)
		{
			TeamScores.Add(Match.GetTeamScore(Team));
		}
	}
	Assign(State->TeamScores, TeamScores);

	TArray<FUCObjectiveState> Objectives;
	for (const uc::FObjective& Objective : Match.GetObjectives())
	{
		FUCObjectiveState& Out = Objectives.AddDefaulted_GetRef();
		Out.ObjectiveId = UC::ToFName(Objective.Id);
		Out.Type = static_cast<EUCObjectiveType>(Objective.Type);
		Out.Required = Objective.Required;
		Out.Progress = Objective.Progress;
		Out.bOptional = Objective.bOptional;
	}
	Assign(State->Objectives, Objectives);

	const bool bFreeForAll = Match.GetConfig().Mode == uc::EMatchMode::FreeForAll;
	const bool bFinished = Match.GetPhase() == uc::EMatchPhase::Finished;
	Assign(State->WinningTeam, (bFinished && !bFreeForAll) ? Match.GetWinner() : static_cast<int32>(INDEX_NONE));

	APlayerState* WinningPlayer = nullptr;
	for (APlayerState* Base : State->PlayerArray)
	{
		AUCPlayerState* PlayerState = Cast<AUCPlayerState>(Base);
		const uc::FParticipant* Participant = PlayerState != nullptr ? Match.FindParticipant(PlayerState->ParticipantId) : nullptr;
		if (Participant == nullptr)
		{
			continue;
		}
		Assign(PlayerState->TeamId, Participant->Team);
		Assign(PlayerState->Kills, Participant->Kills);
		Assign(PlayerState->Deaths, Participant->Deaths);
		Assign(PlayerState->MatchScore, Participant->Score);
		if (bFinished && bFreeForAll && Participant->Id == Match.GetWinner())
		{
			WinningPlayer = PlayerState;
		}
	}
	if (State->WinningPlayer != WinningPlayer)
	{
		State->WinningPlayer = WinningPlayer;
		bChanged = true;
	}

	if (bChanged)
	{
		State->NotifyMatchStateChanged();
	}
}

void AUCGameMode::HandleMatchFinished()
{
	bFinishHandled = true;
	SyncReplicatedState();

	for (FConstPlayerControllerIterator It = GetWorld()->GetPlayerControllerIterator(); It; ++It)
	{
		AUCPlayerController* Controller = Cast<AUCPlayerController>(It->Get());
		const AUCPlayerState* State = Controller != nullptr ? Controller->GetPlayerState<AUCPlayerState>() : nullptr;
		if (State == nullptr)
		{
			continue;
		}
		const uc::FMatchPerformance Performance = Match.BuildPerformance(State->ParticipantId);
		FUCMatchResult Result;
		// Per-player id so each profile applies its own reward exactly once.
		Result.MatchId = FString::Printf(TEXT("%s-%d"), *MatchId, State->ParticipantId);
		Result.MissionId = Mission != nullptr ? Mission->MissionId : FName();
		Result.Kills = Performance.Kills;
		Result.Assists = Performance.Assists;
		Result.Deaths = Performance.Deaths;
		Result.BossesDefeated = Performance.BossesDefeated;
		Result.DamageDealt = Performance.DamageDealt;
		Result.bWon = Performance.bWon;
		Result.bMissionCompleted = Performance.bMissionCompleted;
		Controller->ClientReceiveMatchResult(Result);
	}

	// Stop the action: bots cease fire and everyone coasts to a halt.
	for (TActorIterator<AUCVehiclePawn> It(GetWorld()); It; ++It)
	{
		It->SetFiring(false, false);
	}
}
