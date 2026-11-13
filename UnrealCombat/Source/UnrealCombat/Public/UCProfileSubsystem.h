#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "UCCore/Profile.h"
#include "UCTypes.h"
#include "UCProfileSubsystem.generated.h"

class UUCCatalog;
class UUCProfileSubsystem;

/** On-device save container. The payload is the rules core's versioned profile text. */
UCLASS()
class UNREALCOMBAT_API UUCSaveGame : public USaveGame
{
	GENERATED_BODY()

public:
	UPROPERTY()
	FString PlayerId;

	UPROPERTY()
	FString ProfileText;
};

/**
 * Account + storage boundary. The game only talks to this interface, so the on-device
 * implementation below can be replaced by an online service (see Docs/BackendArchitecture.md)
 * without touching gameplay or UI code.
 */
class UNREALCOMBAT_API IUCBackendService
{
public:
	virtual ~IUCBackendService() = default;

	virtual bool IsOnline() const = 0;
	virtual void SignIn(TFunction<void(bool bSuccess, const FString& PlayerId)> OnDone) = 0;
	virtual void LoadProfile(const FString& PlayerId, TFunction<void(bool bFound, const FString& ProfileText)> OnDone) = 0;
	virtual void SaveProfile(const FString& PlayerId, const FString& ProfileText, TFunction<void(bool bSuccess)> OnDone) = 0;
};

/** Guest account stored in a local save slot. Works fully offline. */
class UNREALCOMBAT_API FUCLocalBackendService : public IUCBackendService
{
public:
	virtual bool IsOnline() const override { return false; }
	virtual void SignIn(TFunction<void(bool, const FString&)> OnDone) override;
	virtual void LoadProfile(const FString& PlayerId, TFunction<void(bool, const FString&)> OnDone) override;
	virtual void SaveProfile(const FString& PlayerId, const FString& ProfileText, TFunction<void(bool)> OnDone) override;

private:
	static const TCHAR* SlotName;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FUCOnProfileChanged, UUCProfileSubsystem*, Profile);

/**
 * The player's account, wallet, inventory, loadout and progression.
 * All rules are in the rules core (uc::PurchaseItem etc.); this class owns loading, saving and
 * the Blueprint-facing API that menus, garage and HUD read from.
 */
UCLASS()
class UNREALCOMBAT_API UUCProfileSubsystem : public UGameInstanceSubsystem
{
	GENERATED_BODY()

public:
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;

	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Profile")
	bool IsLoaded() const { return bLoaded; }

	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Profile")
	FString GetPlayerId() const { return UC::ToFString(Profile.PlayerId); }

	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Profile")
	FString GetDisplayName() const { return UC::ToFString(Profile.DisplayName); }

	UFUNCTION(BlueprintCallable, Category = "Unreal Combat|Profile")
	void SetDisplayName(const FString& NewName);

	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Profile")
	int32 GetLevel() const { return Profile.Level; }

	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Profile")
	int64 GetXp() const { return Profile.Xp; }

	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Profile")
	int64 GetXpForNextLevel() const;

	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Profile")
	int64 GetBalance(EUCCurrency Currency) const { return Profile.Balance[static_cast<int32>(Currency)]; }

	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Profile")
	bool OwnsItem(FName ItemId) const { return Profile.Owns(UC::ToStd(ItemId)); }

	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Profile")
	FName GetEquippedItem(EUCLoadoutSlot Slot) const { return UC::ToFName(Profile.Loadout[static_cast<int32>(Slot)]); }

	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Profile")
	bool HasCompletedMission(FName MissionId) const { return Profile.HasCompletedMission(UC::ToStd(MissionId)); }

	UFUNCTION(BlueprintCallable, Category = "Unreal Combat|Profile")
	EUCTransactionResult PurchaseItem(FName ItemId);

	UFUNCTION(BlueprintCallable, Category = "Unreal Combat|Profile")
	EUCTransactionResult EquipItem(EUCLoadoutSlot Slot, FName ItemId);

	/** Applies XP, credits and mission completion exactly once per match. Returns levels gained. */
	UFUNCTION(BlueprintCallable, Category = "Unreal Combat|Profile")
	int32 ApplyMatchResult(const FUCMatchResult& Result);

	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Profile")
	const UUCCatalog* GetCatalog() const { return Catalog; }

	UPROPERTY(BlueprintAssignable, Category = "Unreal Combat|Profile")
	FUCOnProfileChanged OnProfileChanged;

private:
	void HandleSignedIn(bool bSuccess, const FString& PlayerId);
	void HandleProfileLoaded(bool bFound, const FString& ProfileText);
	void CreateStarterProfile();
	void CommitChange();
	static uc::FId NewTransactionId();

	TSharedPtr<IUCBackendService> Backend;
	uc::FPlayerProfile Profile;
	uc::FCatalog CoreCatalog;
	bool bLoaded = false;

	UPROPERTY()
	TObjectPtr<const UUCCatalog> Catalog;
};
