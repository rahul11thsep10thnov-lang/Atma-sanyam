#include "UCCore/CombatAI.h"

#include <cmath>

namespace uc
{
	static const float RadToDeg = 57.29577951f;

	EAIState DecideState(EAIState Current, const FAIPerception& Perception, const FAIPersonality& Personality)
	{
		// Retreat has priority and is sticky: the AI only re-engages once it has recovered a margin.
		if (Personality.RetreatHealthFraction > 0.f)
		{
			const float Threshold = Personality.RetreatHealthFraction + (Current == EAIState::Retreat ? 0.15f : 0.f);
			if (Perception.SelfHealthFraction < Threshold && (Perception.bHasTarget || Current == EAIState::Retreat))
			{
				return EAIState::Retreat;
			}
		}
		if (!Perception.bHasTarget)
		{
			return EAIState::Patrol;
		}

		// Cautious drivers break off to dodge when hit while hurt; aggressive ones keep shooting.
		const float EvadeBelow = 0.75f * (1.f - ClampF(Personality.Aggression, 0.f, 1.f));
		if (Perception.bUnderFire && Perception.SelfHealthFraction < EvadeBelow)
		{
			return EAIState::Evade;
		}

		const float RangeScale = Current == EAIState::Engage ? 1.1f : 0.9f;
		if (Perception.bHasLineOfSight && Perception.TargetDistance <= Perception.WeaponRange * RangeScale)
		{
			return EAIState::Engage;
		}
		return EAIState::Pursue;
	}

	int32_t SelectTarget(const std::vector<FAITargetCandidate>& Candidates, const FAIPersonality& Personality, int32_t CurrentTargetId, float MaxRange)
	{
		const float Aggression = ClampF(Personality.Aggression, 0.f, 1.f);
		int32_t BestId = -1;
		float BestScore = 0.f;
		for (const FAITargetCandidate& Candidate : Candidates)
		{
			if (Candidate.Id < 0 || Candidate.HealthFraction <= 0.f || !(MaxRange > 0.f) || Candidate.Distance > MaxRange)
			{
				continue;
			}
			float Score = 1.f - Candidate.Distance / MaxRange;                       // closer is better
			Score += (1.f - ClampF(Candidate.HealthFraction, 0.f, 1.f)) * Aggression; // aggressive AI hunts the wounded
			Score += Candidate.bHasLineOfSight ? 0.3f : 0.f;
			Score += Candidate.bIsAttackingMe ? 0.4f : 0.f;
			Score += Candidate.Id == CurrentTargetId ? 0.25f : 0.f;
			if (BestId < 0 || Score > BestScore)
			{
				BestId = Candidate.Id;
				BestScore = Score;
			}
		}
		return BestId;
	}

	FAIDriveInput ComputeDrive(EAIState State, float LocalForward, float LocalRight, const FAIPerception& Perception, const FAIPersonality& Personality)
	{
		FAIDriveInput Input;
		const float Distance = std::sqrt(LocalForward * LocalForward + LocalRight * LocalRight);
		if (Distance < 1.f)
		{
			return Input;
		}
		// Signed angle to the focus point: 0 = dead ahead, positive = to the right.
		const float AngleDeg = std::atan2(LocalRight, LocalForward) * RadToDeg;
		const float SteerToward = ClampF(AngleDeg / 45.f, -1.f, 1.f);
		// Ease off the throttle in tight turns so the vehicle does not plough wide.
		const float TurnThrottle = LerpF(1.f, 0.45f, ClampF(std::fabs(AngleDeg) / 90.f, 0.f, 1.f));

		switch (State)
		{
		case EAIState::Patrol:
			Input.Steering = SteerToward;
			Input.Throttle = 0.5f * TurnThrottle;
			break;

		case EAIState::Pursue:
			Input.Steering = SteerToward;
			Input.Throttle = TurnThrottle;
			break;

		case EAIState::Engage:
		{
			const float Desired = Perception.WeaponRange * ClampF(Personality.PreferredRangeFraction, 0.1f, 1.f);
			Input.Steering = SteerToward;
			if (Distance > Desired * 1.2f)
			{
				Input.Throttle = TurnThrottle;
			}
			else if (Distance < Desired * 0.5f && std::fabs(AngleDeg) < 60.f)
			{
				// Too close: back off while keeping the guns on target.
				Input.Throttle = -0.6f;
				Input.Steering = -SteerToward;
			}
			else
			{
				Input.Throttle = 0.25f * TurnThrottle;
			}
			Input.bFire = Perception.bHasLineOfSight && Distance <= Perception.WeaponRange && std::fabs(AngleDeg) <= Personality.AimToleranceDegrees;
			break;
		}

		case EAIState::Evade:
		{
			// Keep the threat on the beam (about 90 degrees) to present a crossing target.
			const float Side = AngleDeg >= 0.f ? 1.f : -1.f;
			const float Error = AngleDeg - Side * 90.f;
			Input.Steering = ClampF(Error / 45.f, -1.f, 1.f);
			Input.Throttle = 1.f;
			break;
		}

		case EAIState::Retreat:
		{
			// Steer so the threat ends up directly behind.
			const float Side = AngleDeg >= 0.f ? 1.f : -1.f;
			const float Error = AngleDeg - Side * 180.f;
			Input.Steering = ClampF(Error / 45.f, -1.f, 1.f);
			Input.Throttle = 1.f;
			break;
		}
		}
		return Input;
	}

	void FBossController::Reset(const std::vector<FBossPhase>& InPhases)
	{
		Phases = InPhases;
		if (Phases.empty())
		{
			Phases.push_back(FBossPhase());
		}
		// Order from healthiest to most desperate (simple insertion sort; phase lists are tiny).
		for (size_t i = 1; i < Phases.size(); ++i)
		{
			FBossPhase Moving = Phases[i];
			size_t j = i;
			while (j > 0 && Phases[j - 1].HealthThreshold < Moving.HealthThreshold)
			{
				Phases[j] = Phases[j - 1];
				--j;
			}
			Phases[j] = Moving;
		}
		PhaseIndex = 0;
	}

	bool FBossController::Update(float HealthFraction)
	{
		bool bAdvanced = false;
		while (PhaseIndex + 1 < GetPhaseCount() && HealthFraction <= Phases[static_cast<size_t>(PhaseIndex + 1)].HealthThreshold)
		{
			++PhaseIndex;
			bAdvanced = true;
		}
		return bAdvanced;
	}
}
