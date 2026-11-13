#include "UCProfileSubsystem.h"

#include "Kismet/GameplayStatics.h"
#include "UCDefinitions.h"
#include "UnrealCombat.h"

#include UE_INLINE_GENERATED_CPP_BY_NAME(UCProfileSubsystem)

const TCHAR* FUCLocalBackendService::SlotName = TEXT("UnrealCombatProfile");

void FUCLocalBackendService::SignIn(TFunction<void(bool, const FString&)> OnDone)
{
	// Reuse the guest id stored with the save, or mint a new one.
	FString PlayerId;
	if (const UUCSaveGame* Save = Cast<UUCSaveGame>(UGameplayStatics::LoadGameFromSlot(SlotName, 0)))
	{
		PlayerId = Save->PlayerId;
	}
	if (PlayerId.IsEmpty())
	{
		PlayerId = FString::Printf(TEXT("guest-%s"), *FGuid::NewGuid().ToString(EGuidFormats::Digits).ToLower());
	}
	OnDone(true, PlayerId);
}

void FUCLocalBackendService::LoadProfile(const FString& PlayerId, TFunction<void(bool, const FString&)> OnDone)
{
	const UUCSaveGame* Save = Cast<UUCSaveGame>(UGameplayStatics::LoadGameFromSlot(SlotName, 0));
	const bool bFound = Save != nullptr && Save->PlayerId == PlayerId && !Save->ProfileText.IsEmpty();
	OnDone(bFound, bFound ? Save->ProfileText : FString());
}

void FUCLocalBackendService::SaveProfile(const FString& PlayerId, const FString& ProfileText, TFunction<void(bool)> OnDone)
{
	UUCSaveGame* Save = Cast<UUCSaveGame>(UGameplayStatics::CreateSaveGameObject(UUCSaveGame::StaticClass()));
	Save->PlayerId = PlayerId;
	Save->ProfileText = ProfileText;
	OnDone(UGameplayStatics::SaveGameToSlot(Save, SlotName, 0));
}

void UUCProfileSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);

	const UUCGameSettings* Settings = GetDefault<UUCGameSettings>();
	Catalog = Settings->Catalog.LoadSynchronous();
	if (Catalog != nullptr)
	{
		CoreCatalog = Catalog->ToCore();
	}
	else
	{
		UE_LOG(LogUnrealCombat, Warning, TEXT("No catalog configured (Project Settings > Unreal Combat); purchases are unavailable."));
	}

	Backend = MakeShared<FUCLocalBackendService>();
	TWeakObjectPtr<UUCProfileSubsystem> WeakThis(this);
	Backend->SignIn([WeakThis](bool bSuccess, const FString& PlayerId)
	{
		if (UUCProfileSubsystem* Self = WeakThis.Get())
		{
			Self->HandleSignedIn(bSuccess, PlayerId);
		}
	});
}

void UUCProfileSubsystem::HandleSignedIn(bool bSuccess, const FString& PlayerId)
{
	if (!bSuccess)
	{
		UE_LOG(LogUnrealCombat, Error, TEXT("Sign-in failed; progress will not be saved this session."));
		return;
	}
	Profile.PlayerId = UC::ToStd(PlayerId);
	TWeakObjectPtr<UUCProfileSubsystem> WeakThis(this);
	Backend->LoadProfile(PlayerId, [WeakThis](bool bFound, const FString& ProfileText)
	{
		if (UUCProfileSubsystem* Self = WeakThis.Get())
		{
			Self->HandleProfileLoaded(bFound, ProfileText);
		}
	});
}

void UUCProfileSubsystem::HandleProfileLoaded(bool bFound, const FString& ProfileText)
{
	const uc::FId PlayerId = Profile.PlayerId;
	uc::FPlayerProfile Loaded;
	if (bFound && uc::DeserializeProfile(UC::ToStd(ProfileText), Loaded))
	{
		Profile = Loaded;
		Profile.PlayerId = PlayerId;
		bLoaded = true;
		OnProfileChanged.Broadcast(this);
		return;
	}
	if (bFound)
	{
		UE_LOG(LogUnrealCombat, Error, TEXT("Saved profile could not be read; starting a new one."));
	}
	CreateStarterProfile();
}

void UUCProfileSubsystem::CreateStarterProfile()
{
	const UUCGameSettings* Settings = GetDefault<UUCGameSettings>();
	const uc::FId PlayerId = Profile.PlayerId;
	Profile = uc::FPlayerProfile();
	Profile.PlayerId = PlayerId;
	Profile.DisplayName = "Driver";
	if (Settings->StartingCredits > 0)
	{
		uc::GrantCurrency(Profile, uc::ECurrency::Credits, Settings->StartingCredits, "starter-credits");
	}
	for (const FName& ItemName : Settings->StarterItems)
	{
		const uc::FId ItemId = UC::ToStd(ItemName);
		if (!uc::IsValidId(ItemId) || Profile.Owns(ItemId))
		{
			continue;
		}
		Profile.OwnedItems.push_back(ItemId);
		// Equip the first starter vehicle and weapon so a new player can drive straight away.
		if (const uc::FCatalogItem* Item = CoreCatalog.Find(ItemId))
		{
			const int32 Vehicle = static_cast<int32>(uc::ELoadoutSlot::Vehicle);
			const int32 Primary = static_cast<int32>(uc::ELoadoutSlot::PrimaryWeapon);
			if (Item->Kind == uc::EItemKind::Vehicle && Profile.Loadout[Vehicle].empty())
			{
				Profile.Loadout[Vehicle] = ItemId;
			}
			else if (Item->Kind == uc::EItemKind::Weapon && Profile.Loadout[Primary].empty())
			{
				Profile.Loadout[Primary] = ItemId;
			}
		}
	}
	bLoaded = true;
	CommitChange();
}

void UUCProfileSubsystem::CommitChange()
{
	if (Backend.IsValid() && !Profile.PlayerId.empty())
	{
		Backend->SaveProfile(UC::ToFString(Profile.PlayerId), UC::ToFString(uc::SerializeProfile(Profile)), [](bool bSuccess)
		{
			if (!bSuccess)
			{
				UE_LOG(LogUnrealCombat, Error, TEXT("Saving the profile failed."));
			}
		});
	}
	OnProfileChanged.Broadcast(this);
}

uc::FId UUCProfileSubsystem::NewTransactionId()
{
	return UC::ToStd(FString::Printf(TEXT("tx-%s"), *FGuid::NewGuid().ToString(EGuidFormats::Digits).ToLower()));
}

void UUCProfileSubsystem::SetDisplayName(const FString& NewName)
{
	const FString Trimmed = NewName.TrimStartAndEnd().Left(24);
	if (bLoaded && !Trimmed.IsEmpty())
	{
		Profile.DisplayName = UC::ToStd(Trimmed);
		CommitChange();
	}
}

int64 UUCProfileSubsystem::GetXpForNextLevel() const
{
	return uc::XpForNextLevel(GetDefault<UUCGameSettings>()->ToProgressionSpec(), Profile.Level);
}

EUCTransactionResult UUCProfileSubsystem::PurchaseItem(FName ItemId)
{
	if (!bLoaded)
	{
		return EUCTransactionResult::UnknownItem;
	}
	const uc::ETxResult Result = uc::PurchaseItem(Profile, CoreCatalog, UC::ToStd(ItemId), NewTransactionId());
	if (Result == uc::ETxResult::Ok)
	{
		CommitChange();
	}
	return static_cast<EUCTransactionResult>(Result);
}

EUCTransactionResult UUCProfileSubsystem::EquipItem(EUCLoadoutSlot Slot, FName ItemId)
{
	if (!bLoaded)
	{
		return EUCTransactionResult::UnknownItem;
	}
	const uc::ETxResult Result = uc::EquipItem(Profile, CoreCatalog, static_cast<uc::ELoadoutSlot>(Slot), UC::ToStd(ItemId));
	if (Result == uc::ETxResult::Ok)
	{
		CommitChange();
	}
	return static_cast<EUCTransactionResult>(Result);
}

int32 UUCProfileSubsystem::ApplyMatchResult(const FUCMatchResult& Result)
{
	const uc::FId MatchId = UC::ToStd(Result.MatchId);
	if (!bLoaded || !uc::IsValidId(MatchId) || Profile.HasAppliedTransaction(MatchId))
	{
		return 0;
	}
	uc::FMatchPerformance Performance;
	Performance.Kills = Result.Kills;
	Performance.Assists = Result.Assists;
	Performance.Deaths = Result.Deaths;
	Performance.BossesDefeated = Result.BossesDefeated;
	Performance.DamageDealt = Result.DamageDealt;
	Performance.bWon = Result.bWon;
	Performance.bMissionCompleted = Result.bMissionCompleted;

	const uc::FMatchReward Reward = uc::ComputeMatchReward(Performance, uc::FRewardSpec());
	const int32 LevelsGained = uc::ApplyMatchReward(Profile, GetDefault<UUCGameSettings>()->ToProgressionSpec(), Reward, MatchId);

	const uc::FId MissionId = UC::ToStd(Result.MissionId);
	if (Result.bMissionCompleted && uc::IsValidId(MissionId) && !Profile.HasCompletedMission(MissionId))
	{
		Profile.CompletedMissions.push_back(MissionId);
	}
	CommitChange();
	return LevelsGained;
}
