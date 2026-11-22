#include "UCFrontEnd.h"

#include "Engine/GameInstance.h"
#include "Engine/World.h"
#include "Kismet/GameplayStatics.h"
#include "UCDefinitions.h"
#include "UCFrontEndWidgets.h"
#include "UCProfileSubsystem.h"
#include "UnrealCombat.h"

#include UE_INLINE_GENERATED_CPP_BY_NAME(UCFrontEnd)

const TCHAR* UUCFrontEndSubsystem::ModeOptionName(EUCMatchMode Mode)
{
	switch (Mode)
	{
	case EUCMatchMode::FreeForAll: return TEXT("FreeForAll");
	case EUCMatchMode::TeamDeathmatch: return TEXT("TeamDeathmatch");
	case EUCMatchMode::Mission: return TEXT("Mission");
	case EUCMatchMode::BossHunt: return TEXT("BossHunt");
	}
	return TEXT("FreeForAll");
}

bool UUCFrontEndSubsystem::CanLaunchMode(EUCMatchMode Mode) const
{
	if (Mode == EUCMatchMode::Mission || Mode == EUCMatchMode::BossHunt)
	{
		return false; // missions are launched through LaunchMission
	}
	const TSoftObjectPtr<UWorld>* Map = GetDefault<UUCGameSettings>()->ModeMaps.Find(Mode);
	return Map != nullptr && !Map->IsNull();
}

bool UUCFrontEndSubsystem::LaunchMode(EUCMatchMode Mode)
{
	if (!CanLaunchMode(Mode))
	{
		return false;
	}
	const TSoftObjectPtr<UWorld>& Map = GetDefault<UUCGameSettings>()->ModeMaps.FindChecked(Mode);
	UGameplayStatics::OpenLevelBySoftObjectPtr(this, Map, true, FString::Printf(TEXT("Mode=%s"), ModeOptionName(Mode)));
	return true;
}

bool UUCFrontEndSubsystem::CanLaunchMission(const UUCMissionDefinition* Mission) const
{
	if (Mission == nullptr || !Mission->MissionId.IsValid() || Mission->MissionId.IsNone())
	{
		return false;
	}
	const UUCProfileSubsystem* Profile = GetGameInstance()->GetSubsystem<UUCProfileSubsystem>();
	if (Profile == nullptr || !Profile->IsLoaded() || Profile->GetLevel() < Mission->RequiredLevel)
	{
		return false;
	}
	if (!Mission->Map.IsNull())
	{
		return true;
	}
	const TSoftObjectPtr<UWorld>* Default = GetDefault<UUCGameSettings>()->ModeMaps.Find(Mission->Mode);
	return Default != nullptr && !Default->IsNull();
}

bool UUCFrontEndSubsystem::LaunchMission(UUCMissionDefinition* Mission)
{
	if (!CanLaunchMission(Mission))
	{
		return false;
	}
	const TSoftObjectPtr<UWorld> Map = !Mission->Map.IsNull() ? Mission->Map : GetDefault<UUCGameSettings>()->ModeMaps.FindChecked(Mission->Mode);
	UGameplayStatics::OpenLevelBySoftObjectPtr(this, Map, true, FString::Printf(TEXT("Mode=%s?Mission=%s"), ModeOptionName(Mission->Mode), *Mission->MissionId.ToString()));
	return true;
}

void UUCFrontEndSubsystem::ReturnToMainMenu()
{
	const TSoftObjectPtr<UWorld>& Menu = GetDefault<UUCGameSettings>()->MainMenuMap;
	if (Menu.IsNull())
	{
		UE_LOG(LogUnrealCombat, Warning, TEXT("No main menu map configured (Project Settings > Unreal Combat > Front End)."));
		return;
	}
	UGameplayStatics::OpenLevelBySoftObjectPtr(this, Menu, true);
}

void UUCFrontEndSubsystem::GetMissions(TArray<UUCMissionDefinition*>& OutMissions) const
{
	for (const TSoftObjectPtr<UUCMissionDefinition>& Entry : GetDefault<UUCGameSettings>()->Missions)
	{
		if (UUCMissionDefinition* Mission = Entry.LoadSynchronous())
		{
			OutMissions.Add(Mission);
		}
	}
}

UUCMissionDefinition* UUCFrontEndSubsystem::FindMission(FName MissionId)
{
	for (const TSoftObjectPtr<UUCMissionDefinition>& Entry : GetDefault<UUCGameSettings>()->Missions)
	{
		UUCMissionDefinition* Mission = Entry.LoadSynchronous();
		if (Mission != nullptr && Mission->MissionId == MissionId)
		{
			return Mission;
		}
	}
	return nullptr;
}

AUCMenuGameMode::AUCMenuGameMode()
{
	PlayerControllerClass = AUCMenuPlayerController::StaticClass();
	DefaultPawnClass = nullptr;
	HUDClass = nullptr;
}

void AUCMenuPlayerController::BeginPlay()
{
	Super::BeginPlay();
	if (!IsLocalController())
	{
		return;
	}
	bShowMouseCursor = true; // editor / desktop testing; harmless on a phone
	FrontEnd = CreateWidget<UUCFrontEndWidget>(this, UUCFrontEndWidget::StaticClass());
	FrontEnd->AddToViewport(0);
	FInputModeUIOnly Mode;
	Mode.SetWidgetToFocus(FrontEnd->TakeWidget());
	SetInputMode(Mode);
}
