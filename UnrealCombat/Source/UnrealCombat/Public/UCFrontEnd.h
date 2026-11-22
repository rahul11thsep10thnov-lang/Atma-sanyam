#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "GameFramework/PlayerController.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "UCTypes.h"
#include "UCFrontEnd.generated.h"

class UUCFrontEndWidget;
class UUCMissionDefinition;

/**
 * Front-end flow (menu requests MENU-FR-01, MISSION-FR-01/02): which maps exist for which mode, the mission
 * catalogue, and the calls that start a match. The UI only calls this; it never touches rules.
 * Maps and missions are configured in Project Settings > Unreal Combat > Front End.
 */
UCLASS()
class UNREALCOMBAT_API UUCFrontEndSubsystem : public UGameInstanceSubsystem
{
	GENERATED_BODY()

public:
	/** True when a map is configured for the mode. Free-for-all and team deathmatch only; missions use LaunchMission. */
	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Front End")
	bool CanLaunchMode(EUCMatchMode Mode) const;

	/** Starts a free-for-all or team-deathmatch match. Returns false (and does nothing) if it cannot. */
	UFUNCTION(BlueprintCallable, Category = "Unreal Combat|Front End")
	bool LaunchMode(EUCMatchMode Mode);

	/** True when the mission has a map and the profile meets its required level. */
	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Front End")
	bool CanLaunchMission(const UUCMissionDefinition* Mission) const;

	UFUNCTION(BlueprintCallable, Category = "Unreal Combat|Front End")
	bool LaunchMission(UUCMissionDefinition* Mission);

	UFUNCTION(BlueprintCallable, Category = "Unreal Combat|Front End")
	void ReturnToMainMenu();

	/** Loaded mission assets from Project Settings; entries that fail to load are skipped. */
	UFUNCTION(BlueprintCallable, Category = "Unreal Combat|Front End")
	void GetMissions(TArray<UUCMissionDefinition*>& OutMissions) const;

	/** Resolved by the game mode from the ?Mission= option. */
	static UUCMissionDefinition* FindMission(FName MissionId);

	static const TCHAR* ModeOptionName(EUCMatchMode Mode);
};

/** Game mode of the main menu map: no pawn, no HUD, just the front-end controller. */
UCLASS()
class UNREALCOMBAT_API AUCMenuGameMode : public AGameModeBase
{
	GENERATED_BODY()

public:
	AUCMenuGameMode();
};

UCLASS()
class UNREALCOMBAT_API AUCMenuPlayerController : public APlayerController
{
	GENERATED_BODY()

protected:
	virtual void BeginPlay() override;

private:
	UPROPERTY() TObjectPtr<UUCFrontEndWidget> FrontEnd;
};
