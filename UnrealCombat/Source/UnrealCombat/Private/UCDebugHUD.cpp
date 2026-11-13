#include "UCDebugHUD.h"

#include "Engine/GameInstance.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "UCAbilityComponent.h"
#include "UCGameFramework.h"
#include "UCProfileSubsystem.h"
#include "UCVehicleHealthComponent.h"
#include "UCVehiclePawn.h"
#include "UCWeaponComponent.h"

#include UE_INLINE_GENERATED_CPP_BY_NAME(UCDebugHUD)

void AUCDebugHUD::Line(const FString& Text)
{
	DrawText(Text, FLinearColor::White, 40.f, CursorY, nullptr, 1.5f);
	CursorY += 26.f;
}

static FString UCDescribeWeapon(const TCHAR* Label, const UUCWeaponComponent* Weapon)
{
	if (Weapon == nullptr || !Weapon->HasWeapon())
	{
		return FString::Printf(TEXT("%s: none"), Label);
	}
	const FUCWeaponState& State = Weapon->GetWeaponState();
	const TCHAR* Status = !State.bOnline ? TEXT(" OFFLINE") : State.bReloading ? TEXT(" RELOADING") : State.bOverheated ? TEXT(" OVERHEATED") : TEXT("");
	return FString::Printf(TEXT("%s: %d / %d  heat %d%%%s"), Label, State.AmmoInMagazine, State.ReserveAmmo, FMath::RoundToInt(Weapon->GetHeat() * 100.f), Status);
}

void AUCDebugHUD::DrawHUD()
{
	Super::DrawHUD();
	CursorY = 40.f;
	const UWorld* World = GetWorld();

	if (const AUCGameState* GameState = World != nullptr ? World->GetGameState<AUCGameState>() : nullptr)
	{
		const UEnum* PhaseEnum = StaticEnum<EUCMatchPhase>();
		const UEnum* ModeEnum = StaticEnum<EUCMatchMode>();
		Line(FString::Printf(TEXT("%s  %s  time %d"), *ModeEnum->GetNameStringByValue(static_cast<int64>(GameState->Mode)), *PhaseEnum->GetNameStringByValue(static_cast<int64>(GameState->Phase)), GameState->SecondsRemaining));
		for (int32 Team = 0; Team < GameState->TeamScores.Num(); ++Team)
		{
			Line(FString::Printf(TEXT("Team %d: %d / %d"), Team, GameState->TeamScores[Team], GameState->ScoreLimit));
		}
		for (const FUCObjectiveState& Objective : GameState->Objectives)
		{
			Line(FString::Printf(TEXT("%s%s: %d / %d"), *Objective.ObjectiveId.ToString(), Objective.bOptional ? TEXT(" (optional)") : TEXT(""), Objective.Progress, Objective.Required));
		}
		if (GameState->LivesRemaining >= 0)
		{
			Line(FString::Printf(TEXT("Lives: %d"), GameState->LivesRemaining));
		}
		if (GameState->Phase == EUCMatchPhase::Finished)
		{
			Line(GameState->Mode == EUCMatchMode::Mission || GameState->Mode == EUCMatchMode::BossHunt
				? (GameState->bMissionSucceeded ? TEXT("MISSION COMPLETE") : TEXT("MISSION FAILED"))
				: TEXT("MATCH OVER"));
		}
	}

	if (const AUCPlayerState* PlayerState = PlayerOwner != nullptr ? PlayerOwner->GetPlayerState<AUCPlayerState>() : nullptr)
	{
		Line(FString::Printf(TEXT("Score %d  K %d  D %d  team %d"), PlayerState->GetMatchScore(), PlayerState->GetKills(), PlayerState->GetDeaths(), PlayerState->GetTeamId()));
	}

	if (const AUCVehiclePawn* Vehicle = Cast<AUCVehiclePawn>(GetOwningPawn()))
	{
		const UUCVehicleHealthComponent* Health = Vehicle->Health;
		Line(FString::Printf(TEXT("Speed %d km/h"), FMath::RoundToInt(Vehicle->GetSpeedKmh())));
		Line(FString::Printf(TEXT("Chassis %d%%  Engine %d%%  Fuel %d%%%s%s"),
			FMath::RoundToInt(Health->GetHealthFraction(EUCVehicleComponent::Chassis) * 100.f),
			FMath::RoundToInt(Health->GetHealthFraction(EUCVehicleComponent::Engine) * 100.f),
			FMath::RoundToInt(Health->GetHealthFraction(EUCVehicleComponent::FuelTank) * 100.f),
			Health->IsOnFire() ? TEXT("  ON FIRE") : TEXT(""), Health->IsDestroyed() ? TEXT("  DESTROYED") : TEXT("")));
		Line(FString::Printf(TEXT("Wheels FL %d%%  FR %d%%  RL %d%%  RR %d%%"),
			FMath::RoundToInt(Health->GetHealthFraction(EUCVehicleComponent::WheelFL) * 100.f),
			FMath::RoundToInt(Health->GetHealthFraction(EUCVehicleComponent::WheelFR) * 100.f),
			FMath::RoundToInt(Health->GetHealthFraction(EUCVehicleComponent::WheelRL) * 100.f),
			FMath::RoundToInt(Health->GetHealthFraction(EUCVehicleComponent::WheelRR) * 100.f)));
		Line(FString::Printf(TEXT("Armour front %d%%  rear %d%%  left %d%%  right %d%%"),
			FMath::RoundToInt(Health->GetArmorFraction(EUCArmorFacing::Front) * 100.f),
			FMath::RoundToInt(Health->GetArmorFraction(EUCArmorFacing::Rear) * 100.f),
			FMath::RoundToInt(Health->GetArmorFraction(EUCArmorFacing::Left) * 100.f),
			FMath::RoundToInt(Health->GetArmorFraction(EUCArmorFacing::Right) * 100.f)));
		if (Health->HasShield())
		{
			Line(FString::Printf(TEXT("Shield %d%%"), FMath::RoundToInt(Health->GetShieldFraction() * 100.f)));
		}
		Line(UCDescribeWeapon(TEXT("Primary"), Vehicle->PrimaryWeapon));
		Line(UCDescribeWeapon(TEXT("Secondary"), Vehicle->SecondaryWeapon));

		const AGameStateBase* BaseState = World != nullptr ? World->GetGameState() : nullptr;
		const float Now = BaseState != nullptr ? static_cast<float>(BaseState->GetServerWorldTimeSeconds()) : 0.f;
		for (const FUCAbilityState& Ability : Vehicle->Abilities->GetAbilityStates())
		{
			const float Wait = FMath::Max(Ability.ReadyTime - Now, 0.f);
			Line(FString::Printf(TEXT("%s: %s"), *Ability.AbilityId.ToString(),
				Ability.bActive ? TEXT("ACTIVE") : Ability.ChargesRemaining == 0 ? TEXT("empty") : Wait > 0.f ? *FString::Printf(TEXT("%.0fs"), Wait) : TEXT("ready")));
		}
	}

	const UGameInstance* GameInstance = World != nullptr ? World->GetGameInstance() : nullptr;
	if (const UUCProfileSubsystem* Profile = GameInstance != nullptr ? GameInstance->GetSubsystem<UUCProfileSubsystem>() : nullptr)
	{
		if (Profile->IsLoaded())
		{
			Line(FString::Printf(TEXT("%s  level %d  xp %lld / %lld  credits %lld"), *Profile->GetDisplayName(), Profile->GetLevel(), Profile->GetXp(), Profile->GetXpForNextLevel(), Profile->GetBalance(EUCCurrency::Credits)));
		}
	}
}
