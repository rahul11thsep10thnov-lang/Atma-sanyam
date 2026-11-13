using UnrealBuildTool;

public class UnrealCombatTarget : TargetRules
{
	public UnrealCombatTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Game;
		DefaultBuildSettings = BuildSettingsVersion.Latest;
		IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
		ExtraModuleNames.AddRange(new string[] { "UnrealCombat", "UnrealCombatCore" });
	}
}
