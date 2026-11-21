#include "UnrealCombat.h"

#include "Modules/ModuleManager.h"
#include "UCStrings.h"

DEFINE_LOG_CATEGORY(LogUnrealCombat);

class FUnrealCombatModule : public FDefaultGameModuleImpl
{
public:
	virtual void StartupModule() override
	{
		FDefaultGameModuleImpl::StartupModule();
		UCStrings::RegisterTables();
	}
};

IMPLEMENT_PRIMARY_GAME_MODULE(FUnrealCombatModule, UnrealCombat, "UnrealCombat");
