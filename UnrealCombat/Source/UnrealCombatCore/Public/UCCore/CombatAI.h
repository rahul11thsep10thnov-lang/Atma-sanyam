#pragma once

#include "UCCore/Types.h"

namespace uc
{
	enum class EAIState : uint8_t
	{
		Patrol = 0,
		Pursue,
		Engage,
		Evade,
		Retreat
	};

	struct FAIPersonality
	{
		/** 0 = timid, 1 = reckless. Shapes target choice and how long the AI holds under fire. */
		float Aggression = 0.5f;
		/** Below this health fraction the AI disengages. <=0 never retreats (bosses). */
		float RetreatHealthFraction = 0.25f;
		/** Preferred fighting distance as a fraction of weapon range. */
		float PreferredRangeFraction = 0.6f;
		/** Half-angle in degrees inside which the AI opens fire. */
		float AimToleranceDegrees = 8.f;
	};

	struct FAIPerception
	{
		float SelfHealthFraction = 1.f;
		bool bHasTarget = false;
		float TargetDistance = 0.f;
		bool bHasLineOfSight = false;
		float WeaponRange = 15000.f;
		/** Took damage within the last few seconds. */
		bool bUnderFire = false;
	};

	struct FAITargetCandidate
	{
		int32_t Id = -1;
		float Distance = 0.f;
		float HealthFraction = 1.f;
		bool bHasLineOfSight = false;
		bool bIsAttackingMe = false;
	};

	struct FAIDriveInput
	{
		/** -1 (full reverse) .. 1 (full forward). */
		float Throttle = 0.f;
		/** -1 (left) .. 1 (right). */
		float Steering = 0.f;
		bool bHandbrake = false;
		bool bFire = false;
	};

	/** Pick the next behaviour state. Pure function with hysteresis based on the current state. */
	UCCORE_API EAIState DecideState(EAIState Current, const FAIPerception& Perception, const FAIPersonality& Personality);

	/** Returns the id of the best target, or -1. CurrentTargetId gets a stickiness bonus to stop flip-flopping. */
	UCCORE_API int32_t SelectTarget(const std::vector<FAITargetCandidate>& Candidates, const FAIPersonality& Personality, int32_t CurrentTargetId, float MaxRange);

	/**
	 * Convert a behaviour state into driving inputs.
	 * LocalForward / LocalRight are the focus point (target or patrol waypoint) in the vehicle's own frame.
	 */
	UCCORE_API FAIDriveInput ComputeDrive(EAIState State, float LocalForward, float LocalRight, const FAIPerception& Perception, const FAIPersonality& Personality);

	struct FBossPhase
	{
		/** The phase starts once health fraction is at or below this value. */
		float HealthThreshold = 1.f;
		float DamageScale = 1.f;
		float FireRateScale = 1.f;
		float SpeedScale = 1.f;
		/** Optional ability triggered on entering the phase. */
		FId AbilityOnEnter;
	};

	/** Tracks escalating boss phases. Phases only ever advance, even if the boss is repaired. */
	class UCCORE_API FBossController
	{
	public:
		void Reset(const std::vector<FBossPhase>& InPhases);
		/** Returns true when one or more phases were entered during this update. */
		bool Update(float HealthFraction);
		int32_t GetPhaseIndex() const { return PhaseIndex; }
		int32_t GetPhaseCount() const { return static_cast<int32_t>(Phases.size()); }
		const FBossPhase& GetPhase() const { return Phases[static_cast<size_t>(PhaseIndex)]; }

	private:
		std::vector<FBossPhase> Phases;
		int32_t PhaseIndex = 0;
	};
}
