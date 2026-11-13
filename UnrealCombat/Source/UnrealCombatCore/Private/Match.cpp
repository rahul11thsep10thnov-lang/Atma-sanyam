#include "UCCore/Match.h"

namespace uc
{
	void FMatch::Configure(const FMatchConfig& InConfig, const std::vector<FObjective>& InObjectives)
	{
		Config = InConfig;
		if (Config.TeamCount < 2)
		{
			Config.TeamCount = 2;
		}
		Objectives = InObjectives;
		for (FObjective& Objective : Objectives)
		{
			Objective.Progress = 0;
			if (Objective.Required < 1)
			{
				Objective.Required = 1;
			}
		}
		Participants.clear();
		Phase = Config.WarmupTime > 0.f ? EMatchPhase::Warmup : EMatchPhase::InProgress;
		WarmupRemaining = Config.WarmupTime > 0.f ? Config.WarmupTime : 0.f;
		Elapsed = 0.f;
		NextParticipantId = 0;
		PlayerDeaths = 0;
		Winner = NoWinner;
		bMissionSucceeded = false;
	}

	int32_t FMatch::AddParticipant(int32_t Team, bool bIsBot)
	{
		FParticipant Participant;
		Participant.Id = NextParticipantId++;
		Participant.bIsBot = bIsBot;

		if (Config.Mode == EMatchMode::FreeForAll)
		{
			Participant.Team = Participant.Id;
		}
		else if (IsObjectiveMode())
		{
			Participant.Team = Team >= 0 ? (Team == MissionPlayerTeam ? MissionPlayerTeam : MissionEnemyTeam) : (bIsBot ? MissionEnemyTeam : MissionPlayerTeam);
		}
		else if (Team >= 0 && Team < Config.TeamCount)
		{
			Participant.Team = Team;
		}
		else
		{
			int32_t BestTeam = 0;
			int32_t BestCount = -1;
			for (int32_t Candidate = 0; Candidate < Config.TeamCount; ++Candidate)
			{
				int32_t Count = 0;
				for (const FParticipant& Other : Participants)
				{
					Count += Other.Team == Candidate ? 1 : 0;
				}
				if (BestCount < 0 || Count < BestCount)
				{
					BestCount = Count;
					BestTeam = Candidate;
				}
			}
			Participant.Team = BestTeam;
		}
		Participants.push_back(Participant);
		return Participant.Id;
	}

	FParticipant* FMatch::FindMutable(int32_t Id)
	{
		for (FParticipant& Participant : Participants)
		{
			if (Participant.Id == Id)
			{
				return &Participant;
			}
		}
		return nullptr;
	}

	const FParticipant* FMatch::FindParticipant(int32_t Id) const
	{
		for (const FParticipant& Participant : Participants)
		{
			if (Participant.Id == Id)
			{
				return &Participant;
			}
		}
		return nullptr;
	}

	float FMatch::GetTimeRemaining() const
	{
		if (Phase == EMatchPhase::Warmup)
		{
			return WarmupRemaining;
		}
		if (Config.TimeLimit <= 0.f)
		{
			return -1.f;
		}
		const float Remaining = Config.TimeLimit - Elapsed;
		return Remaining > 0.f ? Remaining : 0.f;
	}

	int32_t FMatch::GetTeamScore(int32_t Team) const
	{
		int32_t Total = 0;
		for (const FParticipant& Participant : Participants)
		{
			if (Participant.Team == Team)
			{
				Total += Participant.Score;
			}
		}
		return Total;
	}

	int32_t FMatch::GetLivesRemaining() const
	{
		if (Config.PlayerLives < 0)
		{
			return -1;
		}
		const int32_t Remaining = Config.PlayerLives - PlayerDeaths;
		return Remaining > 0 ? Remaining : 0;
	}

	bool FMatch::AreRequiredObjectivesComplete() const
	{
		bool bAnyRequired = false;
		for (const FObjective& Objective : Objectives)
		{
			if (!Objective.bOptional)
			{
				bAnyRequired = true;
				if (!Objective.IsComplete())
				{
					return false;
				}
			}
		}
		return bAnyRequired;
	}

	void FMatch::Tick(float DeltaSeconds)
	{
		if (!(DeltaSeconds > 0.f) || Phase == EMatchPhase::Finished)
		{
			return;
		}
		if (Phase == EMatchPhase::Warmup)
		{
			WarmupRemaining -= DeltaSeconds;
			if (WarmupRemaining > 0.f)
			{
				return;
			}
			// Carry the overshoot into play time so long frames do not stretch the match.
			DeltaSeconds = -WarmupRemaining;
			WarmupRemaining = 0.f;
			Phase = EMatchPhase::InProgress;
		}
		Elapsed += DeltaSeconds;

		for (FObjective& Objective : Objectives)
		{
			if (Objective.Type == EObjectiveType::Survive && !Objective.IsComplete() && Elapsed >= static_cast<float>(Objective.Required))
			{
				Objective.Progress = Objective.Required;
			}
		}
		CheckEndConditions();
	}

	void FMatch::RecordDamage(int32_t AttackerId, float Amount)
	{
		if (Phase != EMatchPhase::InProgress || !(Amount > 0.f))
		{
			return;
		}
		if (FParticipant* Attacker = FindMutable(AttackerId))
		{
			Attacker->DamageDealt += Amount;
		}
	}

	void FMatch::RecordAssist(int32_t ParticipantId)
	{
		if (Phase != EMatchPhase::InProgress)
		{
			return;
		}
		if (FParticipant* Participant = FindMutable(ParticipantId))
		{
			++Participant->Assists;
		}
	}

	void FMatch::RecordKill(int32_t KillerId, int32_t VictimId, bool bVictimIsBoss)
	{
		if (Phase != EMatchPhase::InProgress)
		{
			return;
		}
		FParticipant* Victim = FindMutable(VictimId);
		if (Victim == nullptr)
		{
			return;
		}
		++Victim->Deaths;

		FParticipant* Killer = KillerId != VictimId ? FindMutable(KillerId) : nullptr;
		if (Killer != nullptr)
		{
			if (Killer->Team == Victim->Team)
			{
				// Team kills cost a point and never count toward objectives.
				--Killer->Score;
				Killer = nullptr;
			}
			else
			{
				++Killer->Kills;
				++Killer->Score;
				if (bVictimIsBoss)
				{
					++Killer->BossesDefeated;
				}
			}
		}
		else if (!IsObjectiveMode())
		{
			// Suicide / environment death.
			--Victim->Score;
		}

		if (IsObjectiveMode())
		{
			if (Victim->Team == MissionPlayerTeam)
			{
				++PlayerDeaths;
			}
			else if (Killer != nullptr)
			{
				ReportObjectiveEvent(bVictimIsBoss ? EObjectiveType::DefeatBoss : EObjectiveType::DestroyTargets);
				return; // ReportObjectiveEvent already checked end conditions.
			}
		}
		CheckEndConditions();
	}

	void FMatch::ReportObjectiveEvent(EObjectiveType Type, int32_t Count)
	{
		if (Phase != EMatchPhase::InProgress || Count <= 0)
		{
			return;
		}
		for (FObjective& Objective : Objectives)
		{
			if (Objective.Type == Type && !Objective.IsComplete())
			{
				Objective.Progress += Count;
				if (Objective.Progress > Objective.Required)
				{
					Objective.Progress = Objective.Required;
				}
			}
		}
		CheckEndConditions();
	}

	void FMatch::CheckEndConditions()
	{
		if (Phase != EMatchPhase::InProgress)
		{
			return;
		}
		const bool bTimeUp = Config.TimeLimit > 0.f && Elapsed >= Config.TimeLimit;

		if (IsObjectiveMode())
		{
			if (AreRequiredObjectivesComplete())
			{
				bMissionSucceeded = true;
				Finish();
			}
			else if (bTimeUp || (Config.PlayerLives >= 0 && PlayerDeaths > Config.PlayerLives))
			{
				bMissionSucceeded = false;
				Finish();
			}
			return;
		}

		bool bScoreReached = false;
		if (Config.ScoreLimit > 0)
		{
			if (Config.Mode == EMatchMode::FreeForAll)
			{
				for (const FParticipant& Participant : Participants)
				{
					bScoreReached = bScoreReached || Participant.Score >= Config.ScoreLimit;
				}
			}
			else
			{
				for (int32_t Team = 0; Team < Config.TeamCount; ++Team)
				{
					bScoreReached = bScoreReached || GetTeamScore(Team) >= Config.ScoreLimit;
				}
			}
		}
		if (bScoreReached || bTimeUp)
		{
			Finish();
		}
	}

	void FMatch::Finish()
	{
		Phase = EMatchPhase::Finished;
		Winner = NoWinner;
		if (IsObjectiveMode())
		{
			Winner = bMissionSucceeded ? MissionPlayerTeam : MissionEnemyTeam;
			return;
		}

		// Highest score wins; a tie for first place is a draw.
		bool bHaveBest = false;
		bool bTied = false;
		int32_t BestScore = 0;
		int32_t BestKey = NoWinner;
		auto Consider = [&](int32_t Key, int32_t Score)
		{
			if (!bHaveBest || Score > BestScore)
			{
				bHaveBest = true;
				bTied = false;
				BestScore = Score;
				BestKey = Key;
			}
			else if (Score == BestScore)
			{
				bTied = true;
			}
		};
		if (Config.Mode == EMatchMode::FreeForAll)
		{
			for (const FParticipant& Participant : Participants)
			{
				Consider(Participant.Id, Participant.Score);
			}
		}
		else
		{
			for (int32_t Team = 0; Team < Config.TeamCount; ++Team)
			{
				Consider(Team, GetTeamScore(Team));
			}
		}
		Winner = (bHaveBest && !bTied) ? BestKey : NoWinner;
	}

	bool FMatch::IsWinner(int32_t ParticipantId) const
	{
		const FParticipant* Participant = FindParticipant(ParticipantId);
		if (Participant == nullptr || Phase != EMatchPhase::Finished || Winner == NoWinner)
		{
			return false;
		}
		return Config.Mode == EMatchMode::FreeForAll ? Participant->Id == Winner : Participant->Team == Winner;
	}

	FMatchPerformance FMatch::BuildPerformance(int32_t ParticipantId) const
	{
		FMatchPerformance Performance;
		if (const FParticipant* Participant = FindParticipant(ParticipantId))
		{
			Performance.Kills = Participant->Kills;
			Performance.Assists = Participant->Assists;
			Performance.Deaths = Participant->Deaths;
			Performance.DamageDealt = Participant->DamageDealt;
			Performance.BossesDefeated = Participant->BossesDefeated;
			Performance.bWon = IsWinner(ParticipantId);
			Performance.bMissionCompleted = IsObjectiveMode() && bMissionSucceeded && Participant->Team == MissionPlayerTeam;
		}
		return Performance;
	}
}
