#include "UCHUDWidget.h"

#include "Blueprint/WidgetTree.h"
#include "Components/Border.h"
#include "Components/BorderSlot.h"
#include "Components/CanvasPanel.h"
#include "Components/CanvasPanelSlot.h"
#include "Components/HorizontalBox.h"
#include "Components/HorizontalBoxSlot.h"
#include "Components/ProgressBar.h"
#include "Components/SafeZone.h"
#include "Components/SafeZoneSlot.h"
#include "Components/SizeBox.h"
#include "Components/TextBlock.h"
#include "Components/VerticalBox.h"
#include "Components/VerticalBoxSlot.h"
#include "GameFramework/GameStateBase.h"
#include "GameFramework/PlayerController.h"
#include "UCAbilityComponent.h"
#include "UCDefinitions.h"
#include "UCGameFramework.h"
#include "UCStrings.h"
#include "UCVehicleHealthComponent.h"
#include "UCVehiclePawn.h"
#include "UCWeaponComponent.h"

#include UE_INLINE_GENERATED_CPP_BY_NAME(UCHUDWidget)

using namespace UCTheme;

namespace
{
	constexpr float RefW = 1920.f;
	constexpr float SlowInterval = 0.1f;          // 10 Hz for speed, reload, cooldown and boss values
	constexpr float WarnAt = 0.5f;                // spec 3.10, display only
	constexpr float CritAt = 0.25f;
	constexpr float ShieldWarnAt = 0.25f;
	constexpr float ShieldCritAt = 0.10f;
	constexpr float AmmoWarnAt = 0.25f;
	constexpr float AmmoCritAt = 0.10f;
	constexpr float TimeWarnAt = 0.25f;
	constexpr float TimeCritAt = 0.10f;
	constexpr float LeftColumnLimit = 500.f;      // protected touch zone starts at Y 500

	const FLinearColor PanelFill = FLinearColor(Graphite900.R, Graphite900.G, Graphite900.B, 0.92f);

	FSlateBrush PanelBrush(const FLinearColor& Fill = PanelFill, const FLinearColor& Rim = Steel700)
	{
		FSlateBrush Brush;
		Brush.DrawAs = ESlateBrushDrawType::RoundedBox;
		Brush.TintColor = FSlateColor(Fill);
		Brush.OutlineSettings.RoundingType = ESlateBrushRoundingType::FixedRadius;
		Brush.OutlineSettings.CornerRadii = FVector4(4.0, 4.0, 4.0, 4.0);
		Brush.OutlineSettings.Color = FSlateColor(Rim);
		Brush.OutlineSettings.Width = 2.f;
		return Brush;
	}

	UTextBlock* MakeText(UWidgetTree* Tree, const FText& Text, int32 Size, const FLinearColor& Color, ETextJustify::Type Justify = ETextJustify::Left)
	{
		UTextBlock* Block = Tree->ConstructWidget<UTextBlock>(UTextBlock::StaticClass());
		Block->SetText(Text);
		Block->SetColorAndOpacity(FSlateColor(Color));
		Block->SetJustification(Justify);
		FSlateFontInfo Font = Block->GetFont();
		Font.Size = Size;
		Block->SetFont(Font);
		Block->SetVisibility(ESlateVisibility::HitTestInvisible);
		return Block;
	}

	UProgressBar* MakeBar(UWidgetTree* Tree, const FLinearColor& Fill, const FLinearColor& Track = Steel700)
	{
		UProgressBar* Bar = Tree->ConstructWidget<UProgressBar>(UProgressBar::StaticClass());
		Bar->SetFillColorAndOpacity(Fill);
		Bar->WidgetStyle.BackgroundImage.TintColor = FSlateColor(Track);
		Bar->SetVisibility(ESlateVisibility::HitTestInvisible);
		return Bar;
	}

	UBorder* MakePanel(UWidgetTree* Tree, const FLinearColor& Rim = Steel700)
	{
		UBorder* Panel = Tree->ConstructWidget<UBorder>(UBorder::StaticClass());
		Panel->SetBrush(PanelBrush(PanelFill, Rim));
		Panel->SetPadding(FMargin(14.f, 10.f));
		Panel->SetVisibility(ESlateVisibility::HitTestInvisible); // HUD is read-only: never takes touches
		return Panel;
	}

	/** Place by 1920x1080 reference. Top-left, top-centre or top-right anchored. */
	enum class EAnchorX : uint8 { Left, Centre, Right };
	UCanvasPanelSlot* PlaceTop(UCanvasPanel* Canvas, UWidget* Widget, EAnchorX Anchor, float X, float Y, float W, float H)
	{
		UCanvasPanelSlot* Slot = Canvas->AddChildToCanvas(Widget);
		const float AnchorValue = Anchor == EAnchorX::Left ? 0.f : (Anchor == EAnchorX::Centre ? 0.5f : 1.f);
		const float Origin = Anchor == EAnchorX::Left ? 0.f : (Anchor == EAnchorX::Centre ? RefW * 0.5f : RefW);
		Slot->SetAnchors(FAnchors(AnchorValue, 0.f));
		Slot->SetAlignment(FVector2D::ZeroVector);
		Slot->SetPosition(FVector2D(X - Origin, Y));
		if (W > 0.f)
		{
			Slot->SetSize(FVector2D(W, H));
			Slot->SetAutoSize(H <= 0.f);
		}
		else
		{
			Slot->SetAutoSize(true);
		}
		return Slot;
	}

	FText Percent(float Fraction)
	{
		// Whole percentages, rounded to nearest; the severity state is decided separately and never rounds up.
		return FText::FromString(FString::Printf(TEXT("%d%%"), FMath::RoundToInt(FMath::Clamp(Fraction, 0.f, 1.f) * 100.f)));
	}

	const TCHAR* ComponentKey(int32 Index)
	{
		static const TCHAR* Keys[9] = {
			TEXT("HUD.Vehicle.Chassis"), TEXT("HUD.Vehicle.Engine"), TEXT("HUD.Vehicle.FuelTank"),
			TEXT("HUD.Vehicle.WheelFrontLeft"), TEXT("HUD.Vehicle.WheelFrontRight"),
			TEXT("HUD.Vehicle.WheelRearLeft"), TEXT("HUD.Vehicle.WheelRearRight"),
			TEXT("HUD.Vehicle.WeaponMountLeft"), TEXT("HUD.Vehicle.WeaponMountRight") };
		return Keys[Index];
	}

	const TCHAR* ArmourKey(int32 Index)
	{
		static const TCHAR* Keys[6] = {
			TEXT("HUD.Armour.Front"), TEXT("HUD.Armour.Rear"), TEXT("HUD.Armour.Left"),
			TEXT("HUD.Armour.Right"), TEXT("HUD.Armour.Top"), TEXT("HUD.Armour.Bottom") };
		return Keys[Index];
	}

	FText FormatClock(int32 Seconds)
	{
		Seconds = FMath::Max(Seconds, 0);
		return FText::FromString(FString::Printf(TEXT("%02d:%02d"), Seconds / 60, Seconds % 60));
	}
}

// ---------------------------------------------------------------- construction

TSharedRef<SWidget> UUCHUDWidget::RebuildWidget()
{
	if (!bBuilt && WidgetTree != nullptr)
	{
		bBuilt = true;
		USafeZone* Safe = WidgetTree->ConstructWidget<USafeZone>(USafeZone::StaticClass());
		WidgetTree->RootWidget = Safe;
		Root = WidgetTree->ConstructWidget<UCanvasPanel>(UCanvasPanel::StaticClass());
		Safe->AddChild(Root);

		// Left column flows: vehicle panel, speed strip, player stats. At rest they sit at the Y positions
		// of the spec (28 / 220 / 330); when the vehicle panel grows the others move down with it.
		UVerticalBox* LeftColumn = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
		PlaceTop(Root, LeftColumn, EAnchorX::Left, 32.f, 28.f, 0.f, 0.f);
		BuildVehiclePanel(Root, LeftColumn);
		BuildSpeedStrip(LeftColumn);
		BuildStats(LeftColumn);

		BuildMatchStatus(Root);
		BuildAbilityStrip(Root);
		BuildScorePanel(Root);
		PrimaryCard = BuildWeaponCard(Root, 1370.f, true);
		SecondaryCard = BuildWeaponCard(Root, 1620.f, false);
	}
	return Super::RebuildWidget();
}

void UUCHUDWidget::BuildVehiclePanel(UCanvasPanel* Canvas, UVerticalBox* LeftColumn)
{
	UHorizontalBox* Frame = WidgetTree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());

	// Own-vehicle identity accent on the leading edge (player amber).
	UBorder* Accent = WidgetTree->ConstructWidget<UBorder>(UBorder::StaticClass());
	Accent->SetBrush(PanelBrush(PlayerAmber, PlayerAmber));
	Accent->SetVisibility(ESlateVisibility::HitTestInvisible);
	USizeBox* AccentSize = WidgetTree->ConstructWidget<USizeBox>(USizeBox::StaticClass());
	AccentSize->SetWidthOverride(4.f);
	AccentSize->AddChild(Accent);
	Cast<UHorizontalBoxSlot>(Frame->AddChild(AccentSize))->SetVerticalAlignment(VAlign_Fill);

	UBorder* Panel = MakePanel(WidgetTree);
	Cast<UHorizontalBoxSlot>(Frame->AddChild(Panel))->SetSize(FSlateChildSize(ESlateSizeRule::Fill));

	UVerticalBox* Content = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
	Panel->SetContent(Content);

	UHorizontalBox* Header = WidgetTree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());
	UTextBlock* Title = MakeText(WidgetTree, UCStrings::Get(TEXT("HUD.Vehicle.Systems")), 18, White);
	Cast<UHorizontalBoxSlot>(Header->AddChild(Title))->SetSize(FSlateChildSize(ESlateSizeRule::Fill));
	VehicleStatus = MakeText(WidgetTree, UCStrings::Get(TEXT("HUD.Vehicle.Nominal")), 14, HealthyGreen, ETextJustify::Right);
	Header->AddChild(VehicleStatus);
	Content->AddChild(Header);

	UHorizontalBox* Body = WidgetTree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());
	Cast<UVerticalBoxSlot>(Content->AddChild(Body))->SetPadding(FMargin(0.f, 8.f, 0.f, 0.f));

	// Placeholder top-down diagram: nine zones laid out like the vehicle seen from above. Replaced by the
	// delivered HUD_Vehicle_DamageDiagram artwork when that asset arrives (register: PH-HUD-001 assets).
	UCanvasPanel* Diagram = WidgetTree->ConstructWidget<UCanvasPanel>(UCanvasPanel::StaticClass());
	USizeBox* DiagramSize = WidgetTree->ConstructWidget<USizeBox>(USizeBox::StaticClass());
	DiagramSize->SetWidthOverride(112.f);
	DiagramSize->SetHeightOverride(150.f);
	DiagramSize->AddChild(Diagram);
	Body->AddChild(DiagramSize);
	// Order matches EUCVehicleComponent: chassis, engine, fuel, FL, FR, RL, RR, primary mount, secondary mount.
	static const FVector4 Rects[9] = {
		FVector4(34, 40, 44, 66), FVector4(36, 6, 40, 28), FVector4(36, 112, 40, 26),
		FVector4(6, 10, 22, 34), FVector4(84, 10, 22, 34), FVector4(6, 106, 22, 34), FVector4(84, 106, 22, 34),
		FVector4(8, 52, 22, 36), FVector4(82, 52, 22, 36) };
	for (int32 Index = 0; Index < 9; ++Index)
	{
		UBorder* Zone = WidgetTree->ConstructWidget<UBorder>(UBorder::StaticClass());
		Zone->SetBrush(PanelBrush(Steel700, Steel400));
		Zone->SetVisibility(ESlateVisibility::HitTestInvisible);
		Zone->SetHorizontalAlignment(HAlign_Center);
		Zone->SetVerticalAlignment(VAlign_Center);
		ZoneMarks[Index] = MakeText(WidgetTree, FText::GetEmpty(), 14, White, ETextJustify::Center);
		Zone->SetContent(ZoneMarks[Index]);
		UCanvasPanelSlot* ZoneSlot = Diagram->AddChildToCanvas(Zone);
		ZoneSlot->SetPosition(FVector2D(Rects[Index].X, Rects[Index].Y));
		ZoneSlot->SetSize(FVector2D(Rects[Index].Z, Rects[Index].W));
		Zones[Index] = Zone;
	}

	// Damaged-parts list: only entries at or below the warning threshold appear here.
	VehicleRows = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
	UHorizontalBoxSlot* RowsSlot = Cast<UHorizontalBoxSlot>(Body->AddChild(VehicleRows));
	RowsSlot->SetSize(FSlateChildSize(ESlateSizeRule::Fill));
	RowsSlot->SetPadding(FMargin(10.f, 0.f, 0.f, 0.f));

	// Shield: always shown for vehicles that have one.
	ShieldRow = WidgetTree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());
	Cast<UVerticalBoxSlot>(Content->AddChild(ShieldRow))->SetPadding(FMargin(0.f, 6.f, 0.f, 0.f));
	UTextBlock* ShieldLabel = MakeText(WidgetTree, UCStrings::Get(TEXT("HUD.Vehicle.Shield")), 14, ShieldCyan);
	Cast<UHorizontalBoxSlot>(ShieldRow->AddChild(ShieldLabel))->SetPadding(FMargin(0.f, 0.f, 8.f, 0.f));
	ShieldBar = MakeBar(WidgetTree, ShieldCyan);
	USizeBox* ShieldBarSize = WidgetTree->ConstructWidget<USizeBox>(USizeBox::StaticClass());
	ShieldBarSize->SetHeightOverride(10.f);
	ShieldBarSize->AddChild(ShieldBar);
	UHorizontalBoxSlot* BarSlot = Cast<UHorizontalBoxSlot>(ShieldRow->AddChild(ShieldBarSize));
	BarSlot->SetSize(FSlateChildSize(ESlateSizeRule::Fill));
	BarSlot->SetVerticalAlignment(VAlign_Center);
	ShieldText = MakeText(WidgetTree, FText::GetEmpty(), 14, White, ETextJustify::Right);
	Cast<UHorizontalBoxSlot>(ShieldRow->AddChild(ShieldText))->SetPadding(FMargin(8.f, 0.f, 0.f, 0.f));

	// Fire: the whole row stays collapsed unless the vehicle is burning.
	FireText = MakeText(WidgetTree, UCStrings::Get(TEXT("HUD.Vehicle.Fire")), 16, FireOrange);
	FireText->SetVisibility(ESlateVisibility::Collapsed);
	Cast<UVerticalBoxSlot>(Content->AddChild(FireText))->SetPadding(FMargin(0.f, 4.f, 0.f, 0.f));

	VehicleSize = WidgetTree->ConstructWidget<USizeBox>(USizeBox::StaticClass());
	VehicleSize->SetWidthOverride(360.f);
	VehicleSize->SetHeightOverride(VehicleHeightCurrent);
	VehicleSize->AddChild(Frame);
	LeftColumn->AddChild(VehicleSize);
}

void UUCHUDWidget::BuildSpeedStrip(UVerticalBox* LeftColumn)
{
	UBorder* Panel = MakePanel(WidgetTree);
	UHorizontalBox* Row = WidgetTree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());
	Panel->SetContent(Row);
	SpeedValue = MakeText(WidgetTree, FText::AsNumber(0), 52, White, ETextJustify::Right);
	Cast<UHorizontalBoxSlot>(Row->AddChild(SpeedValue))->SetSize(FSlateChildSize(ESlateSizeRule::Fill));
	UTextBlock* Unit = MakeText(WidgetTree, UCStrings::Get(TEXT("HUD.Speed.Unit")), 20, PlayerAmber);
	UHorizontalBoxSlot* UnitSlot = Cast<UHorizontalBoxSlot>(Row->AddChild(Unit));
	UnitSlot->SetPadding(FMargin(8.f, 0.f, 0.f, 6.f));
	UnitSlot->SetVerticalAlignment(VAlign_Bottom);

	USizeBox* Size = WidgetTree->ConstructWidget<USizeBox>(USizeBox::StaticClass());
	Size->SetWidthOverride(220.f);
	Size->SetHeightOverride(88.f);
	Size->AddChild(Panel);
	Cast<UVerticalBoxSlot>(LeftColumn->AddChild(Size))->SetPadding(FMargin(0.f, 16.f, 0.f, 0.f));
}

void UUCHUDWidget::BuildStats(UVerticalBox* LeftColumn)
{
	UHorizontalBox* Frame = WidgetTree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());
	StatsTeamStrip = WidgetTree->ConstructWidget<UBorder>(UBorder::StaticClass());
	StatsTeamStrip->SetBrush(PanelBrush(TeamBlue, TeamBlue));
	StatsTeamStrip->SetVisibility(ESlateVisibility::Collapsed);
	USizeBox* StripSize = WidgetTree->ConstructWidget<USizeBox>(USizeBox::StaticClass());
	StripSize->SetWidthOverride(4.f);
	StripSize->AddChild(StatsTeamStrip);
	Cast<UHorizontalBoxSlot>(Frame->AddChild(StripSize))->SetVerticalAlignment(VAlign_Fill);

	StatsPanel = MakePanel(WidgetTree);
	StatsText = MakeText(WidgetTree, FText::GetEmpty(), 16, White);
	StatsPanel->SetContent(StatsText);
	Cast<UHorizontalBoxSlot>(Frame->AddChild(StatsPanel))->SetSize(FSlateChildSize(ESlateSizeRule::Fill));

	USizeBox* Size = WidgetTree->ConstructWidget<USizeBox>(USizeBox::StaticClass());
	Size->SetWidthOverride(260.f);
	Size->SetHeightOverride(56.f);
	Size->AddChild(Frame);
	Cast<UVerticalBoxSlot>(LeftColumn->AddChild(Size))->SetPadding(FMargin(0.f, 22.f, 0.f, 0.f));
}

void UUCHUDWidget::BuildMatchStatus(UCanvasPanel* Canvas)
{
	MatchPanel = MakePanel(WidgetTree);
	UVerticalBox* Stack = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
	MatchPanel->SetContent(Stack);
	MatchMode = MakeText(WidgetTree, FText::GetEmpty(), 16, PlayerAmber, ETextJustify::Center);
	Stack->AddChild(MatchMode);
	MatchClock = MakeText(WidgetTree, FText::GetEmpty(), 42, White, ETextJustify::Center);
	Stack->AddChild(MatchClock);
	UHorizontalBox* Line = WidgetTree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());
	Stack->AddChild(Line);
	MatchPhase = MakeText(WidgetTree, FText::GetEmpty(), 14, Muted, ETextJustify::Left);
	Cast<UHorizontalBoxSlot>(Line->AddChild(MatchPhase))->SetSize(FSlateChildSize(ESlateSizeRule::Fill));
	MatchTimeTag = MakeText(WidgetTree, FText::GetEmpty(), 14, WarningYellow, ETextJustify::Right);
	Line->AddChild(MatchTimeTag);

	USizeBox* Size = WidgetTree->ConstructWidget<USizeBox>(USizeBox::StaticClass());
	Size->SetWidthOverride(520.f);
	Size->SetHeightOverride(112.f);
	Size->AddChild(MatchPanel);
	PlaceTop(Canvas, Size, EAnchorX::Centre, 700.f, 24.f, 520.f, 112.f);
}

void UUCHUDWidget::BuildAbilityStrip(UCanvasPanel* Canvas)
{
	// Delivery 02 3.7 places ability status in the upper band but gives it no rectangle; this strip sits
	// under the match status at Y 144, above the protected central region (Y 180+). Recorded as an open item.
	AbilityStrip = WidgetTree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());
	USizeBox* Size = WidgetTree->ConstructWidget<USizeBox>(USizeBox::StaticClass());
	Size->SetWidthOverride(520.f);
	Size->SetHeightOverride(34.f);
	Size->AddChild(AbilityStrip);
	PlaceTop(Canvas, Size, EAnchorX::Centre, 700.f, 144.f, 520.f, 34.f);
}

void UUCHUDWidget::BuildScorePanel(UCanvasPanel* Canvas)
{
	ScorePanel = MakePanel(WidgetTree);
	ScoreRows = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
	ScorePanel->SetContent(ScoreRows);
	USizeBox* Size = WidgetTree->ConstructWidget<USizeBox>(USizeBox::StaticClass());
	Size->SetWidthOverride(438.f);
	Size->SetMaxDesiredHeight(300.f);
	Size->AddChild(ScorePanel);
	PlaceTop(Canvas, Size, EAnchorX::Right, 1450.f, 28.f, 0.f, 0.f);
	ScorePanel->SetVisibility(ESlateVisibility::Collapsed);
}

UUCHUDWidget::FWeaponCard UUCHUDWidget::BuildWeaponCard(UCanvasPanel* Canvas, float RefX, bool bPrimary)
{
	FWeaponCard Card;
	Card.Panel = MakePanel(WidgetTree);
	UVerticalBox* Stack = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
	Card.Panel->SetContent(Stack);
	Card.Name = MakeText(WidgetTree, UCStrings::Get(bPrimary ? TEXT("HUD.Weapon.Primary") : TEXT("HUD.Weapon.Secondary")), 14, Muted);
	Stack->AddChild(Card.Name);

	UHorizontalBox* AmmoLine = WidgetTree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());
	Stack->AddChild(AmmoLine);
	Card.Ammo = MakeText(WidgetTree, FText::GetEmpty(), 28, White);
	AmmoLine->AddChild(Card.Ammo);
	Card.Reserve = MakeText(WidgetTree, FText::GetEmpty(), 16, Muted);
	UHorizontalBoxSlot* ReserveSlot = Cast<UHorizontalBoxSlot>(AmmoLine->AddChild(Card.Reserve));
	ReserveSlot->SetPadding(FMargin(6.f, 0.f, 0.f, 3.f));
	ReserveSlot->SetVerticalAlignment(VAlign_Bottom);

	Card.Bar = MakeBar(WidgetTree, ActionOrange);
	USizeBox* BarSize = WidgetTree->ConstructWidget<USizeBox>(USizeBox::StaticClass());
	BarSize->SetHeightOverride(8.f);
	BarSize->AddChild(Card.Bar);
	Cast<UVerticalBoxSlot>(Stack->AddChild(BarSize))->SetPadding(FMargin(0.f, 2.f, 0.f, 2.f));

	Card.Status = MakeText(WidgetTree, FText::GetEmpty(), 14, Muted);
	Stack->AddChild(Card.Status);

	USizeBox* Size = WidgetTree->ConstructWidget<USizeBox>(USizeBox::StaticClass());
	Size->SetWidthOverride(240.f);
	Size->SetHeightOverride(112.f);
	Size->AddChild(Card.Panel);
	PlaceTop(Canvas, Size, EAnchorX::Right, RefX, 340.f, 240.f, 112.f);
	return Card;
}

// ---------------------------------------------------------------- binding

AUCVehiclePawn* UUCHUDWidget::GetPawn() const
{
	return GetOwningPlayerPawn<AUCVehiclePawn>();
}

void UUCHUDWidget::BindPawn(AUCVehiclePawn* Pawn)
{
	if (AUCVehiclePawn* Old = BoundPawn.Get())
	{
		Old->Health->OnStateChanged.RemoveAll(this);
		Old->PrimaryWeapon->OnStateChanged.RemoveAll(this);
		Old->SecondaryWeapon->OnStateChanged.RemoveAll(this);
		Old->Abilities->OnAbilitiesChanged.RemoveAll(this);
	}
	BoundPawn = Pawn;
	if (Pawn != nullptr)
	{
		Pawn->Health->OnStateChanged.AddUniqueDynamic(this, &UUCHUDWidget::HandleHealthChanged);
		Pawn->PrimaryWeapon->OnStateChanged.AddUniqueDynamic(this, &UUCHUDWidget::HandleWeaponChanged);
		Pawn->SecondaryWeapon->OnStateChanged.AddUniqueDynamic(this, &UUCHUDWidget::HandleWeaponChanged);
		Pawn->Abilities->OnAbilitiesChanged.AddUniqueDynamic(this, &UUCHUDWidget::HandleAbilitiesChanged);
	}
	bVehicleDirty = bPrimaryDirty = bSecondaryDirty = bAbilitiesDirty = true;
}

void UUCHUDWidget::BindGameState(AUCGameState* State)
{
	if (AUCGameState* Old = BoundState.Get())
	{
		Old->OnMatchStateChanged.RemoveAll(this);
	}
	BoundState = State;
	if (State != nullptr)
	{
		State->OnMatchStateChanged.AddUniqueDynamic(this, &UUCHUDWidget::HandleMatchChanged);
	}
	bMatchDirty = true;
}

void UUCHUDWidget::NativeDestruct()
{
	BindPawn(nullptr);
	BindGameState(nullptr);
	Super::NativeDestruct();
}

// Delegates only mark sections dirty; the refresh happens once per tick, however many events arrived.
void UUCHUDWidget::HandleHealthChanged(UUCVehicleHealthComponent*) { bVehicleDirty = true; }
void UUCHUDWidget::HandleAbilitiesChanged(UUCAbilityComponent*) { bAbilitiesDirty = true; }
void UUCHUDWidget::HandleMatchChanged(AUCGameState*) { bMatchDirty = true; }
void UUCHUDWidget::HandleWeaponChanged(UUCWeaponComponent* Weapon)
{
	const AUCVehiclePawn* Pawn = BoundPawn.Get();
	if (Pawn != nullptr && Weapon == Pawn->SecondaryWeapon)
	{
		bSecondaryDirty = true;
	}
	else
	{
		bPrimaryDirty = true;
	}
}

// ---------------------------------------------------------------- refresh

void UUCHUDWidget::NativeTick(const FGeometry& MyGeometry, float InDeltaTime)
{
	Super::NativeTick(MyGeometry, InDeltaTime);
	AUCVehiclePawn* Pawn = GetPawn();
	if (Pawn != BoundPawn.Get())
	{
		BindPawn(Pawn);
	}
	AUCGameState* State = GetWorld() != nullptr ? GetWorld()->GetGameState<AUCGameState>() : nullptr;
	if (State != BoundState.Get())
	{
		BindGameState(State);
	}

	SlowTimer += InDeltaTime;
	const bool bSlowTick = SlowTimer >= SlowInterval;
	if (bSlowTick)
	{
		SlowTimer = 0.f;
		RefreshSpeedAndStats();
	}

	if (bVehicleDirty) { bVehicleDirty = false; RefreshVehicle(); }
	if (Pawn != nullptr)
	{
		// Reload progress changes continuously, so a reloading card refreshes at the slow rate too.
		if (bPrimaryDirty || (bSlowTick && Pawn->PrimaryWeapon->GetWeaponState().bReloading)) { bPrimaryDirty = false; RefreshWeapon(PrimaryCard, Pawn->PrimaryWeapon, true); }
		if (bSecondaryDirty || (bSlowTick && Pawn->SecondaryWeapon->GetWeaponState().bReloading)) { bSecondaryDirty = false; RefreshWeapon(SecondaryCard, Pawn->SecondaryWeapon, false); }
	}
	if (bAbilitiesDirty || bSlowTick) { bAbilitiesDirty = false; RefreshAbilities(); }
	if (bMatchDirty || bSlowTick) { bMatchDirty = false; RefreshMatch(); RefreshScorePanel(); }

	// Panel height eases toward its target over ~180 ms (expand / collapse).
	if (!FMath::IsNearlyEqual(VehicleHeightCurrent, VehicleHeightTarget, 0.5f))
	{
		VehicleHeightCurrent = FMath::FInterpConstantTo(VehicleHeightCurrent, VehicleHeightTarget, InDeltaTime, FMath::Abs(VehicleHeightTarget - VehicleHeightCurrent) / 0.18f + 60.f);
		VehicleSize->SetHeightOverride(VehicleHeightCurrent);
	}

	// Restrained pulse for critical elements (about 1 s period). Opacity only, never full-screen.
	PulseTime += InDeltaTime;
	const float Pulse = 0.78f + 0.22f * FMath::Sin(PulseTime * 2.f * PI);
	for (UWidget* Widget : PulseWidgets)
	{
		if (Widget != nullptr) { Widget->SetRenderOpacity(Pulse); }
	}

	// Match over: the HUD steps back for the results screen.
	SetRenderOpacity(State != nullptr && State->Phase == EUCMatchPhase::Finished ? 0.4f : 1.f);
}

void UUCHUDWidget::CollectSeverityEntries(TArray<FSeverityEntry>& Out) const
{
	const AUCVehiclePawn* Pawn = BoundPawn.Get();
	if (Pawn == nullptr)
	{
		return;
	}
	const UUCVehicleHealthComponent* Health = Pawn->Health;
	for (int32 Index = 0; Index < 9; ++Index)
	{
		const float Fraction = Health->GetHealthFraction(static_cast<EUCVehicleComponent>(Index));
		const ESeverity Severity = SeverityFromFraction(Fraction, WarnAt, CritAt);
		if (Severity != ESeverity::Normal)
		{
			Out.Add({ UCStrings::Get(ComponentKey(Index)), Fraction, Severity });
		}
	}
	for (int32 Index = 0; Index < 6; ++Index)
	{
		const float Fraction = Health->GetArmorFraction(static_cast<EUCArmorFacing>(Index));
		const ESeverity Severity = SeverityFromFraction(Fraction, WarnAt, CritAt);
		if (Severity != ESeverity::Normal)
		{
			Out.Add({ UCStrings::Get(ArmourKey(Index)), Fraction, Severity });
		}
	}
	// Worst first: destroyed, critical, warning; within a class the lowest value first.
	Out.Sort([](const FSeverityEntry& A, const FSeverityEntry& B)
	{
		return A.Severity != B.Severity ? static_cast<uint8>(A.Severity) > static_cast<uint8>(B.Severity) : A.Fraction < B.Fraction;
	});
}

void UUCHUDWidget::RefreshVehicle()
{
	PulseWidgets.Reset();
	VehicleRows->ClearChildren();
	const AUCVehiclePawn* Pawn = BoundPawn.Get();
	const bool bHasVehicle = Pawn != nullptr && Pawn->Health != nullptr;
	if (!bHasVehicle)
	{
		VehicleStatus->SetText(FText::GetEmpty());
		ShieldRow->SetVisibility(ESlateVisibility::Collapsed);
		FireText->SetVisibility(ESlateVisibility::Collapsed);
		VehicleHeightTarget = 176.f;
		return;
	}
	const UUCVehicleHealthComponent* Health = Pawn->Health;

	TArray<FSeverityEntry> Entries;
	CollectSeverityEntries(Entries);
	ESeverity Worst = ESeverity::Normal;
	for (const FSeverityEntry& Entry : Entries)
	{
		Worst = static_cast<uint8>(Entry.Severity) > static_cast<uint8>(Worst) ? Entry.Severity : Worst;
	}

	// Status line: text always accompanies colour.
	if (Worst == ESeverity::Normal)
	{
		VehicleStatus->SetText(UCStrings::Get(TEXT("HUD.Vehicle.Nominal")));
		VehicleStatus->SetColorAndOpacity(FSlateColor(HealthyGreen));
	}
	else if (Worst == ESeverity::Warning)
	{
		VehicleStatus->SetText(UCStrings::Get(TEXT("HUD.Vehicle.DamagedParts")));
		VehicleStatus->SetColorAndOpacity(FSlateColor(WarningYellow));
	}
	else
	{
		VehicleStatus->SetText(UCStrings::Get(Worst == ESeverity::Destroyed ? TEXT("HUD.Vehicle.Destroyed") : TEXT("HUD.Vehicle.Critical")));
		VehicleStatus->SetColorAndOpacity(FSlateColor(SeverityColor(Worst, White)));
		PulseWidgets.Add(VehicleStatus);
	}

	// Zones of the diagram: colour by severity plus a mark for destroyed parts.
	for (int32 Index = 0; Index < 9; ++Index)
	{
		const float Fraction = Health->GetHealthFraction(static_cast<EUCVehicleComponent>(Index));
		const ESeverity Severity = SeverityFromFraction(Fraction, WarnAt, CritAt);
		Zones[Index]->SetBrush(PanelBrush(Severity == ESeverity::Normal ? Steel700 : SeverityColor(Severity, Steel700), Severity == ESeverity::Normal ? Steel400 : White));
		ZoneMarks[Index]->SetText(Severity == ESeverity::Destroyed ? FText::FromString(TEXT("X")) : (Severity == ESeverity::Critical ? FText::FromString(TEXT("!")) : FText::GetEmpty()));
		if (Severity == ESeverity::Critical) { PulseWidgets.Add(Zones[Index]); }
	}

	// Rows: only damaged entries. Height grows with severity but never reaches the left touch zone.
	const float LowerStack = 16.f + 88.f + 22.f + 56.f;
	const float MaxHeight = LeftColumnLimit - 28.f - LowerStack;
	const float Target = Worst == ESeverity::Normal ? 176.f : (Worst == ESeverity::Warning ? 260.f : 330.f);
	VehicleHeightTarget = FMath::Min(Target, MaxHeight);
	const int32 MaxRows = FMath::Max(1, FMath::FloorToInt((VehicleHeightTarget - 34.f - 40.f - 20.f) / 24.f));
	for (int32 Index = 0; Index < Entries.Num() && Index < MaxRows; ++Index)
	{
		const FSeverityEntry& Entry = Entries[Index];
		const FLinearColor Colour = SeverityColor(Entry.Severity, HealthyGreen);
		UHorizontalBox* Row = WidgetTree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());
		UTextBlock* Name = MakeText(WidgetTree, Entry.Name, 14, Colour);
		Cast<UHorizontalBoxSlot>(Row->AddChild(Name))->SetSize(FSlateChildSize(ESlateSizeRule::Fill));
		if (Entry.Severity >= ESeverity::Critical)
		{
			UTextBlock* Tag = MakeText(WidgetTree, UCStrings::Get(Entry.Severity == ESeverity::Destroyed ? TEXT("HUD.Vehicle.Destroyed") : TEXT("HUD.Vehicle.Critical")), 12, Colour);
			Cast<UHorizontalBoxSlot>(Row->AddChild(Tag))->SetPadding(FMargin(4.f, 0.f));
			PulseWidgets.Add(Tag);
		}
		UTextBlock* Value = MakeText(WidgetTree, Percent(Entry.Fraction), 14, White, ETextJustify::Right);
		Cast<UHorizontalBoxSlot>(Row->AddChild(Value))->SetPadding(FMargin(4.f, 0.f));
		UProgressBar* Bar = MakeBar(WidgetTree, Colour);
		Bar->SetPercent(Entry.Fraction);
		USizeBox* BarSize = WidgetTree->ConstructWidget<USizeBox>(USizeBox::StaticClass());
		BarSize->SetWidthOverride(56.f);
		BarSize->SetHeightOverride(8.f);
		BarSize->AddChild(Bar);
		Cast<UHorizontalBoxSlot>(Row->AddChild(BarSize))->SetVerticalAlignment(VAlign_Center);
		VehicleRows->AddChild(Row);
	}

	// Shield: only for vehicles that carry one.
	ShieldRow->SetVisibility(Health->HasShield() ? ESlateVisibility::HitTestInvisible : ESlateVisibility::Collapsed);
	if (Health->HasShield())
	{
		const float Shield = Health->GetShieldFraction();
		const ESeverity ShieldSeverity = SeverityFromFraction(Shield, ShieldWarnAt, ShieldCritAt);
		ShieldBar->SetPercent(Shield);
		ShieldBar->SetFillColorAndOpacity(ShieldSeverity == ESeverity::Normal ? ShieldCyan : SeverityColor(ShieldSeverity, ShieldCyan));
		ShieldText->SetText(Shield <= 0.f ? UCStrings::Get(TEXT("HUD.Vehicle.Destroyed")) : Percent(Shield));
		ShieldText->SetColorAndOpacity(FSlateColor(ShieldSeverity == ESeverity::Normal ? White : SeverityColor(ShieldSeverity, White)));
	}

	FireText->SetVisibility(Health->IsOnFire() ? ESlateVisibility::HitTestInvisible : ESlateVisibility::Collapsed);
	if (Health->IsOnFire()) { PulseWidgets.Add(FireText); }
}

void UUCHUDWidget::RefreshSpeedAndStats()
{
	const AUCVehiclePawn* Pawn = BoundPawn.Get();
	const int32 Speed = Pawn != nullptr ? FMath::RoundToInt(FMath::Abs(Pawn->GetSpeedKmh())) : 0;
	if (Speed != LastShownSpeed)
	{
		LastShownSpeed = Speed;
		SpeedValue->SetText(FText::AsNumber(Speed));
	}

	const APlayerController* Controller = GetOwningPlayer();
	const AUCPlayerState* PlayerState = Controller != nullptr ? Controller->GetPlayerState<AUCPlayerState>() : nullptr;
	const AUCGameState* State = BoundState.Get();
	if (PlayerState == nullptr || State == nullptr)
	{
		StatsPanel->SetVisibility(ESlateVisibility::Collapsed);
		StatsTeamStrip->SetVisibility(ESlateVisibility::Collapsed);
		return;
	}
	StatsPanel->SetVisibility(ESlateVisibility::HitTestInvisible);
	StatsText->SetText(FText::FromString(FString::Printf(TEXT("%s %d   %s %d   %s %d"),
		*UCStrings::Get(TEXT("HUD.Stats.Kills")).ToString(), PlayerState->GetKills(),
		*UCStrings::Get(TEXT("HUD.Stats.Deaths")).ToString(), PlayerState->GetDeaths(),
		*UCStrings::Get(TEXT("HUD.Stats.Score")).ToString(), PlayerState->GetMatchScore())));
	// Team colour marks team identity only, and only where the mode has teams.
	const bool bTeamMode = State->Mode != EUCMatchMode::FreeForAll && PlayerState->GetTeamId() >= 0;
	StatsTeamStrip->SetVisibility(bTeamMode ? ESlateVisibility::HitTestInvisible : ESlateVisibility::Collapsed);
	if (bTeamMode)
	{
		const FLinearColor TeamColour = PlayerState->GetTeamId() == 0 ? TeamBlue : EnemyRed;
		StatsTeamStrip->SetBrush(PanelBrush(TeamColour, TeamColour));
	}
}

void UUCHUDWidget::RefreshWeapon(FWeaponCard& Card, UUCWeaponComponent* Weapon, bool bPrimary)
{
	if (Weapon == nullptr || !Weapon->HasWeapon())
	{
		Card.Panel->SetVisibility(ESlateVisibility::Collapsed); // no fabricated ammo
		return;
	}
	Card.Panel->SetVisibility(ESlateVisibility::HitTestInvisible);
	const UUCWeaponDefinition* Definition = Weapon->GetDefinition();
	const FUCWeaponState& State = Weapon->GetWeaponState();

	Card.Name->SetText(Definition->DisplayName.IsEmpty() ? UCStrings::Get(bPrimary ? TEXT("HUD.Weapon.Primary") : TEXT("HUD.Weapon.Secondary")) : Definition->DisplayName);

	const bool bUsesAmmo = Definition->MagazineSize > 0;
	ESeverity AmmoSeverity = ESeverity::Normal;
	if (bUsesAmmo)
	{
		const float Ratio = static_cast<float>(State.AmmoInMagazine) / static_cast<float>(Definition->MagazineSize);
		AmmoSeverity = State.AmmoInMagazine <= 0 ? ESeverity::Destroyed : SeverityFromFraction(Ratio, AmmoWarnAt, AmmoCritAt);
		Card.Ammo->SetText(FText::AsNumber(State.AmmoInMagazine));
		Card.Reserve->SetText(State.ReserveAmmo < 0 ? FText::FromString(TEXT("/ ∞")) : FText::FromString(FString::Printf(TEXT("/ %d"), State.ReserveAmmo)));
	}
	else
	{
		Card.Ammo->SetText(FText::GetEmpty());   // heat-limited weapon: no ammunition to show
		Card.Reserve->SetText(FText::GetEmpty());
	}
	Card.Ammo->SetColorAndOpacity(FSlateColor(AmmoSeverity == ESeverity::Normal ? White : (AmmoSeverity == ESeverity::Destroyed ? CriticalMagenta : SeverityColor(AmmoSeverity, White))));

	// One status line, strongest condition first.
	FText Status;
	FLinearColor StatusColour = Muted;
	if (!State.bOnline)
	{
		Status = UCStrings::Get(TEXT("HUD.Weapon.MountOffline"));
		StatusColour = Steel400;
	}
	else if (State.bReloading)
	{
		Status = UCStrings::Get(TEXT("HUD.Weapon.Reloading"));
		StatusColour = White;
	}
	else if (State.bOverheated)
	{
		Status = UCStrings::Get(TEXT("HUD.Weapon.Overheated"));
		StatusColour = CriticalMagenta;
	}
	else if (bUsesAmmo && AmmoSeverity == ESeverity::Destroyed)
	{
		Status = UCStrings::Get(TEXT("HUD.Weapon.Empty"));
		StatusColour = CriticalMagenta;
	}
	else if (AmmoSeverity == ESeverity::Critical)
	{
		Status = UCStrings::Get(TEXT("HUD.Weapon.CriticalAmmo"));
		StatusColour = CriticalMagenta;
	}
	else if (AmmoSeverity == ESeverity::Warning)
	{
		Status = UCStrings::Get(TEXT("HUD.Weapon.LowAmmo"));
		StatusColour = WarningYellow;
	}
	Card.Status->SetText(Status);
	Card.Status->SetColorAndOpacity(FSlateColor(StatusColour));

	// Bar: reload progress while reloading (authoritative timing), otherwise weapon heat.
	if (State.bReloading)
	{
		Card.Bar->SetFillColorAndOpacity(White);
		Card.Bar->SetPercent(Weapon->GetReloadProgress());
	}
	else
	{
		Card.Bar->SetFillColorAndOpacity(State.bOverheated ? CriticalMagenta : ActionOrange);
		Card.Bar->SetPercent(Weapon->GetHeat());
	}
	Card.Panel->SetRenderOpacity(State.bOnline ? 1.f : 0.55f);   // offline mount: muted, still readable
}

FString UUCHUDWidget::ComputeAbilitySignature() const
{
	FString Sig;
	const AUCVehiclePawn* Pawn = BoundPawn.Get();
	if (Pawn == nullptr || Pawn->Abilities == nullptr)
	{
		return Sig;
	}
	const AGameStateBase* GameState = GetWorld() != nullptr ? GetWorld()->GetGameState() : nullptr;
	const float Now = GameState != nullptr ? static_cast<float>(GameState->GetServerWorldTimeSeconds()) : 0.f;
	for (const FUCAbilityState& State : Pawn->Abilities->GetAbilityStates())
	{
		const float Wait = FMath::Max(State.ReadyTime - Now, 0.f);
		const float Total = State.bActive ? State.ActiveDuration : State.CooldownDuration;
		const float Left = State.bActive ? FMath::Max(State.ActiveEndTime - Now, 0.f) : Wait;
		// Progress quantised to 5% steps so the strip rebuilds about 20 times per cooldown, not every tick.
		Sig += FString::Printf(TEXT("%d%d%d:%d|"), State.bActive ? 1 : 0, Wait > 0.f ? 1 : 0, State.ChargesRemaining, Total > 0.f ? FMath::RoundToInt(Left / Total * 20.f) : -1);
	}
	return Sig;
}

void UUCHUDWidget::RefreshAbilities()
{
	const AUCVehiclePawn* Pawn = BoundPawn.Get();
	const FString NewSignature = ComputeAbilitySignature();
	if (NewSignature == AbilitySignature)
	{
		return;
	}
	AbilitySignature = NewSignature;
	AbilityStrip->ClearChildren();
	if (Pawn == nullptr || Pawn->Abilities == nullptr)
	{
		return;
	}
	const TArray<FUCAbilityState>& States = Pawn->Abilities->GetAbilityStates();
	const TArray<FUCAbilityDefinition>& Definitions = Pawn->Abilities->GetAbilityDefinitions();
	const AGameStateBase* GameState = GetWorld() != nullptr ? GetWorld()->GetGameState() : nullptr;
	const float Now = GameState != nullptr ? static_cast<float>(GameState->GetServerWorldTimeSeconds()) : 0.f;

	for (int32 Slot = 0; Slot < States.Num() && Slot < Definitions.Num() && Slot < 4; ++Slot)
	{
		const FUCAbilityState& State = States[Slot];
		const float Wait = FMath::Max(State.ReadyTime - Now, 0.f);
		FText Label = Definitions[Slot].DisplayName;
		if (Label.IsEmpty())
		{
			static const TCHAR* Keys[4] = { TEXT("HUD.Ability.Repair"), TEXT("HUD.Ability.Boost"), TEXT("HUD.Ability.ShieldRecharge"), TEXT("HUD.Ability.Extinguisher") };
			Label = UCStrings::Get(Keys[FMath::Clamp(static_cast<int32>(Definitions[Slot].Effect), 0, 3)]);
		}
		FText StateText;
		FLinearColor Colour = HealthyGreen;
		float Progress = -1.f;
		if (State.ChargesRemaining == 0)
		{
			StateText = UCStrings::Get(TEXT("HUD.Ability.NoCharges"));
			Colour = Steel400;
		}
		else if (State.bActive)
		{
			StateText = UCStrings::Get(TEXT("HUD.Ability.Active"));
			Colour = ShieldCyan;
			Progress = State.ActiveDuration > 0.f ? FMath::Clamp((State.ActiveEndTime - Now) / State.ActiveDuration, 0.f, 1.f) : -1.f;
		}
		else if (Wait > 0.f)
		{
			StateText = UCStrings::Get(TEXT("HUD.Ability.Cooldown"));
			Colour = Steel400;
			// Needs the full cooldown length (ability state field added for this). No bar without it.
			Progress = State.CooldownDuration > 0.f ? FMath::Clamp(1.f - Wait / State.CooldownDuration, 0.f, 1.f) : -1.f;
		}
		else
		{
			StateText = UCStrings::Get(TEXT("HUD.Ability.Ready"));
		}

		UBorder* Tile = MakePanel(WidgetTree, Colour);
		Tile->SetPadding(FMargin(8.f, 2.f));
		UVerticalBox* Stack = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
		Tile->SetContent(Stack);
		FString Line = Label.ToString() + TEXT(" ") + StateText.ToString();
		if (State.ChargesRemaining > 0) { Line += FString::Printf(TEXT(" x%d"), State.ChargesRemaining); }
		Stack->AddChild(MakeText(WidgetTree, FText::FromString(Line), 12, Colour));
		if (Progress >= 0.f)
		{
			UProgressBar* Bar = MakeBar(WidgetTree, Colour);
			Bar->SetPercent(Progress);
			USizeBox* BarSize = WidgetTree->ConstructWidget<USizeBox>(USizeBox::StaticClass());
			BarSize->SetHeightOverride(4.f);
			BarSize->AddChild(Bar);
			Stack->AddChild(BarSize);
		}
		UHorizontalBoxSlot* TileSlot = Cast<UHorizontalBoxSlot>(AbilityStrip->AddChild(Tile));
		TileSlot->SetPadding(FMargin(0.f, 0.f, 6.f, 0.f));
	}
}

void UUCHUDWidget::RefreshMatch()
{
	const AUCGameState* State = BoundState.Get();
	if (State == nullptr)
	{
		MatchPanel->SetVisibility(ESlateVisibility::Collapsed);
		return;
	}
	MatchPanel->SetVisibility(ESlateVisibility::HitTestInvisible);

	static const TCHAR* ModeKeys[4] = { TEXT("HUD.Mode.FreeForAll"), TEXT("HUD.Mode.TeamDeathmatch"), TEXT("HUD.Mode.Mission"), TEXT("HUD.Mode.BossHunt") };
	static const TCHAR* PhaseKeys[3] = { TEXT("HUD.Phase.Warmup"), TEXT("HUD.Phase.InProgress"), TEXT("HUD.Phase.Finished") };
	MatchMode->SetText(UCStrings::Get(ModeKeys[FMath::Clamp(static_cast<int32>(State->Mode), 0, 3)]));
	MatchPhase->SetText(UCStrings::Get(PhaseKeys[FMath::Clamp(static_cast<int32>(State->Phase), 0, 2)]));

	if (State->SecondsRemaining < 0)
	{
		MatchClock->SetText(FText::GetEmpty());     // untimed: show no invented countdown
		MatchTimeTag->SetText(FText::GetEmpty());
		return;
	}
	MatchClock->SetText(FormatClock(State->SecondsRemaining));

	// Low-time thresholds need the original duration; without it the clock is shown normally.
	ESeverity Severity = ESeverity::Normal;
	if (State->Phase == EUCMatchPhase::InProgress && State->MatchDurationSeconds > 0)
	{
		const float Fraction = static_cast<float>(State->SecondsRemaining) / static_cast<float>(State->MatchDurationSeconds);
		Severity = SeverityFromFraction(Fraction, TimeWarnAt, TimeCritAt);
		if (State->SecondsRemaining <= 0) { Severity = ESeverity::Critical; }
	}
	MatchClock->SetColorAndOpacity(FSlateColor(Severity == ESeverity::Normal ? White : SeverityColor(Severity, White)));
	MatchTimeTag->SetText(Severity == ESeverity::Normal ? FText::GetEmpty() : UCStrings::Get(Severity == ESeverity::Warning ? TEXT("HUD.Match.TimeWarning") : TEXT("HUD.Match.TimeCritical")));
	MatchTimeTag->SetColorAndOpacity(FSlateColor(SeverityColor(Severity, White)));
}

FString UUCHUDWidget::ComputeScoreSignature() const
{
	const AUCGameState* State = BoundState.Get();
	if (State == nullptr)
	{
		return FString();
	}
	FString Sig = FString::Printf(TEXT("%d|%d|"), static_cast<int32>(State->Mode), State->LivesRemaining);
	for (const int32 Score : State->TeamScores) { Sig += FString::Printf(TEXT("%d,"), Score); }
	for (const FUCObjectiveState& Objective : State->Objectives) { Sig += FString::Printf(TEXT("%s:%d/%d,"), *Objective.ObjectiveId.ToString(), Objective.Progress, Objective.Required); }
	if (const AUCVehiclePawn* Boss = State->GetBossVehicle())
	{
		Sig += FString::Printf(TEXT("B%d"), FMath::RoundToInt(Boss->Health->GetHealthFraction(EUCVehicleComponent::Chassis) * 100.f));
	}
	return Sig;
}

void UUCHUDWidget::RefreshScorePanel()
{
	const AUCGameState* State = BoundState.Get();
	const FString NewSignature = ComputeScoreSignature();
	if (NewSignature == ScoreSignature)
	{
		return;
	}
	ScoreSignature = NewSignature;
	ScoreRows->ClearChildren();
	if (State == nullptr)
	{
		ScorePanel->SetVisibility(ESlateVisibility::Collapsed);
		return;
	}
	bool bAny = false;

	// Team scores: team deathmatch only (a team score is meaningless in free-for-all and in PvE modes).
	if (State->Mode == EUCMatchMode::TeamDeathmatch && State->TeamScores.Num() >= 2)
	{
		UHorizontalBox* Row = WidgetTree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());
		UTextBlock* Blue = MakeText(WidgetTree, FText::FromString(FString::Printf(TEXT("%s  %d"), *UCStrings::Get(TEXT("HUD.Score.TeamBlue")).ToString(), State->TeamScores[0])), 30, TeamBlue);
		Cast<UHorizontalBoxSlot>(Row->AddChild(Blue))->SetSize(FSlateChildSize(ESlateSizeRule::Fill));
		UTextBlock* Red = MakeText(WidgetTree, FText::FromString(FString::Printf(TEXT("%d  %s"), State->TeamScores[1], *UCStrings::Get(TEXT("HUD.Score.TeamRed")).ToString())), 30, EnemyRed, ETextJustify::Right);
		Cast<UHorizontalBoxSlot>(Row->AddChild(Red))->SetSize(FSlateChildSize(ESlateSizeRule::Fill));
		ScoreRows->AddChild(Row);
		bAny = true;
	}

	const bool bObjectiveMode = State->Mode == EUCMatchMode::Mission || State->Mode == EUCMatchMode::BossHunt;
	if (bObjectiveMode && State->LivesRemaining >= 0)
	{
		ScoreRows->AddChild(MakeText(WidgetTree, FText::FromString(FString::Printf(TEXT("%s %d"), *UCStrings::Get(TEXT("HUD.Lives")).ToString(), State->LivesRemaining)), 16, White));
		bAny = true;
	}

	if (bObjectiveMode)
	{
		for (const FUCObjectiveState& Objective : State->Objectives)
		{
			const FLinearColor Colour = Objective.bComplete ? HealthyGreen : White;
			UHorizontalBox* Row = WidgetTree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());
			// Display text comes from the mission asset; if absent the objective id is the only honest label.
			const FText Text = Objective.DisplayText.IsEmpty() ? FText::FromName(Objective.ObjectiveId) : Objective.DisplayText;
			Cast<UHorizontalBoxSlot>(Row->AddChild(MakeText(WidgetTree, Text, 14, Colour)))->SetSize(FSlateChildSize(ESlateSizeRule::Fill));
			if (Objective.bOptional)
			{
				Cast<UHorizontalBoxSlot>(Row->AddChild(MakeText(WidgetTree, UCStrings::Get(TEXT("HUD.Objective.Optional")), 12, Steel400)))->SetPadding(FMargin(4.f, 0.f));
			}
			const FText Progress = Objective.bComplete ? UCStrings::Get(TEXT("HUD.Objective.Complete")) : FText::FromString(FString::Printf(TEXT("%d/%d"), Objective.Progress, Objective.Required));
			Row->AddChild(MakeText(WidgetTree, Progress, 14, Colour, ETextJustify::Right));
			ScoreRows->AddChild(Row);
			if (Objective.Required > 0)
			{
				UProgressBar* Bar = MakeBar(WidgetTree, Colour);
				Bar->SetPercent(FMath::Clamp(static_cast<float>(Objective.Progress) / static_cast<float>(Objective.Required), 0.f, 1.f));
				USizeBox* BarSize = WidgetTree->ConstructWidget<USizeBox>(USizeBox::StaticClass());
				BarSize->SetHeightOverride(6.f);
				BarSize->AddChild(Bar);
				Cast<UVerticalBoxSlot>(ScoreRows->AddChild(BarSize))->SetPadding(FMargin(0.f, 2.f, 0.f, 6.f));
			}
			bAny = true;
		}
	}

	// Boss health: boss hunt only, and only while the lookup finds a living boss.
	if (State->Mode == EUCMatchMode::BossHunt)
	{
		if (const AUCVehiclePawn* Boss = State->GetBossVehicle())
		{
			const float Fraction = Boss->Health->GetHealthFraction(EUCVehicleComponent::Chassis);
			FText Name = UCStrings::Get(TEXT("HUD.Boss.Title"));
			if (const UUCVehicleDefinition* Definition = Boss->GetDefinition())
			{
				if (!Definition->DisplayName.IsEmpty()) { Name = Definition->DisplayName; }
			}
			UHorizontalBox* Row = WidgetTree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());
			Cast<UHorizontalBoxSlot>(Row->AddChild(MakeText(WidgetTree, Name, 16, White)))->SetSize(FSlateChildSize(ESlateSizeRule::Fill));
			Row->AddChild(MakeText(WidgetTree, Percent(Fraction), 16, White, ETextJustify::Right));
			Cast<UVerticalBoxSlot>(ScoreRows->AddChild(Row))->SetPadding(FMargin(0.f, 6.f, 0.f, 0.f));
			UProgressBar* Bar = MakeBar(WidgetTree, BossFill, Steel700);
			Bar->SetPercent(Fraction);
			USizeBox* BarSize = WidgetTree->ConstructWidget<USizeBox>(USizeBox::StaticClass());
			BarSize->SetHeightOverride(12.f);
			BarSize->AddChild(Bar);
			ScoreRows->AddChild(BarSize);
			bAny = true;
		}
	}
	ScorePanel->SetVisibility(bAny ? ESlateVisibility::HitTestInvisible : ESlateVisibility::Collapsed);
}
