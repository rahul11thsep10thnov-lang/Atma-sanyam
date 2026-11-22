#include "UCResultsWidget.h"

#include "Components/SafeZone.h"
#include "Engine/GameInstance.h"
#include "UCGameFramework.h"
#include "UCProfileSubsystem.h"
#include "UCStrings.h"
#include "UCUIKit.h"

#include UE_INLINE_GENERATED_CPP_BY_NAME(UCResultsWidget)

using namespace UCUI;

namespace
{
	constexpr float RefW = 1920.f;
	FText Str(const TCHAR* Key) { return UCStrings::Get(Key); }

	void PlaceAnchored(UCanvasPanel* Canvas, UWidget* Widget, bool bRight, float X, float Y, float W, float H)
	{
		UCanvasPanelSlot* Slot = Canvas->AddChildToCanvas(Widget);
		Slot->SetAnchors(FAnchors(bRight ? 1.f : 0.f, 0.f));
		Slot->SetAlignment(FVector2D::ZeroVector);
		Slot->SetPosition(FVector2D(bRight ? X - RefW : X, Y));
		Slot->SetSize(FVector2D(W, H));
	}

	FText ModeName(EUCMatchMode Mode)
	{
		static const TCHAR* Keys[4] = { TEXT("HUD.Mode.FreeForAll"), TEXT("HUD.Mode.TeamDeathmatch"), TEXT("HUD.Mode.Mission"), TEXT("HUD.Mode.BossHunt") };
		return Str(Keys[FMath::Clamp(static_cast<int32>(Mode), 0, 3)]);
	}
}

UUCProfileSubsystem* UUCResultsWidget::GetProfile() const
{
	const UGameInstance* GameInstance = GetGameInstance();
	return GameInstance != nullptr ? GameInstance->GetSubsystem<UUCProfileSubsystem>() : nullptr;
}

TSharedRef<SWidget> UUCResultsWidget::RebuildWidget()
{
	if (!bBuilt && WidgetTree != nullptr)
	{
		bBuilt = true;
		USafeZone* Safe = WidgetTree->ConstructWidget<USafeZone>(USafeZone::StaticClass());
		WidgetTree->RootWidget = Safe;
		Canvas = WidgetTree->ConstructWidget<UCanvasPanel>(UCanvasPanel::StaticClass());
		Safe->AddChild(Canvas);
	}
	return Super::RebuildWidget();
}

void UUCResultsWidget::NativeConstruct()
{
	Super::NativeConstruct();
	if (UUCProfileSubsystem* Profile = GetProfile())
	{
		Profile->OnProfileChanged.AddUniqueDynamic(this, &UUCResultsWidget::HandleProfileChanged);
	}
}

void UUCResultsWidget::NativeDestruct()
{
	if (UUCProfileSubsystem* Profile = GetProfile())
	{
		Profile->OnProfileChanged.RemoveAll(this);
	}
	Super::NativeDestruct();
}

void UUCResultsWidget::HandleProfileChanged(UUCProfileSubsystem*)
{
	// The profile finished loading or changed after the result arrived: refresh the balance and progression panels.
	if (bHasResult && Age > 0.f) { Rebuild(); }
}

void UUCResultsWidget::Rebuild()
{
	if (Canvas == nullptr || !bHasResult)
	{
		return;
	}
	Canvas->ClearChildren();
	Reveals.Reset();
	const bool bFirstBuild = Age <= 0.f;
	const UUCProfileSubsystem* Profile = GetProfile();
	const bool bProfileReady = Profile != nullptr && Profile->IsLoaded();

	// Scrim behind everything; it also stops touches reaching the game controls underneath.
	UBorder* Background = WidgetTree->ConstructWidget<UBorder>(UBorder::StaticClass());
	Background->SetBrush(Brush(Alpha(Graphite950, 0.88f), Graphite950, 0.f, 0.f));
	Background->SetVisibility(ESlateVisibility::Visible);
	Fill(Canvas, Background);
	if (bFirstBuild) { Reveals.Add({ Background, 0.f, 0.24f }); }

	// ---- verdict (authoritative outcome from the match rules, not from comparing scores) ----
	const bool bWon = Result.Outcome == EUCMatchOutcome::Won;
	const bool bDraw = Result.Outcome == EUCMatchOutcome::Draw;
	const FLinearColor VerdictRim = bWon ? HealthyGreen : (bDraw ? Steel400 : Alpha(EnemyRed, 0.6f));
	UBorder* Verdict = Panel(WidgetTree, VerdictRim, false, FMargin(28.f, 14.f));
	UVerticalBox* VerdictBox = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
	VerdictBox->AddChild(Text(WidgetTree, Str(TEXT("Results.Title")), 18, Muted));
	VerdictBox->AddChild(Text(WidgetTree, Str(bWon ? TEXT("Results.Verdict.Victory") : (bDraw ? TEXT("Results.Verdict.Draw") : TEXT("Results.Verdict.Defeat"))), 64, bWon ? HealthyGreen : White));
	Verdict->SetContent(VerdictBox);
	PlaceAnchored(Canvas, Verdict, false, 64.f, 52.f, 720.f, 190.f);
	if (bFirstBuild) { Reveals.Add({ Verdict, 0.f, 0.32f }); }

	UBorder* Context = Panel(WidgetTree, Steel700, false, FMargin(20.f, 8.f));
	Context->SetContent(Text(WidgetTree, FText::Format(FText::FromString(TEXT("{0}: {1}")), Str(TEXT("Results.Mode")), ModeName(Result.Mode)), 20, White));
	PlaceAnchored(Canvas, Context, false, 64.f, 244.f, 720.f, 52.f);
	if (bFirstBuild) { Reveals.Add({ Context, 0.05f, 0.22f }); }

	// ---- performance: only values the result carries; team only where the mode has teams ----
	UBorder* Performance = Panel(WidgetTree, Steel700, false, FMargin(24.f, 16.f));
	UVerticalBox* PerfBox = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
	PerfBox->AddChild(Text(WidgetTree, Str(TEXT("Results.Performance.Title")), 22, PlayerAmber));
	auto Stat = [&](const TCHAR* Key, const FText& Value, int32 Size)
	{
		UHorizontalBox* Row = WidgetTree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());
		AddFill(Row, Text(WidgetTree, Str(Key), 18, Muted));
		Row->AddChild(Text(WidgetTree, Value, Size, White, ETextJustify::Right));
		AddPadded(PerfBox, Row, FMargin(0.f, 10.f, 0.f, 0.f));
	};
	Stat(TEXT("Results.Stats.Score"), FText::AsNumber(Result.Score), 42);
	Stat(TEXT("Results.Stats.Kills"), FText::AsNumber(Result.Kills), 34);
	Stat(TEXT("Results.Stats.Deaths"), FText::AsNumber(Result.Deaths), 34);
	if (Result.Mode != EUCMatchMode::FreeForAll && Result.TeamId >= 0)
	{
		Stat(TEXT("Results.Stats.Team"), Str(Result.TeamId == 0 ? TEXT("HUD.Score.TeamBlue") : TEXT("HUD.Score.TeamRed")), 34);
	}
	Performance->SetContent(PerfBox);
	PlaceAnchored(Canvas, Performance, false, 64.f, 340.f, 800.f, 330.f);
	if (bFirstBuild) { Reveals.Add({ Performance, 0.08f, 0.22f }); }

	// ---- current balances (never a flashed zero: loading text until the profile is ready) ----
	UBorder* Balances = Panel(WidgetTree, Steel700, false, FMargin(24.f, 14.f));
	UVerticalBox* BalBox = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
	BalBox->AddChild(Text(WidgetTree, Str(TEXT("Results.Balances.Title")), 22, PlayerAmber));
	if (bProfileReady)
	{
		UHorizontalBox* Row = WidgetTree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());
		for (const EUCCurrency Currency : { EUCCurrency::Credits, EUCCurrency::Premium })
		{
			UVerticalBox* Pill = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
			Pill->AddChild(Text(WidgetTree, Str(Currency == EUCCurrency::Credits ? TEXT("Results.Currency.Credits") : TEXT("Results.Currency.Premium")), 16, Muted));
			Pill->AddChild(Text(WidgetTree, FText::AsNumber(Profile->GetBalance(Currency)), 38, White));
			AddFill(Row, Pill);
		}
		AddPadded(BalBox, Row, FMargin(0.f, 8.f, 0.f, 0.f));
	}
	else
	{
		AddPadded(BalBox, Text(WidgetTree, Str(TEXT("Results.Loading")), 20, Steel400), FMargin(0.f, 12.f, 0.f, 0.f));
	}
	Balances->SetContent(BalBox);
	PlaceAnchored(Canvas, Balances, true, 900.f, 340.f, 956.f, 150.f);
	if (bFirstBuild) { Reveals.Add({ Balances, 0.14f, 0.22f }); }

	// ---- earned rewards: only what the profile says it granted for THIS match ----
	const FUCMatchRewardSummary* Reward = bProfileReady ? &Profile->GetLastReward() : nullptr;
	if (Reward != nullptr && Reward->bApplied && Reward->MatchId == Result.MatchId)
	{
		UBorder* Earned = Panel(WidgetTree, Steel700, false, FMargin(24.f, 14.f));
		UVerticalBox* EarnBox = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
		EarnBox->AddChild(Text(WidgetTree, Str(TEXT("Results.Rewards.Title")), 22, PlayerAmber));
		UHorizontalBox* Row = WidgetTree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());
		auto Grant = [&](const TCHAR* LabelKey, int64 Amount)
		{
			UVerticalBox* Pill = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
			Pill->AddChild(Text(WidgetTree, Str(LabelKey), 16, Muted));
			Pill->AddChild(Text(WidgetTree, FText::Format(FText::FromString(TEXT("+{0}")), FText::AsNumber(Amount)), 36, HealthyGreen));
			AddFill(Row, Pill);
		};
		if (Reward->Credits > 0) { Grant(TEXT("Results.Currency.Credits"), Reward->Credits); }
		if (Reward->Xp > 0) { Grant(TEXT("Results.Progression.XP"), Reward->Xp); }
		AddPadded(EarnBox, Row, FMargin(0.f, 8.f, 0.f, 0.f));
		Earned->SetContent(EarnBox);
		PlaceAnchored(Canvas, Earned, true, 900.f, 510.f, 956.f, 160.f);
		if (bFirstBuild) { Reveals.Add({ Earned, 0.2f, 0.3f }); }
	}

	// ---- progression ----
	UBorder* Progress = Panel(WidgetTree, Steel700, false, FMargin(24.f, 14.f));
	UVerticalBox* ProgBox = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
	ProgBox->AddChild(Text(WidgetTree, Str(TEXT("Results.Progression.Title")), 22, PlayerAmber));
	XpBar = nullptr;
	LevelUpBanner = nullptr;
	if (bProfileReady)
	{
		UHorizontalBox* Line = WidgetTree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());
		AddFill(Line, Text(WidgetTree, FText::Format(FText::FromString(TEXT("{0} {1}")), Str(TEXT("Results.Progression.Level")), FText::AsNumber(Profile->GetLevel())), 38, White));
		if (LevelsGained > 0)
		{
			// One-time banner; the count uses the string table's plural form. The final level is the profile's own.
			UVerticalBox* Banner = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
			Banner->AddChild(Text(WidgetTree, Str(TEXT("Results.Progression.LevelUp")), 28, PlayerAmber, ETextJustify::Right));
			Banner->AddChild(Text(WidgetTree, FText::Format(Str(TEXT("Results.Progression.LevelsGainedCount")), FFormatArgumentValue(LevelsGained)), 18, White, ETextJustify::Right));
			Line->AddChild(Banner);
			LevelUpBanner = Banner;
		}
		AddPadded(ProgBox, Line, FMargin(0.f, 8.f, 0.f, 0.f));
		const int64 Needed = Profile->GetXpForNextLevel();
		if (Needed > 0)
		{
			// XP bar only when the profile exposes the next-level threshold. From the pre-match XP when the level
			// did not change, otherwise from zero in the new level (valid start and end values both exist).
			XpTo = FMath::Clamp(static_cast<float>(Profile->GetXp()) / static_cast<float>(Needed), 0.f, 1.f);
			const bool bSameLevel = Reward != nullptr && Reward->bApplied && Reward->MatchId == Result.MatchId && Reward->LevelBefore == Reward->LevelAfter;
			XpFrom = bSameLevel ? FMath::Clamp(static_cast<float>(Reward->XpBefore) / static_cast<float>(Needed), 0.f, 1.f) : 0.f;
			XpBar = Bar(WidgetTree, bFirstBuild ? XpFrom : XpTo, PlayerAmber);
			AddPadded(ProgBox, Sized(WidgetTree, XpBar, 0.f, 12.f), FMargin(0.f, 12.f, 0.f, 4.f));
			ProgBox->AddChild(Text(WidgetTree, FText::Format(FText::FromString(TEXT("{0} {1} / {2}")), Str(TEXT("Results.Progression.XP")), FText::AsNumber(Profile->GetXp()), FText::AsNumber(Needed)), 16, Muted));
		}
	}
	else
	{
		AddPadded(ProgBox, Text(WidgetTree, Str(TEXT("Results.Loading")), 20, Steel400), FMargin(0.f, 12.f, 0.f, 0.f));
	}
	Progress->SetContent(ProgBox);
	PlaceAnchored(Canvas, Progress, false, 64.f, 704.f, 800.f, 230.f);
	if (bFirstBuild) { Reveals.Add({ Progress, 0.2f, 0.26f }); }

	// ---- the one action: Continue returns to the main menu through the player controller ----
	TWeakObjectPtr<UUCResultsWidget> WeakThis(this);
	UButton* Continue = Button(this, WidgetTree, Str(TEXT("Results.Action.Continue")), [WeakThis]()
	{
		if (UUCResultsWidget* Self = WeakThis.Get())
		{
			if (AUCPlayerController* Controller = Cast<AUCPlayerController>(Self->GetOwningPlayer())) { Controller->ReturnToMainMenu(); }
		}
	}, EButtonKind::Primary, true, 28);
	UBorder* Footer = WidgetTree->ConstructWidget<UBorder>(UBorder::StaticClass());
	Footer->SetVisibility(ESlateVisibility::SelfHitTestInvisible);
	Footer->SetVerticalAlignment(VAlign_Bottom);
	Footer->SetHorizontalAlignment(HAlign_Right);
	Footer->SetContent(Sized(WidgetTree, Continue, 360.f, 88.f));
	PlaceAnchored(Canvas, Footer, true, 900.f, 704.f, 956.f, 230.f);
	if (bFirstBuild) { Reveals.Add({ Footer, 0.3f, 0.2f }); Age = 0.0001f; }
}

void UUCResultsWidget::NativeTick(const FGeometry& MyGeometry, float InDeltaTime)
{
	Super::NativeTick(MyGeometry, InDeltaTime);
	if (!bHasResult || Age <= 0.f)
	{
		return;
	}
	Age += InDeltaTime;
	// Entry: fade and a short vertical settle per panel, staggered. Presentation only.
	for (const FReveal& Item : Reveals)
	{
		const float T = FMath::Clamp((Age - Item.Delay) / Item.Duration, 0.f, 1.f);
		const float Eased = 1.f - FMath::Square(1.f - T);
		Item.Widget->SetRenderOpacity(Eased);
		Item.Widget->SetRenderTranslation(FVector2D(0.0, (1.f - Eased) * 16.f));
	}
	// XP bar fill: 500 ms after the progression panel has appeared.
	if (XpBar != nullptr && Age > 0.3f)
	{
		const float T = FMath::Clamp((Age - 0.3f) / 0.5f, 0.f, 1.f);
		XpBar->SetPercent(FMath::Lerp(XpFrom, XpTo, 1.f - FMath::Square(1.f - T)));
	}
	// Level-up accent: one settle from 1.15 to 1.0 over 450 ms.
	if (LevelUpBanner != nullptr)
	{
		const float T = FMath::Clamp((Age - 0.5f) / 0.45f, 0.f, 1.f);
		const float Scale = FMath::Lerp(1.15f, 1.f, 1.f - FMath::Square(1.f - T));
		LevelUpBanner->SetRenderTransformPivot(FVector2D(1.0, 0.5));
		LevelUpBanner->SetRenderScale(FVector2D(Scale, Scale));
	}
}
