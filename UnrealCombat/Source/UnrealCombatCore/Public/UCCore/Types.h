// Unreal Combat - engine-agnostic simulation core.
// This module deliberately uses only the C++ standard library so the same
// rules can run inside Unreal, on a backend service and in headless tests.
#pragma once

#include <cstdint>
#include <string>
#include <vector>

#ifdef UNREALCOMBATCORE_API
#define UCCORE_API UNREALCOMBATCORE_API
#else
#define UCCORE_API
#endif

namespace uc
{
	using FId = std::string;

	inline float ClampF(float Value, float Lo, float Hi)
	{
		return Value < Lo ? Lo : (Value > Hi ? Hi : Value);
	}

	inline float LerpF(float A, float B, float Alpha)
	{
		return A + (B - A) * Alpha;
	}

	enum class EDamageType : uint8_t
	{
		Kinetic = 0,
		Explosive,
		Energy,
		Fire,
		Collision,
		Count
	};

	/** True when the id is non-empty and only contains [A-Za-z0-9_.-]. Ids are used as save keys. */
	UCCORE_API bool IsValidId(const FId& Id);
}
