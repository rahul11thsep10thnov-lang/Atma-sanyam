#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "UCTypes.h"
#include "UCUITheme.h"
#include "UCFrontEndWidgets.generated.h"

class UBorder;
class UCanvasPanel;
class UHorizontalBox;
class UOverlay;
class UScrollBox;
class UTextBlock;
class UUCCatalog;
class UUCMissionDefinition;
class UUCProfileSubsystem;
class UUCFrontEndSubsystem;
class UVerticalBox;
class UWrapBox;
struct FUCCatalogEntry;

/** Which missions the mission screen lists. */
enum class EMissionFilter : uint8 { All, Missions, BossHunt };

/**
 * Front-end shell: background, a stack of screens (menu, garage, store, missions), one modal at a time,
 * toasts and the screen-change wipe (PH-CINE-001 front-end transition). Android back closes the modal first,
 * then goes back one screen, then asks to exit. Contains no gameplay or economy rules.
 */
UCLASS()
class UNREALCOMBAT_API UUCFrontEndWidget : public UUserWidget
{
	GENERATED_BODY()

public:
	enum class EScreen : uint8 { Menu, Garage, Store, Missions };

	void Open(EScreen Screen);
	void OpenMissions(EMissionFilter Filter);
	void Back();
	bool HandleBack();

	void ShowModal(const FText& Title, const FText& Body, const FText& ConfirmLabel, const FText& CancelLabel, TFunction<void()> OnConfirm, bool bDestructive = false);
	void CloseModal();
	void Toast(const FText& Message, UCTheme::ESeverity Severity);
	/** Shows the loading cover (no percentage: the engine does not report one) and runs the launch. */
	void BeginLoading(const FText& Title, TFunction<void()> Launch);

	virtual void NativeTick(const FGeometry& MyGeometry, float InDeltaTime) override;

protected:
	virtual TSharedRef<SWidget> RebuildWidget() override;
	virtual FReply NativeOnKeyDown(const FGeometry& InGeometry, const FKeyEvent& InKeyEvent) override;

private:
	void ShowScreen(EScreen Screen);
	void StartTransition(TFunction<void()> AtMidpoint);

	UPROPERTY() TObjectPtr<UCanvasPanel> Root;
	UPROPERTY() TObjectPtr<UOverlay> ScreenHost;
	UPROPERTY() TObjectPtr<UBorder> ModalLayer;
	UPROPERTY() TObjectPtr<UVerticalBox> ToastBox;
	UPROPERTY() TObjectPtr<UBorder> WipeCover;
	UPROPERTY() TObjectPtr<UBorder> WipeLine;
	UPROPERTY() TObjectPtr<UBorder> LoadingCover;
	UPROPERTY() TObjectPtr<UUserWidget> CurrentScreen;

	TArray<EScreen> Stack;
	TFunction<void()> PendingMidpoint;
	TFunction<void()> ModalConfirm;
	float TransitionTime = -1.f;
	bool bMidpointDone = false;
	float ToastTimer = 0.f;
	bool bBuilt = false;

	static constexpr float WipeHalf = 0.14f; // 2 x 140 ms = 280 ms, inside the 240-320 ms spec range
};

/** Common behaviour of the four screens: reach the shell, profile and catalogue, refresh on profile change. */
UCLASS(Abstract)
class UNREALCOMBAT_API UUCScreenWidget : public UUserWidget
{
	GENERATED_BODY()

public:
	void SetShell(UUCFrontEndWidget* InShell) { Shell = InShell; }
	virtual void NativeTick(const FGeometry& MyGeometry, float InDeltaTime) override;

protected:
	virtual void NativeConstruct() override;
	virtual void NativeDestruct() override;
	virtual void Refresh() {}
	void MarkDirty() { bDirty = true; }

	UUCProfileSubsystem* GetProfile() const;
	UUCFrontEndSubsystem* GetFrontEnd() const;
	const UUCCatalog* GetCatalog() const;

	UFUNCTION()
	void HandleProfileChanged(UUCProfileSubsystem* Profile);

	TWeakObjectPtr<UUCFrontEndWidget> Shell;
	bool bDirty = true;
};

UCLASS()
class UNREALCOMBAT_API UUCMenuScreen : public UUCScreenWidget
{
	GENERATED_BODY()

protected:
	virtual TSharedRef<SWidget> RebuildWidget() override;
	virtual void Refresh() override;

private:
	void RebuildProfile();
	void RebuildModeCards();
	void RebuildVehicleCard();
	void OnPlayPressed();

	UPROPERTY() TObjectPtr<UBorder> ProfileHost;
	UPROPERTY() TObjectPtr<UBorder> CurrencyHost;
	UPROPERTY() TObjectPtr<UBorder> HeroHost;
	UPROPERTY() TObjectPtr<UWrapBox> ModeCards;
	UPROPERTY() TObjectPtr<UBorder> PlayHost;
	UPROPERTY() TObjectPtr<UBorder> VehicleHost;

	EUCMatchMode SelectedMode = EUCMatchMode::FreeForAll;
	bool bBuilt = false;
};

UCLASS()
class UNREALCOMBAT_API UUCGarageScreen : public UUCScreenWidget
{
	GENERATED_BODY()

protected:
	virtual TSharedRef<SWidget> RebuildWidget() override;
	virtual void Refresh() override;

private:
	void RebuildCategories();
	void RebuildList();
	void RebuildPreviewAndDetail();
	void RebuildLoadout();

	UPROPERTY() TObjectPtr<UWrapBox> CategoryBox;
	UPROPERTY() TObjectPtr<UVerticalBox> ItemList;
	UPROPERTY() TObjectPtr<UBorder> PreviewHost;
	UPROPERTY() TObjectPtr<UBorder> DetailHost;
	UPROPERTY() TObjectPtr<UBorder> LoadoutHost;
	UPROPERTY() TObjectPtr<UBorder> CurrencyHost;

	EUCItemKind Category = EUCItemKind::Vehicle;
	FName SelectedItem;
	bool bBuilt = false;
};

UCLASS()
class UNREALCOMBAT_API UUCStoreScreen : public UUCScreenWidget
{
	GENERATED_BODY()

protected:
	virtual TSharedRef<SWidget> RebuildWidget() override;
	virtual void Refresh() override;

private:
	void RebuildFilters();
	void RebuildGrid();
	void RebuildDetail();

	UPROPERTY() TObjectPtr<UVerticalBox> FilterBox;
	UPROPERTY() TObjectPtr<UWrapBox> Grid;
	UPROPERTY() TObjectPtr<UBorder> DetailHost;
	UPROPERTY() TObjectPtr<UBorder> CurrencyHost;

	/** -1 = all, otherwise an EUCItemKind value. */
	int32 Filter = -1;
	FName SelectedItem;
	bool bBuilt = false;
};

UCLASS()
class UNREALCOMBAT_API UUCMissionScreen : public UUCScreenWidget
{
	GENERATED_BODY()

public:
	void SetFilter(EMissionFilter InFilter) { Filter = InFilter; MarkDirty(); }

protected:
	virtual TSharedRef<SWidget> RebuildWidget() override;
	virtual void Refresh() override;

private:
	void RebuildFilters();
	void RebuildList();
	void RebuildDetail();

	UPROPERTY() TObjectPtr<UHorizontalBox> FilterBox;
	UPROPERTY() TObjectPtr<UVerticalBox> MissionList;
	UPROPERTY() TObjectPtr<UBorder> DetailHost;

	EMissionFilter Filter = EMissionFilter::All;
	FName SelectedMission;
	bool bBuilt = false;
};
