using UnrealBuildTool;

// Engine-agnostic game rules (standard C++ only). The same sources are built
// headlessly by CoreTests/CMakeLists.txt, so nothing here may include Unreal
// headers except UnrealCombatCoreModule.cpp.
public class UnrealCombatCore : ModuleRules
{
	public UnrealCombatCore(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.NoPCHs;
		bUseUnity = false;
		PublicDependencyModuleNames.Add("Core");
	}
}
