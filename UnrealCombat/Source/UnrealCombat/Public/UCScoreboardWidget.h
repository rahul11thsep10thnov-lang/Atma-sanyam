#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "UCScoreboardWidget.generated.h"

class UBorder;
class UVerticalBox;

/**
 * PH-SCOREBOARD-001 v1.0. Read-only table built from replicated AUCGameState / AUCPlayerState.
 * Free-for-all: one ranked list. Team deathmatch: two groups with team scores. Missions: the players plus any boss.
 * Columns are rank, player, team, kills, deaths, score (no assists / damage: not replicated).
 */
UCLASS()
class UNREALCOMBAT_API UUCScoreboardWidget : public UUserWidget
{
	GENERATED_BODY()

public:
	void SetShown(bool bShow);
	bool IsShown() const { return bShown; }
	virtual void NativeTick(const FGeometry& MyGeometry, float InDeltaTime) override;

protected:
	virtual TSharedRef<SWidget> RebuildWidget() override;

private:
	void Rebuild();

	UPROPERTY() TObjectPtr<UBorder> Host;
	UPROPERTY() TObjectPtr<UVerticalBox> Rows;
	FString Signature;
	float Timer = 0.f;
	bool bShown = false;
	bool bBuilt = false;
};
