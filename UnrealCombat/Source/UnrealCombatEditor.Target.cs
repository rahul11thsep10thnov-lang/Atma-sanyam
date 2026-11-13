using UnrealBuildTool;

public class UnrealCombatEditorTarget : TargetRules
{
	public UnrealCombatEditorTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Editor;
		DefaultBuildSettings = BuildSettingsVersion.Latest;
		IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
		ExtraModuleNames.AddRange(new string[] { "UnrealCombat", "UnrealCombatCore" });
	}
}
