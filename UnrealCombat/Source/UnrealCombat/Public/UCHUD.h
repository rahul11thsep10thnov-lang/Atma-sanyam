#pragma once

#include "CoreMinimal.h"
#include "GameFramework/HUD.h"
#include "UCHUD.generated.h"

class UUCHUDWidget;
class UUCTouchControlsWidget;

/**
 * Hosts the approved in-match UI (PH-HUD-001 v1.1) and the touch controls (PH-TOUCH-001 v1.0).
 * Replaces the placeholder debug HUD. Both are code-built UMG widgets; the HUD ignores touches and
 * the controls sit above it so a finger always reaches a control first.
 */
UCLASS()
class UNREALCOMBAT_API AUCHUD : public AHUD
{
	GENERATED_BODY()

public:
	/** Touch controls are shown on touch devices. Tick this to test them with a mouse in the editor. */
	UPROPERTY(EditDefaultsOnly, Category = "Unreal Combat|UI")
	bool bShowTouchControlsOnDesktop = false;

protected:
	virtual void BeginPlay() override;
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	UPROPERTY() TObjectPtr<UUCHUDWidget> HudWidget;
	UPROPERTY() TObjectPtr<UUCTouchControlsWidget> TouchWidget;
};
