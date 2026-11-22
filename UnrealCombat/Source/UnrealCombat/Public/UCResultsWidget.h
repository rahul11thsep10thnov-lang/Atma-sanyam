#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "UCTypes.h"
#include "UCResultsWidget.generated.h"

class AUCPlayerController;
class UBorder;
class UCanvasPanel;
class UProgressBar;
class UTextBlock;
class UUCProfileSubsystem;

/**
 * PH-RESULTS-001 v1.0 - match results and rewards. Read-only except for one action (Continue), which calls
 * AUCPlayerController::ReturnToMainMenu. Every number comes from the match result, the player state or the
 * profile; earned amounts come from the profile's own record of what it granted (never calculated here).
 */
UCLASS()
class UNREALCOMBAT_API UUCResultsWidget : public UUserWidget
{
	GENERATED_BODY()

public:
	void SetResult(const FUCMatchResult& InResult, int32 InLevelsGained) { Result = InResult; LevelsGained = InLevelsGained; bHasResult = true; Rebuild(); }
	virtual void NativeTick(const FGeometry& MyGeometry, float InDeltaTime) override;

protected:
	virtual TSharedRef<SWidget> RebuildWidget() override;
	virtual void NativeConstruct() override;
	virtual void NativeDestruct() override;

private:
	void Rebuild();
	UFUNCTION() void HandleProfileChanged(UUCProfileSubsystem* Profile);
	UUCProfileSubsystem* GetProfile() const;

	struct FReveal { UWidget* Widget = nullptr; float Delay = 0.f; float Duration = 0.2f; };

	UPROPERTY() TObjectPtr<UCanvasPanel> Canvas;
	UPROPERTY() TObjectPtr<UBorder> Scrim;
	UPROPERTY() TArray<TObjectPtr<UWidget>> Sections;
	UPROPERTY() TObjectPtr<UProgressBar> XpBar;
	UPROPERTY() TObjectPtr<UWidget> LevelUpBanner;

	TArray<FReveal> Reveals;
	FUCMatchResult Result;
	int32 LevelsGained = 0;
	float Age = 0.f;
	float XpFrom = 0.f;
	float XpTo = 0.f;
	bool bHasResult = false;
	bool bBuilt = false;
};
