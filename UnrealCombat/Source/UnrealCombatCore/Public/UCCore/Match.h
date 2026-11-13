#pragma once

#include "UCCore/Profile.h"

namespace uc
{
	enum class EMatchMode : uint8_t
	{
		FreeForAll = 0,
		TeamDeathmatch,
		/** Players (team 0) work through objectives against AI (team 1). */
		Mission,
		/** Mission variant whose required objective is a boss kill. */
		BossHunt
	};

	enum class EMatchPhase : uint8_t
	{
		Warmup = 0,
		InProgress,
		Finished
	};

	enum class EObjectiveType : uint8_t
	{
		DestroyTargets = 0,
		DefeatBoss,
		/** Required = seconds to stay alive after the match starts. */
		Survive,
		ReachCheckpoints
	};

	struct FObjective
	{
		FId Id;
		EObjectiveType Type = EObjectiveType::DestroyTargets;
		int32_t Required = 1;
		int32_t Progress = 0;
		bool bOptional = false;

		bool IsComplete() const { return Progress >= Required; }
	};

	struct FMatchConfig
	{
		EMatchMode Mode = EMatchMode::FreeForAll;
		/** Kills (FFA: per player, TDM: per team) that end the match. <=0 disables. */
		int32_t ScoreLimit = 20;
		/** Seconds of play. <=0 disables. */
		float TimeLimit = 600.f;
		float WarmupTime = 5.f;
		int32_t TeamCount = 2;
		float RespawnDelay = 5.f;
		/** Mission modes: shared player deaths allowed before failure. Negative = unlimited. */
		int32_t PlayerLives = -1;
	};

	struct FParticipant
	{
		int32_t Id = -1;
		int32_t Team = 0;
		int32_t Kills = 0;
		int32_t Assists = 0;
		int32_t Deaths = 0;
		int32_t Score = 0;
		int32_t BossesDefeated = 0;
		float DamageDealt = 0.f;
		bool bIsBot = false;
	};

	constexpr int32_t NoWinner = -1;
	constexpr int32_t MissionPlayerTeam = 0;
	constexpr int32_t MissionEnemyTeam = 1;

	/** Authoritative rules for one match. Runs on the server (or locally when offline). */
	class UCCORE_API FMatch
	{
	public:
		void Configure(const FMatchConfig& InConfig, const std::vector<FObjective>& InObjectives = std::vector<FObjective>());

		/** Team < 0 auto-assigns (FFA: own team, TDM: smallest team, missions: player team unless bot). */
		int32_t AddParticipant(int32_t Team, bool bIsBot);
		void Tick(float DeltaSeconds);

		void RecordDamage(int32_t AttackerId, float Amount);
		/** KillerId < 0 means the environment or self-destruction. */
		void RecordKill(int32_t KillerId, int32_t VictimId, bool bVictimIsBoss = false);
		void RecordAssist(int32_t ParticipantId);
		/** Advance every incomplete objective of the given type. */
		void ReportObjectiveEvent(EObjectiveType Type, int32_t Count = 1);

		bool IsObjectiveMode() const { return Config.Mode == EMatchMode::Mission || Config.Mode == EMatchMode::BossHunt; }
		EMatchPhase GetPhase() const { return Phase; }
		float GetElapsed() const { return Elapsed; }
		/** Seconds left in the current phase; negative when the phase is untimed. */
		float GetTimeRemaining() const;
		int32_t GetTeamScore(int32_t Team) const;
		int32_t GetLivesRemaining() const;
		/** FFA: participant id. Team modes: team index. NoWinner for a draw or an unfinished match. */
		int32_t GetWinner() const { return Winner; }
		bool DidMissionSucceed() const { return bMissionSucceeded; }
		bool IsWinner(int32_t ParticipantId) const;

		const FParticipant* FindParticipant(int32_t Id) const;
		const std::vector<FParticipant>& GetParticipants() const { return Participants; }
		const std::vector<FObjective>& GetObjectives() const { return Objectives; }
		const FMatchConfig& GetConfig() const { return Config; }

		FMatchPerformance BuildPerformance(int32_t ParticipantId) const;

	private:
		FParticipant* FindMutable(int32_t Id);
		bool AreRequiredObjectivesComplete() const;
		void Finish();
		void CheckEndConditions();

		FMatchConfig Config;
		std::vector<FParticipant> Participants;
		std::vector<FObjective> Objectives;
		EMatchPhase Phase = EMatchPhase::Warmup;
		float WarmupRemaining = 0.f;
		float Elapsed = 0.f;
		int32_t NextParticipantId = 0;
		int32_t PlayerDeaths = 0;
		int32_t Winner = NoWinner;
		bool bMissionSucceeded = false;
	};
}
