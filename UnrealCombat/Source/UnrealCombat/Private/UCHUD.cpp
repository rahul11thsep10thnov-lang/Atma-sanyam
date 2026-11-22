#include "UCHUD.h"

#include "Blueprint/UserWidget.h"
#include "Framework/Application/SlateApplication.h"
#include "GameFramework/PlayerController.h"
#include "UCGameFramework.h"
#include "UCHUDWidget.h"
#include "UCResultsWidget.h"
#include "UCScoreboardWidget.h"
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

	ScoreboardWidget = CreateWidget<UUCScoreboardWidget>(Controller, UUCScoreboardWidget::StaticClass());
	ScoreboardWidget->AddToViewport(5);
	ScoreboardWidget->SetShown(false);

	if (AUCPlayerController* UCController = Cast<AUCPlayerController>(Controller))
	{
		UCController->OnMatchResult.AddUniqueDynamic(this, &AUCHUD::HandleMatchResult);
	}

	const bool bTouchDevice = PLATFORM_ANDROID || PLATFORM_IOS || FSlateApplication::Get().IsFakingTouchEvents();
	if (bTouchDevice || bShowTouchControlsOnDesktop)
	{
		TouchWidget = CreateWidget<UUCTouchControlsWidget>(Controller, UUCTouchControlsWidget::StaticClass());
		// Only the controls themselves take touches; empty canvas passes them through.
		TouchWidget->SetVisibility(ESlateVisibility::SelfHitTestInvisible);
		TouchWidget->AddToViewport(1);
	}
}

void AUCHUD::ToggleScoreboard()
{
	if (ScoreboardWidget != nullptr)
	{
		ScoreboardWidget->SetShown(!ScoreboardWidget->IsShown());
	}
}

void AUCHUD::HandleMatchResult(AUCPlayerController* Controller, const FUCMatchResult& Result)
{
	// Present once per match; ignore a repeated delivery of the same result.
	if (Controller == nullptr || Result.MatchId.IsEmpty() || Result.MatchId == LastResultId)
	{
		return;
	}
	LastResultId = Result.MatchId;
	if (ScoreboardWidget != nullptr) { ScoreboardWidget->SetShown(false); }
	if (TouchWidget != nullptr) { TouchWidget->RemoveFromParent(); TouchWidget = nullptr; }   // releases any held control
	if (HudWidget != nullptr) { HudWidget->RemoveFromParent(); HudWidget = nullptr; }
	Controller->bShowMouseCursor = true;

	ResultsWidget = CreateWidget<UUCResultsWidget>(Controller, UUCResultsWidget::StaticClass());
	ResultsWidget->AddToViewport(10);
	ResultsWidget->SetResult(Result, Controller->LastLevelsGained);
}

void AUCHUD::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	if (ScoreboardWidget != nullptr) { ScoreboardWidget->RemoveFromParent(); }
	if (ResultsWidget != nullptr) { ResultsWidget->RemoveFromParent(); }
	if (TouchWidget != nullptr) { TouchWidget->RemoveFromParent(); }
	if (HudWidget != nullptr) { HudWidget->RemoveFromParent(); }
	Super::EndPlay(EndPlayReason);
}
