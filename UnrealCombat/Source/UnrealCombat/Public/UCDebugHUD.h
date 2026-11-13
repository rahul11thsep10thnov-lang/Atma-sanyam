#pragma once

#include "CoreMinimal.h"
#include "GameFramework/HUD.h"
#include "UCDebugHUD.generated.h"

/**
 * PLACEHOLDER (register entry PH-HUD-001). Plain text read-out of live gameplay data so systems
 * can be tested before the approved HUD exists. It makes no layout, colour or typography
 * decisions and is replaced wholesale by the delivered HUD, which reads the same data sources.
 */
UCLASS()
class UNREALCOMBAT_API AUCDebugHUD : public AHUD
{
	GENERATED_BODY()

public:
	virtual void DrawHUD() override;

private:
	void Line(const FString& Text);
	float CursorY = 0.f;
};
