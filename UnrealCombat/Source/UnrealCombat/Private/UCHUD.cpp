#include "UCHUD.h"

#include "Blueprint/UserWidget.h"
#include "Framework/Application/SlateApplication.h"
#include "GameFramework/PlayerController.h"
#include "UCHUDWidget.h"
#include "UCTouchWidgets.h"

#include UE_INLINE_GENERATED_CPP_BY_NAME(UCHUD)

void AUCHUD::BeginPlay()
{
	Super::BeginPlay();
	APlayerController* Controller = GetOwningPlayerController();
	if (Controller == nullptr || !Controller->IsLocalController())
	{
		return;
	}

	HudWidget = CreateWidget<UUCHUDWidget>(Controller, UUCHUDWidget::StaticClass());
	HudWidget->SetVisibility(ESlateVisibility::HitTestInvisible);
	HudWidget->AddToViewport(0);

	const bool bTouchDevice = PLATFORM_ANDROID || PLATFORM_IOS || FSlateApplication::Get().IsFakingTouchEvents();
	if (bTouchDevice || bShowTouchControlsOnDesktop)
	{
		TouchWidget = CreateWidget<UUCTouchControlsWidget>(Controller, UUCTouchControlsWidget::StaticClass());
		// Only the controls themselves take touches; empty canvas passes them through.
		TouchWidget->SetVisibility(ESlateVisibility::SelfHitTestInvisible);
		TouchWidget->AddToViewport(1);
	}
}

void AUCHUD::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	if (TouchWidget != nullptr) { TouchWidget->RemoveFromParent(); }
	if (HudWidget != nullptr) { HudWidget->RemoveFromParent(); }
	Super::EndPlay(EndPlayReason);
}
