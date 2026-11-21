#pragma once

#include "CoreMinimal.h"

/**
 * Localised UI text. Every visible HUD / touch string comes from the string table ST_HUD
 * (source list: Private/UCStringData.inl, mirrored in Content/Localization/ST_HUD.csv for translators).
 * Never put English text directly into widgets.
 */
namespace UCStrings
{
	/** Registers ST_HUD with the string table registry. Called from the module's StartupModule. */
	void RegisterTables();

	/** Look up a key such as "HUD.Weapon.Reloading". */
	UNREALCOMBAT_API FText Get(const TCHAR* Key);
}
