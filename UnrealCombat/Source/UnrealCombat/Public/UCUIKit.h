#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "Blueprint/WidgetTree.h"
#include "Components/Border.h"
#include "Components/Button.h"
#include "Components/CanvasPanel.h"
#include "Components/CanvasPanelSlot.h"
#include "Components/HorizontalBox.h"
#include "Components/HorizontalBoxSlot.h"
#include "Components/ProgressBar.h"
#include "Components/SizeBox.h"
#include "Components/TextBlock.h"
#include "Components/VerticalBox.h"
#include "Components/VerticalBoxSlot.h"
#include "UCUITheme.h"
#include "UCUIKit.generated.h"

/** Carries a click callback for a UButton (dynamic delegates need a UObject with a UFUNCTION). */
UCLASS()
class UNREALCOMBAT_API UUCClickProxy : public UObject
{
	GENERATED_BODY()

public:
	TFunction<void()> Callback;

	UFUNCTION()
	void HandleClick()
	{
		if (Callback)
		{
			Callback();
		}
	}
};

/** Small builders shared by the front-end screens and the scoreboard. Colours come from the design tokens. */
namespace UCUI
{
	using namespace UCTheme;

	inline FSlateBrush Brush(const FLinearColor& Fill, const FLinearColor& Rim, float RimWidth = 2.f, float Radius = 4.f)
	{
		FSlateBrush Result;
		Result.DrawAs = ESlateBrushDrawType::RoundedBox;
		Result.TintColor = FSlateColor(Fill);
		Result.OutlineSettings.RoundingType = ESlateBrushRoundingType::FixedRadius;
		Result.OutlineSettings.CornerRadii = FVector4(Radius, Radius, Radius, Radius);
		Result.OutlineSettings.Color = FSlateColor(Rim);
		Result.OutlineSettings.Width = RimWidth;
		return Result;
	}

	inline FLinearColor Alpha(const FLinearColor& Colour, float A) { return FLinearColor(Colour.R, Colour.G, Colour.B, A); }

	inline UTextBlock* Text(UWidgetTree* Tree, const FText& Value, int32 Size, const FLinearColor& Colour, ETextJustify::Type Justify = ETextJustify::Left)
	{
		UTextBlock* Block = Tree->ConstructWidget<UTextBlock>(UTextBlock::StaticClass());
		Block->SetText(Value);
		Block->SetColorAndOpacity(FSlateColor(Colour));
		Block->SetJustification(Justify);
		FSlateFontInfo Font = Block->GetFont();
		Font.Size = Size;
		Block->SetFont(Font);
		Block->SetVisibility(ESlateVisibility::HitTestInvisible);
		return Block;
	}

	inline UProgressBar* Bar(UWidgetTree* Tree, float Percent, const FLinearColor& Fill)
	{
		UProgressBar* Result = Tree->ConstructWidget<UProgressBar>(UProgressBar::StaticClass());
		Result->SetFillColorAndOpacity(Fill);
		Result->WidgetStyle.BackgroundImage.TintColor = FSlateColor(Steel700);
		Result->SetPercent(Percent);
		Result->SetVisibility(ESlateVisibility::HitTestInvisible);
		return Result;
	}

	/** Graphite command panel. Pass Interactive = false for read-only overlays. */
	inline UBorder* Panel(UWidgetTree* Tree, const FLinearColor& Rim = Steel700, bool bInteractive = true, const FMargin& Padding = FMargin(16.f, 12.f))
	{
		UBorder* Result = Tree->ConstructWidget<UBorder>(UBorder::StaticClass());
		Result->SetBrush(Brush(Alpha(Graphite900, 0.92f), Rim));
		Result->SetPadding(Padding);
		Result->SetVisibility(bInteractive ? ESlateVisibility::SelfHitTestInvisible : ESlateVisibility::HitTestInvisible);
		return Result;
	}

	enum class EButtonKind : uint8 { Primary, Secondary, Selected, Destructive };

	/** Button with a text label. Input is dispatched on release inside the button; disabled buttons do nothing. */
	inline UButton* Button(UUserWidget* Owner, UWidgetTree* Tree, const FText& Label, TFunction<void()> OnClick, EButtonKind Kind = EButtonKind::Secondary, bool bEnabled = true, int32 FontSize = 18)
	{
		FLinearColor Fill = Graphite800, Rim = Steel700, Hover = Steel700, TextColour = White;
		switch (Kind)
		{
		case EButtonKind::Primary: Fill = ActionOrange; Rim = PlayerAmber; Hover = PlayerAmber; TextColour = Graphite950; break;
		case EButtonKind::Selected: Fill = Alpha(PlayerAmber, 0.18f); Rim = PlayerAmber; Hover = Alpha(PlayerAmber, 0.3f); break;
		case EButtonKind::Destructive: Fill = DestroyedRed; Rim = EnemyRed; Hover = EnemyRed; break;
		default: break;
		}
		FButtonStyle Style;
		Style.Normal = Brush(Fill, Rim);
		Style.Hovered = Brush(Hover, Rim);
		Style.Pressed = Brush(Alpha(ActionOrange, 0.9f), PlayerAmber);
		Style.Disabled = Brush(Alpha(Graphite800, 0.6f), Steel700);
		Style.NormalPadding = FMargin(14.f, 8.f);
		Style.PressedPadding = FMargin(14.f, 9.f, 14.f, 7.f); // 1 px press nudge; input is not delayed

		UButton* Result = Tree->ConstructWidget<UButton>(UButton::StaticClass());
		Result->SetStyle(Style);
		UTextBlock* Caption = Text(Tree, Label, FontSize, bEnabled ? TextColour : Steel400, ETextJustify::Center);
		Result->AddChild(Caption);
		UUCClickProxy* Proxy = NewObject<UUCClickProxy>(Owner);
		Proxy->Callback = MoveTemp(OnClick);
		Result->OnClicked.AddDynamic(Proxy, &UUCClickProxy::HandleClick);
		Result->SetIsEnabled(bEnabled);
		return Result;
	}

	inline USizeBox* Sized(UWidgetTree* Tree, UWidget* Child, float Width, float Height)
	{
		USizeBox* Box = Tree->ConstructWidget<USizeBox>(USizeBox::StaticClass());
		if (Width > 0.f) { Box->SetWidthOverride(Width); }
		if (Height > 0.f) { Box->SetHeightOverride(Height); }
		Box->AddChild(Child);
		return Box;
	}

	/** Full-bleed child inside a canvas, with pixel margins from each edge. */
	inline void Fill(UCanvasPanel* Canvas, UWidget* Child, float Left = 0.f, float Top = 0.f, float Right = 0.f, float Bottom = 0.f)
	{
		UCanvasPanelSlot* Slot = Canvas->AddChildToCanvas(Child);
		Slot->SetAnchors(FAnchors(0.f, 0.f, 1.f, 1.f));
		Slot->SetOffsets(FMargin(Left, Top, Right, Bottom));
	}

	template <typename SlotType, typename ParentType>
	inline SlotType* Add(ParentType* Parent, UWidget* Child)
	{
		return Cast<SlotType>(Parent->AddChild(Child));
	}

	inline void AddFill(UHorizontalBox* Box, UWidget* Child, const FMargin& Padding = FMargin(0.f))
	{
		UHorizontalBoxSlot* Slot = Cast<UHorizontalBoxSlot>(Box->AddChild(Child));
		Slot->SetSize(FSlateChildSize(ESlateSizeRule::Fill));
		Slot->SetPadding(Padding);
	}

	inline void AddPadded(UVerticalBox* Box, UWidget* Child, const FMargin& Padding)
	{
		Cast<UVerticalBoxSlot>(Box->AddChild(Child))->SetPadding(Padding);
	}
}
