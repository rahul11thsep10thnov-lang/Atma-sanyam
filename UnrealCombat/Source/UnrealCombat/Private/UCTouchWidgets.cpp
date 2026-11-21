#include "UCTouchWidgets.h"

#include "Blueprint/WidgetTree.h"
#include "Components/Border.h"
#include "Components/CanvasPanel.h"
#include "Components/CanvasPanelSlot.h"
#include "Components/ProgressBar.h"
#include "Components/SizeBox.h"
#include "Components/SizeBoxSlot.h"
#include "Components/TextBlock.h"
#include "Components/Overlay.h"
#include "Components/OverlaySlot.h"
#include "GameFramework/GameStateBase.h"
#include "GameFramework/PlayerController.h"
#include "UCAbilityComponent.h"
#include "UCDefinitions.h"
#include "UCStrings.h"
#include "UCUITheme.h"
#include "UCVehicleHealthComponent.h"
#include "UCVehiclePawn.h"
#include "UCWeaponComponent.h"

#include UE_INLINE_GENERATED_CPP_BY_NAME(UCTouchWidgets)

namespace
{
	constexpr float RefW = 1920.f;
	constexpr float RefH = 1080.f;

	/** A filled circle without any texture: a rounded box whose corners are half the height. */
	void MakeCircleBrush(FSlateBrush& Brush, const FLinearColor& Fill, const FLinearColor& Rim, float RimWidth)
	{
		Brush.DrawAs = ESlateBrushDrawType::RoundedBox;
		Brush.TintColor = FSlateColor(Fill);
		Brush.OutlineSettings.RoundingType = ESlateBrushRoundingType::HalfHeightRadius;
		Brush.OutlineSettings.Color = FSlateColor(Rim);
		Brush.OutlineSettings.Width = RimWidth;
	}

	/**
	 * Place a widget by its 1920x1080 reference rectangle. Right-hand groups anchor to the right edge and
	 * everything anchors to the bottom, so 20:9 screens add space in the middle and controls keep their size.
	 */
	void PlaceBottom(UCanvasPanel* Canvas, UWidget* Widget, bool bAnchorRight, float X, float Y, float W, float H)
	{
		UCanvasPanelSlot* Slot = Canvas->AddChildToCanvas(Widget);
		Slot->SetAnchors(FAnchors(bAnchorRight ? 1.f : 0.f, 1.f));
		Slot->SetAlignment(FVector2D::ZeroVector);
		Slot->SetPosition(FVector2D(bAnchorRight ? X - RefW : X, Y - RefH));
		Slot->SetSize(FVector2D(W, H));
		Slot->SetAutoSize(false);
	}
}

// ---------------------------------------------------------------- UUCTouchButton

TSharedRef<SWidget> UUCTouchButton::RebuildWidget()
{
	if (!bBuilt && WidgetTree != nullptr)
	{
		bBuilt = true;
		USizeBox* Outer = WidgetTree->ConstructWidget<USizeBox>(USizeBox::StaticClass());
		Outer->SetWidthOverride(HitSizeValue);
		Outer->SetHeightOverride(HitSizeValue);
		WidgetTree->RootWidget = Outer;

		USizeBox* FaceBox = WidgetTree->ConstructWidget<USizeBox>(USizeBox::StaticClass());
		FaceBox->SetWidthOverride(FaceSizeValue);
		FaceBox->SetHeightOverride(FaceSizeValue);
		if (USizeBoxSlot* FaceSlot = Cast<USizeBoxSlot>(Outer->AddChild(FaceBox)))
		{
			// The visible face is smaller than the hit rectangle and sits in its centre.
			FaceSlot->SetHorizontalAlignment(HAlign_Center);
			FaceSlot->SetVerticalAlignment(VAlign_Center);
		}

		Face = WidgetTree->ConstructWidget<UBorder>(UBorder::StaticClass());
		FaceBox->AddChild(Face);

		UOverlay* Stack = WidgetTree->ConstructWidget<UOverlay>(UOverlay::StaticClass());
		Face->SetContent(Stack);

		LabelText = WidgetTree->ConstructWidget<UTextBlock>(UTextBlock::StaticClass());
		LabelText->SetText(LabelValue);
		LabelText->SetJustification(ETextJustify::Center);
		LabelText->SetColorAndOpacity(FSlateColor(UCTheme::White));
		{
			FSlateFontInfo Font = LabelText->GetFont();
			Font.Size = 14;
			LabelText->SetFont(Font);
		}
		UOverlaySlot* LabelSlot = Cast<UOverlaySlot>(Stack->AddChild(LabelText));
		LabelSlot->SetHorizontalAlignment(HAlign_Center);
		LabelSlot->SetVerticalAlignment(VAlign_Center);

		CountLabel = WidgetTree->ConstructWidget<UTextBlock>(UTextBlock::StaticClass());
		CountLabel->SetVisibility(ESlateVisibility::Collapsed);
		CountLabel->SetColorAndOpacity(FSlateColor(UCTheme::White));
		UOverlaySlot* CountSlot = Cast<UOverlaySlot>(Stack->AddChild(CountLabel));
		CountSlot->SetHorizontalAlignment(HAlign_Right);
		CountSlot->SetVerticalAlignment(VAlign_Top);

		ReadyMark = WidgetTree->ConstructWidget<UTextBlock>(UTextBlock::StaticClass());
		ReadyMark->SetText(UCStrings::Get(TEXT("HUD.Ability.Ready")));
		ReadyMark->SetVisibility(ESlateVisibility::Collapsed);
		ReadyMark->SetColorAndOpacity(FSlateColor(UCTheme::HealthyGreen));
		{
			FSlateFontInfo Font = ReadyMark->GetFont();
			Font.Size = 10;
			ReadyMark->SetFont(Font);
		}
		UOverlaySlot* ReadySlot = Cast<UOverlaySlot>(Stack->AddChild(ReadyMark));
		ReadySlot->SetHorizontalAlignment(HAlign_Center);
		ReadySlot->SetVerticalAlignment(VAlign_Top);

		ProgressBar = WidgetTree->ConstructWidget<UProgressBar>(UProgressBar::StaticClass());
		ProgressBar->SetVisibility(ESlateVisibility::Collapsed);
		ProgressBar->SetFillColorAndOpacity(UCTheme::ActionOrange);
		UOverlaySlot* BarSlot = Cast<UOverlaySlot>(Stack->AddChild(ProgressBar));
		BarSlot->SetHorizontalAlignment(HAlign_Fill);
		BarSlot->SetVerticalAlignment(VAlign_Bottom);

		RefreshVisual();
	}
	return Super::RebuildWidget();
}

void UUCTouchButton::Configure(const FText& Label, float HitSize, float FaceSize)
{
	LabelValue = Label;
	HitSizeValue = HitSize;
	FaceSizeValue = FaceSize;
}

void UUCTouchButton::RefreshVisual()
{
	if (Face == nullptr)
	{
		return;
	}
	// Spec 2.3: idle 18% base, pressed 45% with a bright rim. Unavailable is muted and desaturated.
	const float Opacity = bIsUnavailable ? 0.10f : (bIsPressed ? 0.45f : 0.18f);
	FLinearColor Rim = bIsPressed ? UCTheme::ActionOrange : (bIsActive ? UCTheme::ShieldCyan : UCTheme::Steel400);
	if (bIsUnavailable)
	{
		Rim = UCTheme::Steel700;
	}
	FSlateBrush Brush;
	MakeCircleBrush(Brush, FLinearColor(UCTheme::Graphite950.R, UCTheme::Graphite950.G, UCTheme::Graphite950.B, Opacity + 0.35f), Rim, bIsActive || bIsPressed ? 4.f : 2.f);
	Face->SetBrush(Brush);
	Face->SetRenderScale(bIsPressed ? FVector2D(0.96, 0.96) : FVector2D::UnitVector);
	LabelText->SetColorAndOpacity(FSlateColor(bIsUnavailable ? UCTheme::Steel400 : UCTheme::White));
	LabelText->SetOpacity(bIsUnavailable ? 0.6f : 1.f);
	ReadyMark->SetVisibility(bIsReady && !bIsActive && !bIsUnavailable ? ESlateVisibility::HitTestInvisible : ESlateVisibility::Collapsed);
}

void UUCTouchButton::SetUnavailable(bool bUnavailable) { if (bIsUnavailable != bUnavailable) { bIsUnavailable = bUnavailable; RefreshVisual(); } }
void UUCTouchButton::SetActive(bool bActive) { if (bIsActive != bActive) { bIsActive = bActive; RefreshVisual(); } }
void UUCTouchButton::SetReady(bool bReady) { if (bIsReady != bReady) { bIsReady = bReady; RefreshVisual(); } }

void UUCTouchButton::SetProgress(float Progress01)
{
	if (ProgressBar == nullptr)
	{
		return;
	}
	ProgressBar->SetVisibility(Progress01 < 0.f ? ESlateVisibility::Collapsed : ESlateVisibility::HitTestInvisible);
	ProgressBar->SetPercent(FMath::Clamp(Progress01, 0.f, 1.f));
}

void UUCTouchButton::SetCountText(const FText& Text)
{
	if (CountLabel != nullptr)
	{
		CountLabel->SetText(Text);
		CountLabel->SetVisibility(Text.IsEmpty() ? ESlateVisibility::Collapsed : ESlateVisibility::HitTestInvisible);
	}
}

void UUCTouchButton::SetPressed(bool bPressed)
{
	if (bIsPressed == bPressed)
	{
		return;
	}
	bIsPressed = bPressed;
	RefreshVisual();
	// Dispatch immediately; visuals never delay the input event (spec 1.4).
	OnHeldChanged.ExecuteIfBound(bPressed);
}

void UUCTouchButton::ForceRelease()
{
	PointerIndex = INDEX_NONE;
	SetPressed(false);
}

void UUCTouchButton::NativeDestruct()
{
	ForceRelease();
	Super::NativeDestruct();
}

FReply UUCTouchButton::NativeOnTouchStarted(const FGeometry& InGeometry, const FPointerEvent& InGestureEvent)
{
	if (PointerIndex != INDEX_NONE)
	{
		return FReply::Unhandled();
	}
	PointerIndex = InGestureEvent.GetPointerIndex();
	SetPressed(true);
	return FReply::Handled().CaptureMouse(GetCachedWidget().ToSharedRef());
}

FReply UUCTouchButton::NativeOnTouchMoved(const FGeometry& InGeometry, const FPointerEvent& InGestureEvent)
{
	return InGestureEvent.GetPointerIndex() == PointerIndex ? FReply::Handled() : FReply::Unhandled();
}

FReply UUCTouchButton::NativeOnTouchEnded(const FGeometry& InGeometry, const FPointerEvent& InGestureEvent)
{
	if (InGestureEvent.GetPointerIndex() != PointerIndex)
	{
		return FReply::Unhandled();
	}
	ForceRelease();
	return FReply::Handled().ReleaseMouseCapture();
}

void UUCTouchButton::NativeOnMouseCaptureLost(const FCaptureLostEvent& CaptureLostEvent)
{
	ForceRelease(); // cancelled touch / focus loss must never leave an input held
}

// ---------------------------------------------------------------- UUCTouchStick

namespace
{
	constexpr float StickReleaseDuration = 0.09f; // spec: 90 ms
	constexpr float StickDeadZone = 0.08f;
}

void UUCTouchStick::Configure(const FVector2D& RegionSize, float BaseDiameter, float KnobDiameter)
{
	Region = RegionSize;
	BaseDiameterValue = BaseDiameter;
	KnobDiameterValue = KnobDiameter;
}

TSharedRef<SWidget> UUCTouchStick::RebuildWidget()
{
	if (!bBuilt && WidgetTree != nullptr)
	{
		bBuilt = true;
		USizeBox* Outer = WidgetTree->ConstructWidget<USizeBox>(USizeBox::StaticClass());
		Outer->SetWidthOverride(Region.X);
		Outer->SetHeightOverride(Region.Y);
		WidgetTree->RootWidget = Outer;

		Canvas = WidgetTree->ConstructWidget<UCanvasPanel>(UCanvasPanel::StaticClass());
		Outer->AddChild(Canvas);

		Base = WidgetTree->ConstructWidget<UBorder>(UBorder::StaticClass());
		Base->SetVisibility(ESlateVisibility::HitTestInvisible);
		UCanvasPanelSlot* BaseSlot = Canvas->AddChildToCanvas(Base);
		BaseSlot->SetAlignment(FVector2D(0.5, 0.5));
		BaseSlot->SetPosition(Region * 0.5);
		BaseSlot->SetSize(FVector2D(BaseDiameterValue, BaseDiameterValue));
		BaseSlot->SetAutoSize(false);

		Knob = WidgetTree->ConstructWidget<UBorder>(UBorder::StaticClass());
		Knob->SetVisibility(ESlateVisibility::HitTestInvisible);
		UCanvasPanelSlot* KnobSlot = Canvas->AddChildToCanvas(Knob);
		KnobSlot->SetAlignment(FVector2D(0.5, 0.5));
		KnobSlot->SetPosition(Region * 0.5);
		KnobSlot->SetSize(FVector2D(KnobDiameterValue, KnobDiameterValue));
		KnobSlot->SetAutoSize(false);

		RefreshVisual();
	}
	return Super::RebuildWidget();
}

void UUCTouchStick::RefreshVisual()
{
	if (Base == nullptr || Knob == nullptr)
	{
		return;
	}
	const bool bPressed = PointerIndex != INDEX_NONE;
	FSlateBrush BaseBrush;
	MakeCircleBrush(BaseBrush, FLinearColor(UCTheme::Graphite950.R, UCTheme::Graphite950.G, UCTheme::Graphite950.B, bPressed ? 0.45f : 0.18f), bPressed ? UCTheme::PlayerAmber : UCTheme::Steel400, bPressed ? 4.f : 2.f);
	Base->SetBrush(BaseBrush);
	FSlateBrush KnobBrush;
	MakeCircleBrush(KnobBrush, FLinearColor(UCTheme::White.R, UCTheme::White.G, UCTheme::White.B, bPressed ? 0.55f : 0.12f), bPressed ? UCTheme::PlayerAmber : UCTheme::Steel400, 2.f);
	Knob->SetBrush(KnobBrush);

	// Knob travels inside the base ring; the radius keeps the knob fully within the base.
	const float MaxTravel = (BaseDiameterValue - KnobDiameterValue) * 0.5f;
	if (UCanvasPanelSlot* KnobSlot = Cast<UCanvasPanelSlot>(Knob->Slot))
	{
		KnobSlot->SetPosition(Region * 0.5 + FVector2D(Value.X, -Value.Y) * MaxTravel);
	}
}

void UUCTouchStick::Apply(const FVector2D& Normalised)
{
	Value = Normalised;
	RefreshVisual();
	if (!Value.Equals(LastSent, 0.001))
	{
		LastSent = Value;
		OnStickChanged.ExecuteIfBound(static_cast<float>(Value.X), static_cast<float>(Value.Y));
	}
}

void UUCTouchStick::UpdateFromTouch(const FGeometry& Geometry, const FPointerEvent& Event)
{
	const FVector2D Local = Geometry.AbsoluteToLocal(Event.GetScreenSpacePosition());
	const float MaxTravel = (BaseDiameterValue - KnobDiameterValue) * 0.5f;
	FVector2D Offset = (Local - Region * 0.5) / MaxTravel;   // y grows downward on screen
	const double Length = Offset.Size();
	if (Length > 1.0)
	{
		Offset /= Length;
	}
	if (Length < StickDeadZone)
	{
		Offset = FVector2D::ZeroVector;
	}
	Apply(FVector2D(Offset.X, -Offset.Y));                    // up = forward throttle
}

FReply UUCTouchStick::NativeOnTouchStarted(const FGeometry& InGeometry, const FPointerEvent& InGestureEvent)
{
	if (PointerIndex != INDEX_NONE)
	{
		return FReply::Unhandled();
	}
	PointerIndex = InGestureEvent.GetPointerIndex();
	ReleaseTime = StickReleaseDuration;
	UpdateFromTouch(InGeometry, InGestureEvent);
	return FReply::Handled().CaptureMouse(GetCachedWidget().ToSharedRef());
}

FReply UUCTouchStick::NativeOnTouchMoved(const FGeometry& InGeometry, const FPointerEvent& InGestureEvent)
{
	if (InGestureEvent.GetPointerIndex() != PointerIndex)
	{
		return FReply::Unhandled();
	}
	UpdateFromTouch(InGeometry, InGestureEvent);
	return FReply::Handled();
}

void UUCTouchStick::Release()
{
	if (PointerIndex == INDEX_NONE && ReleaseTime >= StickReleaseDuration)
	{
		return;
	}
	PointerIndex = INDEX_NONE;
	ReleaseFrom = Value;
	ReleaseTime = 0.f;
	RefreshVisual();
}

FReply UUCTouchStick::NativeOnTouchEnded(const FGeometry& InGeometry, const FPointerEvent& InGestureEvent)
{
	if (InGestureEvent.GetPointerIndex() != PointerIndex)
	{
		return FReply::Unhandled();
	}
	Release();
	return FReply::Handled().ReleaseMouseCapture();
}

void UUCTouchStick::NativeOnMouseCaptureLost(const FCaptureLostEvent& CaptureLostEvent)
{
	ForceNeutral();
}

void UUCTouchStick::NativeDestruct()
{
	ForceNeutral();
	Super::NativeDestruct();
}

void UUCTouchStick::ForceNeutral()
{
	PointerIndex = INDEX_NONE;
	ReleaseTime = StickReleaseDuration;
	Apply(FVector2D::ZeroVector);
}

void UUCTouchStick::NativeTick(const FGeometry& MyGeometry, float InDeltaTime)
{
	Super::NativeTick(MyGeometry, InDeltaTime);
	if (PointerIndex == INDEX_NONE && ReleaseTime < StickReleaseDuration)
	{
		// Ease-out return to neutral over 90 ms. The value, not just the picture, eases back.
		ReleaseTime = FMath::Min(ReleaseTime + InDeltaTime, StickReleaseDuration);
		const float Alpha = 1.f - FMath::Square(1.f - ReleaseTime / StickReleaseDuration);
		Apply(FMath::Lerp(ReleaseFrom, FVector2D::ZeroVector, Alpha));
	}
}

// ---------------------------------------------------------------- UUCTouchControlsWidget

TSharedRef<SWidget> UUCTouchControlsWidget::RebuildWidget()
{
	if (!bBuilt && WidgetTree != nullptr)
	{
		bBuilt = true;
		Root = WidgetTree->ConstructWidget<UCanvasPanel>(UCanvasPanel::StaticClass());
		WidgetTree->RootWidget = Root;

		// Left driving pad. Active region X 80-440 (spec 80-460, trimmed 20 px so it does not overlap the
		// handbrake target at X 440 - recorded as a spec mismatch). Base centre stays at (270, 825).
		Stick = CreateWidget<UUCTouchStick>(this);
		Stick->Configure(FVector2D(360.0, 380.0), 300.f, 112.f);
		PlaceBottom(Root, Stick, false, 80.f, 635.f, 360.f, 380.f);

		// Handbrake: X 440, Y 870, 116x116 target, 96 visible.
		Handbrake = CreateWidget<UUCTouchButton>(this);
		Handbrake->Configure(UCStrings::Get(TEXT("TOUCH.Handbrake")), 116.f, 96.f);
		PlaceBottom(Root, Handbrake, false, 440.f, 870.f, 116.f, 116.f);

		// Right cluster. Positions in the spec are top-left corners of the hit rectangle.
		FirePrimary = CreateWidget<UUCTouchButton>(this);
		FirePrimary->Configure(UCStrings::Get(TEXT("TOUCH.FirePrimary")), 184.f, 160.f);
		PlaceBottom(Root, FirePrimary, true, 1600.f, 790.f, 184.f, 184.f);

		FireSecondary = CreateWidget<UUCTouchButton>(this);
		FireSecondary->Configure(UCStrings::Get(TEXT("TOUCH.FireSecondary")), 144.f, 124.f);
		PlaceBottom(Root, FireSecondary, true, 1390.f, 900.f, 144.f, 144.f);

		Reload = CreateWidget<UUCTouchButton>(this);
		Reload->Configure(UCStrings::Get(TEXT("TOUCH.Reload")), 112.f, 96.f);
		PlaceBottom(Root, Reload, true, 1430.f, 650.f, 112.f, 112.f);
	}
	return Super::RebuildWidget();
}

void UUCTouchControlsWidget::BindPawn(AUCVehiclePawn* Pawn)
{
	NeutraliseAll();
	BoundPawn = Pawn;
	BuiltAbilityCount = -1;
	if (Pawn == nullptr)
	{
		return;
	}
	TWeakObjectPtr<AUCVehiclePawn> Weak(Pawn);
	Stick->OnStickChanged.BindLambda([Weak](float Steer, float Throttle)
	{
		if (AUCVehiclePawn* P = Weak.Get()) { P->SetPlayerSteering(Steer); P->SetPlayerThrottle(Throttle); }
	});
	Handbrake->OnHeldChanged.BindLambda([Weak](bool bHeld) { if (AUCVehiclePawn* P = Weak.Get()) { P->SetPlayerHandbrake(bHeld); } });
	FirePrimary->OnHeldChanged.BindLambda([Weak](bool bHeld) { if (AUCVehiclePawn* P = Weak.Get()) { P->SetPlayerFire(true, bHeld); } });
	FireSecondary->OnHeldChanged.BindLambda([Weak](bool bHeld) { if (AUCVehiclePawn* P = Weak.Get()) { P->SetPlayerFire(false, bHeld); } });
	// Reload is a tap: act on press only.
	Reload->OnHeldChanged.BindLambda([Weak](bool bHeld) { if (bHeld) { if (AUCVehiclePawn* P = Weak.Get()) { P->PlayerReload(); } } });
}

void UUCTouchControlsWidget::NeutraliseAll()
{
	// Release callbacks run while the old pawn is still bound, so nothing is left held on it.
	if (Stick) { Stick->ForceNeutral(); }
	if (Handbrake) { Handbrake->ForceRelease(); }
	if (FirePrimary) { FirePrimary->ForceRelease(); }
	if (FireSecondary) { FireSecondary->ForceRelease(); }
	if (Reload) { Reload->ForceRelease(); }
	for (UUCTouchButton* Button : AbilityButtons) { if (Button) { Button->ForceRelease(); } }
}

void UUCTouchControlsWidget::NativeDestruct()
{
	NeutraliseAll();
	Super::NativeDestruct();
}

void UUCTouchControlsWidget::RebuildAbilityButtons(AUCVehiclePawn* Pawn)
{
	for (UUCTouchButton* Button : AbilityButtons)
	{
		if (Button) { Button->RemoveFromParent(); }
	}
	AbilityButtons.Reset();

	const TArray<FUCAbilityDefinition>& Definitions = Pawn->Abilities->GetAbilityDefinitions();
	const int32 Count = Definitions.Num();
	BuiltAbilityCount = Count;

	// Spec 2.3 F: centres for four abilities. Fewer abilities are spread evenly along the same cluster path.
	static const FVector2D Centres[4] = { FVector2D(1510.0, 500.0), FVector2D(1630.0, 600.0), FVector2D(1760.0, 480.0), FVector2D(1800.0, 640.0) };
	for (int32 Slot = 0; Slot < Count && Slot < 4; ++Slot)
	{
		FVector2D Centre = Centres[Slot];
		if (Count < 4)
		{
			const float T = Count == 1 ? 1.f : static_cast<float>(Slot) * 3.f / static_cast<float>(Count - 1);
			const int32 A = FMath::Clamp(FMath::FloorToInt(T), 0, 3);
			const int32 B = FMath::Min(A + 1, 3);
			Centre = FMath::Lerp(Centres[A], Centres[B], T - static_cast<float>(A));
		}
		UUCTouchButton* Button = CreateWidget<UUCTouchButton>(this);
		const FUCAbilityDefinition& Definition = Definitions[Slot];
		FText Label = Definition.DisplayName;
		if (Label.IsEmpty())
		{
			switch (Definition.Effect)
			{
			case EUCAbilityEffect::RepairKit: Label = UCStrings::Get(TEXT("HUD.Ability.Repair")); break;
			case EUCAbilityEffect::Boost: Label = UCStrings::Get(TEXT("HUD.Ability.Boost")); break;
			case EUCAbilityEffect::ShieldRecharge: Label = UCStrings::Get(TEXT("HUD.Ability.ShieldRecharge")); break;
			case EUCAbilityEffect::Extinguisher: Label = UCStrings::Get(TEXT("HUD.Ability.Extinguisher")); break;
			}
		}
		Button->Configure(Label, 104.f, 92.f);
		TWeakObjectPtr<AUCVehiclePawn> Weak(Pawn);
		Button->OnHeldChanged.BindLambda([Weak, Slot](bool bHeld)
		{
			// Tap: activate on press, no hold-to-repeat.
			if (bHeld) { if (AUCVehiclePawn* P = Weak.Get()) { P->PlayerActivateAbility(Slot); } }
		});
		PlaceBottom(Root, Button, true, static_cast<float>(Centre.X) - 52.f, static_cast<float>(Centre.Y) - 52.f, 104.f, 104.f);
		AbilityButtons.Add(Button);
	}
}

void UUCTouchControlsWidget::RefreshStates(AUCVehiclePawn* Pawn)
{
	// Visual-only availability, derived from replicated state. Input is always still delivered.
	const FUCWeaponState& Primary = Pawn->PrimaryWeapon->GetWeaponState();
	const FUCWeaponState& Secondary = Pawn->SecondaryWeapon->GetWeaponState();
	FirePrimary->SetUnavailable(!Pawn->PrimaryWeapon->HasWeapon() || !Primary.bOnline);
	FireSecondary->SetUnavailable(!Pawn->SecondaryWeapon->HasWeapon() || !Secondary.bOnline);
	Reload->SetUnavailable(Primary.bReloading && Secondary.bReloading);
	Handbrake->SetUnavailable(Pawn->IsWrecked());

	const TArray<FUCAbilityState>& States = Pawn->Abilities->GetAbilityStates();
	const AGameStateBase* GameState = GetWorld() != nullptr ? GetWorld()->GetGameState() : nullptr;
	const float Now = GameState != nullptr ? static_cast<float>(GameState->GetServerWorldTimeSeconds()) : 0.f;
	for (int32 Slot = 0; Slot < AbilityButtons.Num() && Slot < States.Num(); ++Slot)
	{
		UUCTouchButton* Button = AbilityButtons[Slot];
		const FUCAbilityState& State = States[Slot];
		const float Wait = FMath::Max(State.ReadyTime - Now, 0.f);
		const bool bNoCharges = State.ChargesRemaining == 0;
		Button->SetActive(State.bActive);
		Button->SetReady(!State.bActive && Wait <= 0.f && !bNoCharges);
		Button->SetUnavailable(Pawn->IsWrecked() || bNoCharges);
		// Cooldown progress needs the full cooldown length (added to ability state for this purpose).
		Button->SetProgress(!State.bActive && Wait > 0.f && State.CooldownDuration > 0.f ? 1.f - Wait / State.CooldownDuration : -1.f);
		Button->SetCountText(State.ChargesRemaining >= 0 ? FText::AsNumber(State.ChargesRemaining) : FText::GetEmpty());
	}
}

void UUCTouchControlsWidget::NativeTick(const FGeometry& MyGeometry, float InDeltaTime)
{
	Super::NativeTick(MyGeometry, InDeltaTime);
	AUCVehiclePawn* Pawn = GetOwningPlayerPawn<AUCVehiclePawn>();
	if (Pawn != BoundPawn.Get())
	{
		BindPawn(Pawn);
	}
	if (Pawn == nullptr || Pawn->Abilities == nullptr)
	{
		return;
	}
	if (Pawn->Abilities->GetAbilityDefinitions().Num() != BuiltAbilityCount)
	{
		RebuildAbilityButtons(Pawn);
	}
	RefreshStates(Pawn);
}
