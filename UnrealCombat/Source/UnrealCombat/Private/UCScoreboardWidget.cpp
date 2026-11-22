#include "UCScoreboardWidget.h"

#include "Components/SafeZone.h"
#include "GameFramework/PlayerState.h"
#include "UCGameFramework.h"
#include "UCStrings.h"
#include "UCUIKit.h"

#include UE_INLINE_GENERATED_CPP_BY_NAME(UCScoreboardWidget)

using namespace UCUI;

namespace
{
	FText Str(const TCHAR* Key) { return UCStrings::Get(Key); }

	struct FRow
	{
		const AUCPlayerState* State = nullptr;
		int32 Order = 0;
	};

	UWidget* HeaderRow(UWidgetTree* Tree)
	{
		UHorizontalBox* Row = Tree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());
		static const TCHAR* Keys[6] = { TEXT("SCORE.Column.Rank"), TEXT("SCORE.Column.Player"), TEXT("SCORE.Column.Team"), TEXT("SCORE.Column.Kills"), TEXT("SCORE.Column.Deaths"), TEXT("SCORE.Column.Score") };
		static const float Widths[6] = { 0.6f, 3.f, 1.2f, 1.f, 1.f, 1.f };
		for (int32 Index = 0; Index < 6; ++Index)
		{
			UHorizontalBoxSlot* Slot = Cast<UHorizontalBoxSlot>(Row->AddChild(Text(Tree, Str(Keys[Index]), 14, Muted, Index == 1 ? ETextJustify::Left : ETextJustify::Center)));
			Slot->SetSize(FSlateChildSize(ESlateSizeRule::Fill));
			Slot->SetPadding(FMargin(Widths[Index], 0.f, 0.f, 0.f));
		}
		return Row;
	}
}

void UUCScoreboardWidget::SetShown(bool bShow)
{
	bShown = bShow;
	SetVisibility(bShown ? ESlateVisibility::HitTestInvisible : ESlateVisibility::Collapsed);
	if (bShown) { Signature.Empty(); }
}

TSharedRef<SWidget> UUCScoreboardWidget::RebuildWidget()
{
	if (!bBuilt && WidgetTree != nullptr)
	{
		bBuilt = true;
		USafeZone* Safe = WidgetTree->ConstructWidget<USafeZone>(USafeZone::StaticClass());
		WidgetTree->RootWidget = Safe;
		UCanvasPanel* Canvas = WidgetTree->ConstructWidget<UCanvasPanel>(UCanvasPanel::StaticClass());
		Safe->AddChild(Canvas);
		Host = Panel(WidgetTree, PlayerAmber, false, FMargin(24.f, 16.f));
		Rows = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
		Host->SetContent(Rows);
		UCanvasPanelSlot* Slot = Canvas->AddChildToCanvas(Host);
		Slot->SetAnchors(FAnchors(0.5f, 0.5f));
		Slot->SetAlignment(FVector2D(0.5, 0.5));
		Slot->SetSize(FVector2D(1000.0, 0.0));
		Slot->SetAutoSize(true);
		SetVisibility(ESlateVisibility::Collapsed);
	}
	return Super::RebuildWidget();
}

void UUCScoreboardWidget::NativeTick(const FGeometry& MyGeometry, float InDeltaTime)
{
	Super::NativeTick(MyGeometry, InDeltaTime);
	if (!bShown)
	{
		return;
	}
	Timer += InDeltaTime;
	if (Timer >= 0.5f)
	{
		Timer = 0.f;
		Rebuild();
	}
}

void UUCScoreboardWidget::Rebuild()
{
	const AUCGameState* State = GetWorld() != nullptr ? GetWorld()->GetGameState<AUCGameState>() : nullptr;
	if (State == nullptr || Rows == nullptr)
	{
		return;
	}
	const bool bObjectiveMode = State->Mode == EUCMatchMode::Mission || State->Mode == EUCMatchMode::BossHunt;

	TArray<FRow> List;
	for (int32 Index = 0; Index < State->PlayerArray.Num(); ++Index)
	{
		const AUCPlayerState* Player = Cast<AUCPlayerState>(State->PlayerArray[Index]);
		if (Player == nullptr) { continue; }
		// Missions list the people playing, plus a boss if the player array contains one. Other AI is not a "player".
		if (bObjectiveMode && Player->IsABot() && !Player->IsBoss()) { continue; }
		List.Add({ Player, Index });
	}
	// Highest score first; ties keep player-array order (stable and deterministic).
	List.StableSort([](const FRow& A, const FRow& B) { return A.State->GetMatchScore() > B.State->GetMatchScore(); });

	FString NewSignature = FString::Printf(TEXT("%d|%d|"), static_cast<int32>(State->Mode), State->TeamScores.Num());
	for (const int32 Score : State->TeamScores) { NewSignature += FString::Printf(TEXT("%d,"), Score); }
	for (const FRow& Row : List)
	{
		NewSignature += FString::Printf(TEXT("%s:%d/%d/%d/%d;"), *Row.State->GetPlayerName(), Row.State->GetTeamId(), Row.State->GetKills(), Row.State->GetDeaths(), Row.State->GetMatchScore());
	}
	if (NewSignature == Signature)
	{
		return;   // nothing changed: no rebuild
	}
	Signature = NewSignature;

	Rows->ClearChildren();
	Rows->AddChild(Text(WidgetTree, Str(TEXT("SCORE.Title")), 30, White));
	if (State->Mode == EUCMatchMode::TeamDeathmatch && State->TeamScores.Num() >= 2)
	{
		UHorizontalBox* Teams = WidgetTree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());
		AddFill(Teams, Text(WidgetTree, FText::FromString(FString::Printf(TEXT("%s  %d"), *Str(TEXT("SCORE.Team.Blue")).ToString(), State->TeamScores[0])), 26, TeamBlue));
		AddFill(Teams, Text(WidgetTree, FText::FromString(FString::Printf(TEXT("%d  %s"), State->TeamScores[1], *Str(TEXT("SCORE.Team.Red")).ToString())), 26, EnemyRed, ETextJustify::Right));
		AddPadded(Rows, Teams, FMargin(0.f, 8.f, 0.f, 4.f));
	}
	AddPadded(Rows, HeaderRow(WidgetTree), FMargin(0.f, 10.f, 0.f, 4.f));
	if (List.Num() == 0)
	{
		Rows->AddChild(Text(WidgetTree, Str(TEXT("SCORE.State.Empty")), 18, Steel400));
		return;
	}
	const APlayerController* Local = GetOwningPlayer();
	int32 Rank = 1;
	for (const FRow& Row : List)
	{
		const AUCPlayerState* Player = Row.State;
		const bool bLocal = Local != nullptr && Local->PlayerState == Player;
		const FLinearColor Colour = bLocal ? PlayerAmber : White;
		const bool bTeamMode = State->Mode != EUCMatchMode::FreeForAll && Player->GetTeamId() >= 0;
		const FLinearColor TeamColour = !bTeamMode ? Colour : (Player->GetTeamId() == 0 ? TeamBlue : EnemyRed);

		UHorizontalBox* Line = WidgetTree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());
		auto Cell = [&](const FText& Value, const FLinearColor& C, float Weight, ETextJustify::Type J)
		{
			UHorizontalBoxSlot* Slot = Cast<UHorizontalBoxSlot>(Line->AddChild(Text(WidgetTree, Value, 18, C, J)));
			Slot->SetSize(FSlateChildSize(ESlateSizeRule::Fill));
			Slot->SetPadding(FMargin(Weight, 0.f, 0.f, 0.f));
		};
		Cell(FText::AsNumber(Rank++), Muted, 0.6f, ETextJustify::Center);
		// Name only when the player state supplies one; a boss is marked as such.
		FString Name = Player->GetPlayerName();
		if (Player->IsBoss()) { Name = (Name.IsEmpty() ? FString() : Name + TEXT("  ")) + Str(TEXT("SCORE.Label.Boss")).ToString(); }
		Cell(FText::FromString(Name), Colour, 3.f, ETextJustify::Left);
		Cell(bTeamMode ? Str(Player->GetTeamId() == 0 ? TEXT("SCORE.Team.Blue") : TEXT("SCORE.Team.Red")) : FText::GetEmpty(), TeamColour, 1.2f, ETextJustify::Center);
		Cell(FText::AsNumber(Player->GetKills()), Colour, 1.f, ETextJustify::Center);
		Cell(FText::AsNumber(Player->GetDeaths()), Colour, 1.f, ETextJustify::Center);
		Cell(FText::AsNumber(Player->GetMatchScore()), Colour, 1.f, ETextJustify::Center);
		Rows->AddChild(Line);
	}
}
