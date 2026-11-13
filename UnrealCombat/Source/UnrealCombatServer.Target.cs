// Dedicated server target. Requires an engine built from source (not the launcher build).
using UnrealBuildTool;

public class UnrealCombatServerTarget : TargetRules
{
	public UnrealCombatServerTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Server;
		DefaultBuildSettings = BuildSettingsVersion.Latest;
		IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
		ExtraModuleNames.AddRange(new string[] { "UnrealCombat", "UnrealCombatCore" });
	}
}
