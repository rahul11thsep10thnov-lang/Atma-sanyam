#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "UCUITheme.h"
#include "UCHUDWidget.generated.h"

class AUCGameState;
class AUCVehiclePawn;
class UBorder;
class UCanvasPanel;
class UHorizontalBox;
class UProgressBar;
class USizeBox;
class UTextBlock;
class UUCAbilityComponent;
class UUCVehicleHealthComponent;
class UUCWeaponComponent;
class UVerticalBox;

/**
 * PH-HUD-001 v1.1: the in-match HUD. Read-only (no widget accepts input); every value comes from the
 * presentation bindings in Docs/Architecture.md. Layout follows Delivery 02 at a 1920x1080 reference with
 * edge-anchored groups inside a Safe Zone, so 20:9 phones add space in the middle and notches are respected.
 *
 * Updates are event-driven: gameplay delegates only mark a section dirty, and the next tick refreshes that
 * section alone. Time-based values (speed, reload progress, cooldown rings, boss health) refresh at 10 Hz.
 */
UCLASS()
class UNREALCOMBAT_API UUCHUDWidget : public UUserWidget
{
	GENERATED_BODY()

public:
	virtual void NativeTick(const FGeometry& MyGeometry, float InDeltaTime) override;

protected:
	virtual TSharedRef<SWidget> RebuildWidget() override;
	virtual void NativeDestruct() override;

private:
	struct FWeaponCard
	{
		UBorder* Panel = nullptr;
		UTextBlock* Name = nullptr;
		UTextBlock* Ammo = nullptr;
		UTextBlock* Reserve = nullptr;
		UTextBlock* Status = nullptr;
		UProgressBar* Bar = nullptr;
	};

	struct FSeverityEntry
	{
		FText Name;
		float Fraction = 1.f;
		UCTheme::ESeverity Severity = UCTheme::ESeverity::Normal;
	};

	// ---- construction ----
	void BuildVehiclePanel(UCanvasPanel* Canvas, UVerticalBox* LeftColumn);
	void BuildSpeedStrip(UVerticalBox* LeftColumn);
	void BuildStats(UVerticalBox* LeftColumn);
	void BuildMatchStatus(UCanvasPanel* Canvas);
	void BuildAbilityStrip(UCanvasPanel* Canvas);
	void BuildScorePanel(UCanvasPanel* Canvas);
	FWeaponCard BuildWeaponCard(UCanvasPanel* Canvas, float RefX, bool bPrimary);

	// ---- binding ----
	void BindPawn(AUCVehiclePawn* Pawn);
	void BindGameState(AUCGameState* State);
	UFUNCTION() void HandleHealthChanged(UUCVehicleHealthComponent* Health);
	UFUNCTION() void HandleWeaponChanged(UUCWeaponComponent* Weapon);
	UFUNCTION() void HandleAbilitiesChanged(UUCAbilityComponent* Abilities);
	UFUNCTION() void HandleMatchChanged(AUCGameState* State);

	// ---- refresh ----
	void RefreshVehicle();
	void RefreshSpeedAndStats();
	void RefreshWeapon(FWeaponCard& Card, UUCWeaponComponent* Weapon, bool bPrimary);
	void RefreshAbilities();
	void RefreshMatch();
	void RefreshScorePanel();
	void CollectSeverityEntries(TArray<FSeverityEntry>& Out) const;
	FString ComputeAbilitySignature() const;
	FString ComputeScoreSignature() const;

	AUCVehiclePawn* GetPawn() const;

	// ---- widgets ----
	UPROPERTY() TObjectPtr<UCanvasPanel> Root;

	UPROPERTY() TObjectPtr<USizeBox> VehicleSize;
	UPROPERTY() TObjectPtr<UTextBlock> VehicleStatus;
	UPROPERTY() TObjectPtr<UVerticalBox> VehicleRows;
	UPROPERTY() TObjectPtr<UBorder> Zones[9];
	UPROPERTY() TObjectPtr<UTextBlock> ZoneMarks[9];
	UPROPERTY() TObjectPtr<UHorizontalBox> ShieldRow;
	UPROPERTY() TObjectPtr<UProgressBar> ShieldBar;
	UPROPERTY() TObjectPtr<UTextBlock> ShieldText;
	UPROPERTY() TObjectPtr<UTextBlock> FireText;

	UPROPERTY() TObjectPtr<UTextBlock> SpeedValue;
	UPROPERTY() TObjectPtr<UBorder> StatsPanel;
	UPROPERTY() TObjectPtr<UBorder> StatsTeamStrip;
	UPROPERTY() TObjectPtr<UTextBlock> StatsText;

	UPROPERTY() TObjectPtr<UBorder> MatchPanel;
	UPROPERTY() TObjectPtr<UTextBlock> MatchMode;
	UPROPERTY() TObjectPtr<UTextBlock> MatchClock;
	UPROPERTY() TObjectPtr<UTextBlock> MatchPhase;
	UPROPERTY() TObjectPtr<UTextBlock> MatchTimeTag;

	UPROPERTY() TObjectPtr<UHorizontalBox> AbilityStrip;

	UPROPERTY() TObjectPtr<UBorder> ScorePanel;
	UPROPERTY() TObjectPtr<UVerticalBox> ScoreRows;

	FWeaponCard PrimaryCard;
	FWeaponCard SecondaryCard;
	UPROPERTY() TArray<TObjectPtr<UWidget>> PulseWidgets;

	// ---- state ----
	TWeakObjectPtr<AUCVehiclePawn> BoundPawn;
	TWeakObjectPtr<AUCGameState> BoundState;
	bool bVehicleDirty = true;
	bool bPrimaryDirty = true;
	bool bSecondaryDirty = true;
	bool bAbilitiesDirty = true;
	bool bMatchDirty = true;
	float SlowTimer = 0.f;
	float PulseTime = 0.f;
	float VehicleHeightCurrent = 176.f;
	float VehicleHeightTarget = 176.f;
	int32 LastShownSpeed = -1;
	/** Content signatures: a section is only rebuilt when what it shows has changed. */
	FString AbilitySignature;
	FString ScoreSignature;
	bool bBuilt = false;
};
