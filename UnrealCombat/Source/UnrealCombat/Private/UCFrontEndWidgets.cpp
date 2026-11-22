#include "UCFrontEndWidgets.h"

#include "Components/CanvasPanel.h"
#include "Components/Image.h"
#include "Components/Overlay.h"
#include "Components/OverlaySlot.h"
#include "Components/SafeZone.h"
#include "Components/ScrollBox.h"
#include "Components/WrapBox.h"
#include "Components/WrapBoxSlot.h"
#include "Engine/GameInstance.h"
#include "Engine/Texture2D.h"
#include "GameFramework/GeneralProjectSettings.h"
#include "Input/Events.h"
#include "InputCoreTypes.h"
#include "Kismet/KismetSystemLibrary.h"
#include "UCDefinitions.h"
#include "UCFrontEnd.h"
#include "UCProfileSubsystem.h"
#include "UCStrings.h"
#include "UCUIKit.h"

#include UE_INLINE_GENERATED_CPP_BY_NAME(UCFrontEndWidgets)

using namespace UCUI;

namespace
{
	constexpr float RefW = 1920.f;

	FText Str(const TCHAR* Key) { return UCStrings::Get(Key); }

	/** Item display name: the definition's DisplayName when the asset provides one, otherwise the id. */
	FText ItemName(const FUCCatalogEntry& Entry)
	{
		if (UPrimaryDataAsset* Asset = Entry.Definition.LoadSynchronous())
		{
			if (const UUCVehicleDefinition* Vehicle = Cast<UUCVehicleDefinition>(Asset))
			{
				if (!Vehicle->DisplayName.IsEmpty()) { return Vehicle->DisplayName; }
			}
			if (const UUCWeaponDefinition* Weapon = Cast<UUCWeaponDefinition>(Asset))
			{
				if (!Weapon->DisplayName.IsEmpty()) { return Weapon->DisplayName; }
			}
		}
		return FText::FromName(Entry.ItemId);
	}

	TSoftObjectPtr<UTexture2D> ItemIcon(const FUCCatalogEntry& Entry)
	{
		if (UPrimaryDataAsset* Asset = Entry.Definition.LoadSynchronous())
		{
			if (const UUCVehicleDefinition* Vehicle = Cast<UUCVehicleDefinition>(Asset)) { return Vehicle->Icon; }
			if (const UUCWeaponDefinition* Weapon = Cast<UUCWeaponDefinition>(Asset)) { return Weapon->Icon; }
		}
		return TSoftObjectPtr<UTexture2D>();
	}

	FText KindName(EUCItemKind Kind)
	{
		static const TCHAR* Keys[4] = { TEXT("GARAGE.Category.Vehicles"), TEXT("GARAGE.Category.Weapons"), TEXT("GARAGE.Category.Upgrades"), TEXT("GARAGE.Category.Consumables") };
		return Str(Keys[FMath::Clamp(static_cast<int32>(Kind), 0, 3)]);
	}

	FText CurrencyName(EUCCurrency Currency) { return Str(Currency == EUCCurrency::Credits ? TEXT("MENU.Currency.Credits") : TEXT("MENU.Currency.Premium")); }

	FText PriceText(const FUCCatalogEntry& Entry)
	{
		return FText::Format(FText::FromString(TEXT("{0} {1}")), FText::AsNumber(Entry.Price), CurrencyName(Entry.Currency));
	}

	FText TransactionText(EUCTransactionResult Result)
	{
		static const TCHAR* Keys[10] = { TEXT("TX.Ok"), TEXT("TX.Duplicate"), TEXT("TX.InvalidId"), TEXT("TX.InvalidAmount"), TEXT("TX.InsufficientFunds"),
			TEXT("TX.UnknownItem"), TEXT("TX.AlreadyOwned"), TEXT("TX.NotOwned"), TEXT("TX.LevelTooLow"), TEXT("TX.WrongItemKind") };
		return Str(Keys[FMath::Clamp(static_cast<int32>(Result), 0, 9)]);
	}

	bool IsSuccess(EUCTransactionResult Result) { return Result == EUCTransactionResult::Ok || Result == EUCTransactionResult::Duplicate; }

	/** Two currency pills from the profile, or a loading line. Never shows zero for a profile that has not loaded. */
	UWidget* CurrencyStrip(UWidgetTree* Tree, const UUCProfileSubsystem* Profile)
	{
		UHorizontalBox* Row = Tree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());
		if (Profile == nullptr || !Profile->IsLoaded())
		{
			Row->AddChild(Text(Tree, Str(TEXT("MENU.State.Loading")), 16, Steel400));
			return Row;
		}
		for (const EUCCurrency Currency : { EUCCurrency::Credits, EUCCurrency::Premium })
		{
			UVerticalBox* Pill = Tree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
			Pill->AddChild(Text(Tree, CurrencyName(Currency), 12, Muted));
			Pill->AddChild(Text(Tree, FText::AsNumber(Profile->GetBalance(Currency)), 26, Currency == EUCCurrency::Credits ? PlayerAmber : White));
			UHorizontalBoxSlot* Slot = Cast<UHorizontalBoxSlot>(Row->AddChild(Pill));
			Slot->SetPadding(FMargin(0.f, 0.f, 28.f, 0.f));
		}
		return Row;
	}

	UImage* IconImage(UWidgetTree* Tree, const TSoftObjectPtr<UTexture2D>& Icon)
	{
		UImage* Image = Tree->ConstructWidget<UImage>(UImage::StaticClass());
		Image->SetBrushFromSoftTexture(Icon, false);
		Image->SetVisibility(ESlateVisibility::HitTestInvisible);
		return Image;
	}

	/** Placeholder shown where artwork is missing: says so in words (never a fake render). */
	UWidget* NoPreview(UWidgetTree* Tree)
	{
		UBorder* Box = Tree->ConstructWidget<UBorder>(UBorder::StaticClass());
		Box->SetBrush(Brush(Alpha(Graphite950, 0.6f), Steel700));
		Box->SetHorizontalAlignment(HAlign_Center);
		Box->SetVerticalAlignment(VAlign_Center);
		Box->SetVisibility(ESlateVisibility::HitTestInvisible);
		Box->SetContent(Text(Tree, Str(TEXT("GARAGE.State.NoPreview")), 16, Steel400, ETextJustify::Center));
		return Box;
	}

	void PlaceAnchored(UCanvasPanel* Canvas, UWidget* Widget, bool bRight, float X, float Y, float W, float H)
	{
		UCanvasPanelSlot* Slot = Canvas->AddChildToCanvas(Widget);
		Slot->SetAnchors(FAnchors(bRight ? 1.f : 0.f, 0.f));
		Slot->SetAlignment(FVector2D::ZeroVector);
		Slot->SetPosition(FVector2D(bRight ? X - RefW : X, Y));
		Slot->SetSize(FVector2D(W, H));
	}

	/** Stretches horizontally between two reference margins, fixed height. Wide phones gain width here. */
	void PlaceStretchX(UCanvasPanel* Canvas, UWidget* Widget, float Left, float Y, float RightMargin, float H)
	{
		UCanvasPanelSlot* Slot = Canvas->AddChildToCanvas(Widget);
		Slot->SetAnchors(FAnchors(0.f, 0.f, 1.f, 0.f));
		Slot->SetOffsets(FMargin(Left, Y, RightMargin, H));
	}
}

// ---------------------------------------------------------------- shell

TSharedRef<SWidget> UUCFrontEndWidget::RebuildWidget()
{
	if (!bBuilt && WidgetTree != nullptr)
	{
		bBuilt = true;
		SetIsFocusable(true);
		USafeZone* Safe = WidgetTree->ConstructWidget<USafeZone>(USafeZone::StaticClass());
		WidgetTree->RootWidget = Safe;
		Root = WidgetTree->ConstructWidget<UCanvasPanel>(UCanvasPanel::StaticClass());
		Safe->AddChild(Root);

		// Background: solid graphite until the hangar artwork (Menu_Hangar_Background_*) is delivered.
		UBorder* Background = WidgetTree->ConstructWidget<UBorder>(UBorder::StaticClass());
		Background->SetBrush(Brush(Graphite950, Graphite950, 0.f, 0.f));
		Background->SetVisibility(ESlateVisibility::HitTestInvisible);
		Fill(Root, Background);

		ScreenHost = WidgetTree->ConstructWidget<UOverlay>(UOverlay::StaticClass());
		Fill(Root, ScreenHost);

		ToastBox = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
		ToastBox->SetVisibility(ESlateVisibility::HitTestInvisible);   // toasts never block input
		UCanvasPanelSlot* ToastSlot = Root->AddChildToCanvas(ToastBox);
		ToastSlot->SetAnchors(FAnchors(0.5f, 1.f));
		ToastSlot->SetAlignment(FVector2D(0.5, 1.0));
		ToastSlot->SetPosition(FVector2D(0.0, -130.0));
		ToastSlot->SetAutoSize(true);

		ModalLayer = WidgetTree->ConstructWidget<UBorder>(UBorder::StaticClass());
		ModalLayer->SetBrush(Brush(Alpha(Graphite950, 0.75f), Alpha(Graphite950, 0.f), 0.f, 0.f));
		ModalLayer->SetHorizontalAlignment(HAlign_Center);
		ModalLayer->SetVerticalAlignment(VAlign_Center);
		ModalLayer->SetVisibility(ESlateVisibility::Collapsed);
		Fill(Root, ModalLayer);

		LoadingCover = WidgetTree->ConstructWidget<UBorder>(UBorder::StaticClass());
		LoadingCover->SetBrush(Brush(Graphite950, Graphite950, 0.f, 0.f));
		LoadingCover->SetHorizontalAlignment(HAlign_Center);
		LoadingCover->SetVerticalAlignment(VAlign_Center);
		LoadingCover->SetVisibility(ESlateVisibility::Collapsed);
		Fill(Root, LoadingCover);

		WipeCover = WidgetTree->ConstructWidget<UBorder>(UBorder::StaticClass());
		WipeCover->SetBrush(Brush(Graphite950, Graphite950, 0.f, 0.f));
		WipeCover->SetVisibility(ESlateVisibility::HitTestInvisible); // decoration never blocks input
		WipeCover->SetRenderOpacity(0.f);
		Fill(Root, WipeCover);

		WipeLine = WidgetTree->ConstructWidget<UBorder>(UBorder::StaticClass());
		WipeLine->SetBrush(Brush(PlayerAmber, PlayerAmber, 0.f, 0.f));
		WipeLine->SetVisibility(ESlateVisibility::HitTestInvisible);
		WipeLine->SetRenderOpacity(0.f);
		UCanvasPanelSlot* LineSlot = Root->AddChildToCanvas(WipeLine);
		LineSlot->SetAnchors(FAnchors(0.f, 0.f, 0.f, 1.f));
		LineSlot->SetOffsets(FMargin(0.f, 0.f, 4.f, 0.f));
	}
	return Super::RebuildWidget();
}

void UUCFrontEndWidget::ShowScreen(EScreen Screen)
{
	UUCScreenWidget* Widget = nullptr;
	switch (Screen)
	{
	case EScreen::Menu: Widget = CreateWidget<UUCMenuScreen>(GetOwningPlayer(), UUCMenuScreen::StaticClass()); break;
	case EScreen::Garage: Widget = CreateWidget<UUCGarageScreen>(GetOwningPlayer(), UUCGarageScreen::StaticClass()); break;
	case EScreen::Store: Widget = CreateWidget<UUCStoreScreen>(GetOwningPlayer(), UUCStoreScreen::StaticClass()); break;
	case EScreen::Missions: Widget = CreateWidget<UUCMissionScreen>(GetOwningPlayer(), UUCMissionScreen::StaticClass()); break;
	}
	if (Widget == nullptr)
	{
		return;
	}
	Widget->SetShell(this);
	ScreenHost->ClearChildren();
	UOverlaySlot* Slot = ScreenHost->AddChildToOverlay(Widget);
	Slot->SetHorizontalAlignment(HAlign_Fill);
	Slot->SetVerticalAlignment(VAlign_Fill);
	CurrentScreen = Widget;
}

void UUCFrontEndWidget::Open(EScreen Screen)
{
	if (Stack.Num() > 0 && Stack.Last() == Screen)
	{
		return;
	}
	Stack.Add(Screen);
	StartTransition([this, Screen]() { ShowScreen(Screen); });
}

void UUCFrontEndWidget::OpenMissions(EMissionFilter Filter)
{
	Stack.Add(EScreen::Missions);
	StartTransition([this, Filter]()
	{
		ShowScreen(EScreen::Missions);
		if (UUCMissionScreen* Screen = Cast<UUCMissionScreen>(CurrentScreen))
		{
			Screen->SetFilter(Filter);
		}
	});
}

void UUCFrontEndWidget::Back()
{
	if (Stack.Num() > 1)
	{
		Stack.Pop();
		const EScreen Previous = Stack.Last();
		StartTransition([this, Previous]() { ShowScreen(Previous); });
	}
}

bool UUCFrontEndWidget::HandleBack()
{
	if (ModalLayer->GetVisibility() != ESlateVisibility::Collapsed)
	{
		CloseModal();
		return true;
	}
	if (Stack.Num() > 1)
	{
		Back();
		return true;
	}
	// Root: confirm before leaving the game.
	ShowModal(Str(TEXT("MENU.Exit.Title")), FText::GetEmpty(), Str(TEXT("MENU.Exit.Confirm")), Str(TEXT("MENU.Exit.Cancel")), [this]()
	{
		UKismetSystemLibrary::QuitGame(this, GetOwningPlayer(), EQuitPreference::Quit, false);
	}, /*bDestructive*/ true);
	return true;
}

FReply UUCFrontEndWidget::NativeOnKeyDown(const FGeometry& InGeometry, const FKeyEvent& InKeyEvent)
{
	if (InKeyEvent.GetKey() == EKeys::Android_Back || InKeyEvent.GetKey() == EKeys::Escape)
	{
		return HandleBack() ? FReply::Handled() : FReply::Unhandled();
	}
	return Super::NativeOnKeyDown(InGeometry, InKeyEvent);
}

void UUCFrontEndWidget::ShowModal(const FText& Title, const FText& Body, const FText& ConfirmLabel, const FText& CancelLabel, TFunction<void()> OnConfirm, bool bDestructive)
{
	ModalConfirm = MoveTemp(OnConfirm);
	UBorder* Card = Panel(WidgetTree, PlayerAmber, true, FMargin(28.f, 22.f));
	USizeBox* Size = Sized(WidgetTree, Card, 560.f, 0.f);
	UVerticalBox* Stack2 = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
	Card->SetContent(Stack2);
	Stack2->AddChild(Text(WidgetTree, Title, 26, White));
	if (!Body.IsEmpty())
	{
		UTextBlock* BodyText = Text(WidgetTree, Body, 16, Muted);
		BodyText->SetAutoWrapText(true);
		AddPadded(Stack2, BodyText, FMargin(0.f, 10.f, 0.f, 0.f));
	}
	UHorizontalBox* Buttons = WidgetTree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());
	AddPadded(Stack2, Buttons, FMargin(0.f, 22.f, 0.f, 0.f));
	if (!CancelLabel.IsEmpty())
	{
		AddFill(Buttons, Sized(WidgetTree, Button(this, WidgetTree, CancelLabel, [this]() { CloseModal(); }, EButtonKind::Secondary), 0.f, 64.f), FMargin(0.f, 0.f, 8.f, 0.f));
	}
	AddFill(Buttons, Sized(WidgetTree, Button(this, WidgetTree, ConfirmLabel, [this]()
	{
		TFunction<void()> Run = MoveTemp(ModalConfirm);
		CloseModal();
		if (Run) { Run(); }
	}, bDestructive ? EButtonKind::Destructive : EButtonKind::Primary), 0.f, 64.f));
	ModalLayer->SetContent(Size);
	ModalLayer->SetVisibility(ESlateVisibility::Visible);   // blocks the screen behind; one modal at a time
}

void UUCFrontEndWidget::CloseModal()
{
	ModalLayer->SetVisibility(ESlateVisibility::Collapsed);
	ModalLayer->ClearChildren();
	ModalConfirm = nullptr;
}

void UUCFrontEndWidget::Toast(const FText& Message, UCTheme::ESeverity Severity)
{
	ToastBox->ClearChildren();
	UBorder* Card = Panel(WidgetTree, UCTheme::SeverityColor(Severity, PlayerAmber), false, FMargin(22.f, 12.f));
	Card->SetContent(Text(WidgetTree, Message, 18, White, ETextJustify::Center));
	ToastBox->AddChild(Card);
	ToastTimer = 2.6f;
}

void UUCFrontEndWidget::BeginLoading(const FText& Title, TFunction<void()> Launch)
{
	LoadingCover->ClearChildren();
	UVerticalBox* Box = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
	Box->AddChild(Text(WidgetTree, Title, 40, White, ETextJustify::Center));
	// Deliberately no percentage: the engine does not report map-load progress to the UI.
	Box->AddChild(Text(WidgetTree, Str(TEXT("CINE.Loading.Wait")), 18, Steel400, ETextJustify::Center));
	LoadingCover->SetContent(Box);
	LoadingCover->SetVisibility(ESlateVisibility::Visible);
	PendingMidpoint = MoveTemp(Launch);
	TransitionTime = -2.f;     // -2 = loading: run the launch after the cover has been drawn for two frames
}

void UUCFrontEndWidget::StartTransition(TFunction<void()> AtMidpoint)
{
	if (TransitionTime >= 0.f && PendingMidpoint && !bMidpointDone)
	{
		PendingMidpoint();     // a previous wipe has not reached its midpoint: finish its swap first
	}
	PendingMidpoint = MoveTemp(AtMidpoint);
	TransitionTime = 0.f;
	bMidpointDone = false;
}

void UUCFrontEndWidget::NativeTick(const FGeometry& MyGeometry, float InDeltaTime)
{
	Super::NativeTick(MyGeometry, InDeltaTime);

	if (Stack.Num() == 0)
	{
		Stack.Add(EScreen::Menu);
		ShowScreen(EScreen::Menu);
		SetKeyboardFocus();
	}

	if (ToastTimer > 0.f)
	{
		ToastTimer -= InDeltaTime;
		if (ToastTimer <= 0.f) { ToastBox->ClearChildren(); }
	}

	if (TransitionTime <= -2.f && TransitionTime > -3.f)
	{
		// Loading cover: give the cover two frames to appear, then run the launch (it may fail and return here).
		TransitionTime -= 0.34f;
		if (TransitionTime <= -3.f)
		{
			TransitionTime = -1.f;
			TFunction<void()> Launch = MoveTemp(PendingMidpoint);
			PendingMidpoint = nullptr;
			if (Launch) { Launch(); }
			if (LoadingCover->GetVisibility() != ESlateVisibility::Collapsed && ModalLayer->GetVisibility() == ESlateVisibility::Collapsed)
			{
				// The launch returns immediately on failure; on success the level change destroys this widget.
				LoadingCover->SetVisibility(ESlateVisibility::Collapsed);
			}
		}
		return;
	}

	if (TransitionTime < 0.f)
	{
		return;
	}
	TransitionTime += InDeltaTime;
	const float Total = WipeHalf * 2.f;
	float CoverAlpha = 0.f;
	if (TransitionTime < WipeHalf)
	{
		CoverAlpha = TransitionTime / WipeHalf;
	}
	else
	{
		if (!bMidpointDone)
		{
			bMidpointDone = true;
			TFunction<void()> Swap = MoveTemp(PendingMidpoint);
			PendingMidpoint = nullptr;
			if (Swap) { Swap(); }
		}
		CoverAlpha = FMath::Max(0.f, 1.f - (TransitionTime - WipeHalf) / WipeHalf);
	}
	const float Eased = 1.f - FMath::Square(1.f - FMath::Clamp(CoverAlpha, 0.f, 1.f));
	WipeCover->SetRenderOpacity(Eased);
	WipeLine->SetRenderOpacity(TransitionTime < Total ? 1.f : 0.f);
	WipeLine->SetRenderTranslation(FVector2D(RefW * FMath::Clamp(TransitionTime / Total, 0.f, 1.f), 0.0));
	if (TransitionTime >= Total)
	{
		TransitionTime = -1.f;
		WipeCover->SetRenderOpacity(0.f);
		WipeLine->SetRenderOpacity(0.f);
	}
}

// ---------------------------------------------------------------- screen base

UUCProfileSubsystem* UUCScreenWidget::GetProfile() const
{
	const UGameInstance* GameInstance = GetGameInstance();
	return GameInstance != nullptr ? GameInstance->GetSubsystem<UUCProfileSubsystem>() : nullptr;
}

UUCFrontEndSubsystem* UUCScreenWidget::GetFrontEnd() const
{
	const UGameInstance* GameInstance = GetGameInstance();
	return GameInstance != nullptr ? GameInstance->GetSubsystem<UUCFrontEndSubsystem>() : nullptr;
}

const UUCCatalog* UUCScreenWidget::GetCatalog() const
{
	const UUCProfileSubsystem* Profile = GetProfile();
	return Profile != nullptr ? Profile->GetCatalog() : nullptr;
}

void UUCScreenWidget::NativeConstruct()
{
	Super::NativeConstruct();
	if (UUCProfileSubsystem* Profile = GetProfile())
	{
		Profile->OnProfileChanged.AddUniqueDynamic(this, &UUCScreenWidget::HandleProfileChanged);
	}
	bDirty = true;
}

void UUCScreenWidget::NativeDestruct()
{
	if (UUCProfileSubsystem* Profile = GetProfile())
	{
		Profile->OnProfileChanged.RemoveAll(this);
	}
	Super::NativeDestruct();
}

void UUCScreenWidget::HandleProfileChanged(UUCProfileSubsystem*) { bDirty = true; }

void UUCScreenWidget::NativeTick(const FGeometry& MyGeometry, float InDeltaTime)
{
	Super::NativeTick(MyGeometry, InDeltaTime);
	if (bDirty)
	{
		bDirty = false;
		Refresh();     // event-driven: only after a profile change or a selection
	}
}

// ---------------------------------------------------------------- main menu (PH-MENU-001)

TSharedRef<SWidget> UUCMenuScreen::RebuildWidget()
{
	if (!bBuilt && WidgetTree != nullptr)
	{
		bBuilt = true;
		UCanvasPanel* Canvas = WidgetTree->ConstructWidget<UCanvasPanel>(UCanvasPanel::StaticClass());
		WidgetTree->RootWidget = Canvas;

		// Hero stage sits behind the play panel (the two regions overlap by 140 px in the spec).
		HeroHost = WidgetTree->ConstructWidget<UBorder>(UBorder::StaticClass());
		HeroHost->SetBrush(Brush(Alpha(Graphite900, 0.5f), Steel700));
		HeroHost->SetVisibility(ESlateVisibility::HitTestInvisible);
		PlaceStretchX(Canvas, HeroHost, 390.f, 180.f, 580.f, 650.f);

		UVerticalBox* Brand = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
		Brand->AddChild(Text(WidgetTree, Str(TEXT("MENU.Brand.Title")), 54, White));
		Brand->AddChild(Text(WidgetTree, Str(TEXT("MENU.Brand.Subtitle")), 16, PlayerAmber));
		PlaceAnchored(Canvas, Brand, false, 56.f, 36.f, 500.f, 110.f);

		ProfileHost = Panel(WidgetTree);
		PlaceAnchored(Canvas, ProfileHost, true, 1320.f, 32.f, 544.f, 104.f);
		CurrencyHost = Panel(WidgetTree);
		PlaceAnchored(Canvas, CurrencyHost, true, 1480.f, 148.f, 384.f, 64.f);

		// Navigation rail: only the four destinations the game supports (no settings, friends, events...).
		UVerticalBox* Rail = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
		TWeakObjectPtr<UUCFrontEndWidget> WeakShell = Shell;
		AddPadded(Rail, Sized(WidgetTree, Button(this, WidgetTree, Str(TEXT("MENU.Nav.Play")), []() {}, EButtonKind::Selected, true, 24), 0.f, 88.f), FMargin(0.f, 0.f, 0.f, 12.f));
		AddPadded(Rail, Sized(WidgetTree, Button(this, WidgetTree, Str(TEXT("MENU.Nav.Garage")), [WeakShell]() { if (UUCFrontEndWidget* S = WeakShell.Get()) { S->Open(UUCFrontEndWidget::EScreen::Garage); } }, EButtonKind::Secondary, true, 24), 0.f, 88.f), FMargin(0.f, 0.f, 0.f, 12.f));
		AddPadded(Rail, Sized(WidgetTree, Button(this, WidgetTree, Str(TEXT("MENU.Nav.Store")), [WeakShell]() { if (UUCFrontEndWidget* S = WeakShell.Get()) { S->Open(UUCFrontEndWidget::EScreen::Store); } }, EButtonKind::Secondary, true, 24), 0.f, 88.f), FMargin(0.f, 0.f, 0.f, 12.f));
		AddPadded(Rail, Sized(WidgetTree, Button(this, WidgetTree, Str(TEXT("MENU.Nav.Missions")), [WeakShell]() { if (UUCFrontEndWidget* S = WeakShell.Get()) { S->OpenMissions(EMissionFilter::All); } }, EButtonKind::Secondary, true, 24), 0.f, 88.f), FMargin(0.f, 0.f, 0.f, 12.f));
		PlaceAnchored(Canvas, Rail, false, 56.f, 220.f, 280.f, 720.f);

		UBorder* PlayPanel = Panel(WidgetTree);
		UVerticalBox* PlayStack = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
		PlayPanel->SetContent(PlayStack);
		ModeCards = WidgetTree->ConstructWidget<UWrapBox>(UWrapBox::StaticClass());
		ModeCards->SetInnerSlotPadding(FVector2D(12.0, 12.0));
		Cast<UVerticalBoxSlot>(PlayStack->AddChild(ModeCards))->SetSize(FSlateChildSize(ESlateSizeRule::Fill));
		PlayHost = WidgetTree->ConstructWidget<UBorder>(UBorder::StaticClass());
		PlayHost->SetVisibility(ESlateVisibility::SelfHitTestInvisible);
		PlayStack->AddChild(PlayHost);
		PlaceStretchX(Canvas, PlayPanel, 390.f, 690.f, 580.f, 300.f);

		VehicleHost = WidgetTree->ConstructWidget<UBorder>(UBorder::StaticClass());
		VehicleHost->SetVisibility(ESlateVisibility::SelfHitTestInvisible);
		PlaceAnchored(Canvas, VehicleHost, true, 1390.f, 690.f, 472.f, 250.f);

		// Version footer: shown because the project supplies a version string.
		const FString Version = GetDefault<UGeneralProjectSettings>()->ProjectVersion;
		if (!Version.IsEmpty())
		{
			PlaceAnchored(Canvas, Text(WidgetTree, FText::FromString(Version), 14, Steel400), false, 56.f, 1012.f, 500.f, 32.f);
		}
	}
	return Super::RebuildWidget();
}

void UUCMenuScreen::Refresh()
{
	RebuildProfile();
	RebuildModeCards();
	RebuildVehicleCard();
}

void UUCMenuScreen::RebuildProfile()
{
	const UUCProfileSubsystem* Profile = GetProfile();
	if (Profile == nullptr || !Profile->IsLoaded())
	{
		// No fabricated name, level or balances while the profile loads.
		ProfileHost->SetContent(Text(WidgetTree, Str(TEXT("MENU.State.Loading")), 18, Steel400));
		CurrencyHost->SetContent(Text(WidgetTree, FText::GetEmpty(), 12, Steel400));
		return;
	}
	UVerticalBox* Stack = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
	UHorizontalBox* Line = WidgetTree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());
	AddFill(Line, Text(WidgetTree, FText::FromString(Profile->GetDisplayName()), 26, White));
	Line->AddChild(Text(WidgetTree, FText::Format(FText::FromString(TEXT("{0} {1}")), Str(TEXT("MENU.Profile.Level")), FText::AsNumber(Profile->GetLevel())), 22, PlayerAmber, ETextJustify::Right));
	Stack->AddChild(Line);
	const int64 Needed = Profile->GetXpForNextLevel();
	if (Needed > 0)
	{
		const float Fraction = FMath::Clamp(static_cast<float>(Profile->GetXp()) / static_cast<float>(Needed), 0.f, 1.f);
		AddPadded(Stack, Sized(WidgetTree, Bar(WidgetTree, Fraction, PlayerAmber), 0.f, 8.f), FMargin(0.f, 8.f, 0.f, 2.f));
		Stack->AddChild(Text(WidgetTree, FText::Format(FText::FromString(TEXT("{0} {1} / {2}")), Str(TEXT("MENU.Profile.XP")), FText::AsNumber(Profile->GetXp()), FText::AsNumber(Needed)), 12, Muted));
	}
	ProfileHost->SetContent(Stack);
	CurrencyHost->SetContent(CurrencyStrip(WidgetTree, Profile));
}

void UUCMenuScreen::RebuildModeCards()
{
	ModeCards->ClearChildren();
	static const EUCMatchMode Modes[4] = { EUCMatchMode::FreeForAll, EUCMatchMode::TeamDeathmatch, EUCMatchMode::Mission, EUCMatchMode::BossHunt };
	static const TCHAR* TitleKeys[4] = { TEXT("MENU.Mode.FreeForAll"), TEXT("MENU.Mode.TeamDeathmatch"), TEXT("MENU.Mode.Mission"), TEXT("MENU.Mode.BossHunt") };
	static const TCHAR* DescKeys[4] = { TEXT("MENU.ModeDesc.FreeForAll"), TEXT("MENU.ModeDesc.TeamDeathmatch"), TEXT("MENU.ModeDesc.Mission"), TEXT("MENU.ModeDesc.BossHunt") };
	for (int32 Index = 0; Index < 4; ++Index)
	{
		const EUCMatchMode Mode = Modes[Index];
		UButton* Card = Button(this, WidgetTree, FText::GetEmpty(), [this, Mode]() { SelectedMode = Mode; MarkDirty(); },
			Mode == SelectedMode ? EButtonKind::Selected : EButtonKind::Secondary);
		Card->ClearChildren();
		UVerticalBox* Content = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
		Content->AddChild(Text(WidgetTree, Str(TitleKeys[Index]), 20, Mode == SelectedMode ? PlayerAmber : White));
		UTextBlock* Description = Text(WidgetTree, Str(DescKeys[Index]), 13, Muted);
		Description->SetAutoWrapText(true);
		AddPadded(Content, Description, FMargin(0.f, 4.f));
		Content->AddChild(Text(WidgetTree, Str(TEXT("MENU.Action.Select")), 13, Mode == SelectedMode ? PlayerAmber : Steel400));
		Card->AddChild(Content);
		UWrapBoxSlot* Slot = ModeCards->AddChildToWrapBox(Sized(WidgetTree, Card, 215.f, 140.f));
		Slot->SetFillEmptySpace(false);
	}

	// Play: missions go to Mission Select; the other two modes launch through the front-end subsystem.
	const UUCFrontEndSubsystem* FrontEnd = GetFrontEnd();
	const bool bMissionMode = SelectedMode == EUCMatchMode::Mission || SelectedMode == EUCMatchMode::BossHunt;
	const bool bCanPlay = bMissionMode || (FrontEnd != nullptr && FrontEnd->CanLaunchMode(SelectedMode));
	UHorizontalBox* PlayRow = WidgetTree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());
	AddFill(PlayRow, bCanPlay ? static_cast<UWidget*>(Text(WidgetTree, FText::GetEmpty(), 12, Steel400)) : Text(WidgetTree, Str(TEXT("MENU.State.Unavailable")), 14, WarningYellow));
	PlayRow->AddChild(Sized(WidgetTree, Button(this, WidgetTree, Str(TEXT("MENU.Action.Play")), [this]() { OnPlayPressed(); }, EButtonKind::Primary, bCanPlay, 24), 260.f, 72.f));
	PlayHost->SetContent(PlayRow);
}

void UUCMenuScreen::OnPlayPressed()
{
	UUCFrontEndWidget* S = Shell.Get();
	UUCFrontEndSubsystem* FrontEnd = GetFrontEnd();
	if (S == nullptr || FrontEnd == nullptr)
	{
		return;
	}
	if (SelectedMode == EUCMatchMode::Mission || SelectedMode == EUCMatchMode::BossHunt)
	{
		S->OpenMissions(SelectedMode == EUCMatchMode::BossHunt ? EMissionFilter::BossHunt : EMissionFilter::Missions);
		return;
	}
	const EUCMatchMode Mode = SelectedMode;
	TWeakObjectPtr<UUCFrontEndSubsystem> WeakFrontEnd = FrontEnd;
	TWeakObjectPtr<UUCFrontEndWidget> WeakShell = S;
	S->BeginLoading(Str(TEXT("CINE.Loading.Title")), [WeakFrontEnd, WeakShell, Mode]()
	{
		if (UUCFrontEndSubsystem* F = WeakFrontEnd.Get())
		{
			if (!F->LaunchMode(Mode))
			{
				if (UUCFrontEndWidget* Shell2 = WeakShell.Get()) { Shell2->Toast(UCStrings::Get(TEXT("MENU.State.Unavailable")), UCTheme::ESeverity::Warning); }
			}
		}
	});
}

void UUCMenuScreen::RebuildVehicleCard()
{
	const UUCProfileSubsystem* Profile = GetProfile();
	const UUCCatalog* Catalog = GetCatalog();
	TWeakObjectPtr<UUCFrontEndWidget> WeakShell = Shell;
	const FName Equipped = Profile != nullptr && Profile->IsLoaded() ? Profile->GetEquippedItem(EUCLoadoutSlot::Vehicle) : FName();
	const FUCCatalogEntry* Entry = (Catalog != nullptr && !Equipped.IsNone()) ? Catalog->FindEntry(Equipped) : nullptr;

	UButton* Card = Button(this, WidgetTree, FText::GetEmpty(), [WeakShell]() { if (UUCFrontEndWidget* S = WeakShell.Get()) { S->Open(UUCFrontEndWidget::EScreen::Garage); } }, EButtonKind::Secondary);
	Card->ClearChildren();
	UVerticalBox* Content = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
	if (Entry != nullptr)
	{
		Content->AddChild(Text(WidgetTree, Str(TEXT("MENU.Vehicle.Equipped")), 13, Muted));
		Content->AddChild(Text(WidgetTree, ItemName(*Entry), 28, White));
		// Shown as the profile's saved vehicle only; matches still use the mode's default vehicle (see Garage notice).
		AddPadded(Content, Text(WidgetTree, Str(TEXT("MENU.Nav.Garage")), 14, PlayerAmber), FMargin(0.f, 10.f, 0.f, 0.f));
	}
	else
	{
		Content->AddChild(Text(WidgetTree, Str(TEXT("MENU.Vehicle.Select")), 24, PlayerAmber));
	}
	Card->AddChild(Content);
	VehicleHost->SetContent(Sized(WidgetTree, Card, 0.f, 250.f));

	// Hero stage: vehicle artwork when the definition supplies an icon, otherwise an explicit unavailable state.
	if (Entry != nullptr)
	{
		const TSoftObjectPtr<UTexture2D> Icon = ItemIcon(*Entry);
		if (!Icon.IsNull())
		{
			UImage* Image = IconImage(WidgetTree, Icon);
			HeroHost->SetContent(Image);
			return;
		}
	}
	HeroHost->SetHorizontalAlignment(HAlign_Center);
	HeroHost->SetVerticalAlignment(VAlign_Center);
	HeroHost->SetContent(Text(WidgetTree, Str(TEXT("MENU.State.ContentMissing")), 18, Steel400, ETextJustify::Center));
}

// ---------------------------------------------------------------- garage (PH-GARAGE-001)

TSharedRef<SWidget> UUCGarageScreen::RebuildWidget()
{
	if (!bBuilt && WidgetTree != nullptr)
	{
		bBuilt = true;
		UCanvasPanel* Canvas = WidgetTree->ConstructWidget<UCanvasPanel>(UCanvasPanel::StaticClass());
		WidgetTree->RootWidget = Canvas;
		UVerticalBox* Page = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
		Fill(Canvas, Page, 40.f, 24.f, 40.f, 24.f);

		// Top strip (120): back, title, currencies.
		UHorizontalBox* Top = WidgetTree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());
		TWeakObjectPtr<UUCFrontEndWidget> WeakShell = Shell;
		Top->AddChild(Sized(WidgetTree, Button(this, WidgetTree, Str(TEXT("NAV.Back")), [WeakShell]() { if (UUCFrontEndWidget* S = WeakShell.Get()) { S->Back(); } }), 160.f, 72.f));
		UTextBlock* Title = Text(WidgetTree, Str(TEXT("GARAGE.Title")), 40, White);
		AddFill(Top, Title, FMargin(24.f, 10.f, 0.f, 0.f));
		CurrencyHost = Panel(WidgetTree);
		Top->AddChild(CurrencyHost);
		Cast<UVerticalBoxSlot>(Page->AddChild(Sized(WidgetTree, Top, 0.f, 96.f)))->SetPadding(FMargin(0.f, 0.f, 0.f, 12.f));

		// Body: 320 list column, preview, 480 detail.
		UHorizontalBox* Body = WidgetTree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());
		Cast<UVerticalBoxSlot>(Page->AddChild(Body))->SetSize(FSlateChildSize(ESlateSizeRule::Fill));

		UVerticalBox* Left = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
		CategoryBox = WidgetTree->ConstructWidget<UWrapBox>(UWrapBox::StaticClass());
		CategoryBox->SetInnerSlotPadding(FVector2D(6.0, 6.0));
		AddPadded(Left, CategoryBox, FMargin(0.f, 0.f, 0.f, 10.f));
		UScrollBox* Scroll = WidgetTree->ConstructWidget<UScrollBox>(UScrollBox::StaticClass());
		ItemList = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
		Scroll->AddChild(ItemList);
		Cast<UVerticalBoxSlot>(Left->AddChild(Scroll))->SetSize(FSlateChildSize(ESlateSizeRule::Fill));
		Body->AddChild(Sized(WidgetTree, Left, 320.f, 0.f));

		PreviewHost = WidgetTree->ConstructWidget<UBorder>(UBorder::StaticClass());
		PreviewHost->SetBrush(Brush(Alpha(Graphite900, 0.5f), Steel700));
		PreviewHost->SetPadding(FMargin(16.f));
		UHorizontalBoxSlot* PreviewSlot = Cast<UHorizontalBoxSlot>(Body->AddChild(PreviewHost));
		PreviewSlot->SetSize(FSlateChildSize(ESlateSizeRule::Fill));
		PreviewSlot->SetPadding(FMargin(16.f, 0.f));

		DetailHost = Panel(WidgetTree);
		Body->AddChild(Sized(WidgetTree, DetailHost, 480.f, 0.f));

		// Bottom strip (100): loadout summary and the standing notice.
		LoadoutHost = WidgetTree->ConstructWidget<UBorder>(UBorder::StaticClass());
		LoadoutHost->SetVisibility(ESlateVisibility::SelfHitTestInvisible);
		Cast<UVerticalBoxSlot>(Page->AddChild(Sized(WidgetTree, LoadoutHost, 0.f, 100.f)))->SetPadding(FMargin(0.f, 12.f, 0.f, 0.f));
	}
	return Super::RebuildWidget();
}

void UUCGarageScreen::Refresh()
{
	CurrencyHost->SetContent(CurrencyStrip(WidgetTree, GetProfile()));
	RebuildCategories();
	RebuildList();
	RebuildPreviewAndDetail();
	RebuildLoadout();
}

void UUCGarageScreen::RebuildCategories()
{
	CategoryBox->ClearChildren();
	static const TCHAR* Keys[4] = { TEXT("GARAGE.Category.Vehicles"), TEXT("GARAGE.Category.Weapons"), TEXT("GARAGE.Category.Upgrades"), TEXT("GARAGE.Category.Consumables") };
	for (int32 Index = 0; Index < 4; ++Index)
	{
		const EUCItemKind Kind = static_cast<EUCItemKind>(Index);
		UButton* Tab = Button(this, WidgetTree, Str(Keys[Index]), [this, Kind]() { Category = Kind; SelectedItem = NAME_None; MarkDirty(); },
			Kind == Category ? EButtonKind::Selected : EButtonKind::Secondary, true, 13);
		CategoryBox->AddChildToWrapBox(Sized(WidgetTree, Tab, 150.f, 52.f));
	}
}

void UUCGarageScreen::RebuildList()
{
	ItemList->ClearChildren();
	const UUCCatalog* Catalog = GetCatalog();
	const UUCProfileSubsystem* Profile = GetProfile();
	bool bAny = false;
	if (Catalog != nullptr && Profile != nullptr && Profile->IsLoaded())
	{
		for (const FUCCatalogEntry& Entry : Catalog->Items)
		{
			if (Entry.Kind != Category) { continue; }
			bAny = true;
			if (SelectedItem.IsNone()) { SelectedItem = Entry.ItemId; }
			const FName Id = Entry.ItemId;
			const bool bOwned = Profile->OwnsItem(Id);
			const EUCLoadoutSlot Slots[3] = { EUCLoadoutSlot::Vehicle, EUCLoadoutSlot::PrimaryWeapon, EUCLoadoutSlot::SecondaryWeapon };
			bool bEquipped = false;
			for (const EUCLoadoutSlot Slot : Slots) { bEquipped = bEquipped || Profile->GetEquippedItem(Slot) == Id; }
			UButton* Row = Button(this, WidgetTree, FText::GetEmpty(), [this, Id]() { SelectedItem = Id; MarkDirty(); }, Id == SelectedItem ? EButtonKind::Selected : EButtonKind::Secondary);
			Row->ClearChildren();
			UVerticalBox* Content = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
			Content->AddChild(Text(WidgetTree, ItemName(Entry), 18, White));
			Content->AddChild(Text(WidgetTree, bEquipped ? Str(TEXT("GARAGE.State.Equipped")) : (bOwned ? Str(TEXT("GARAGE.State.Owned")) : PriceText(Entry)), 13, bEquipped ? PlayerAmber : (bOwned ? HealthyGreen : Muted)));
			Row->AddChild(Content);
			AddPadded(ItemList, Sized(WidgetTree, Row, 0.f, 72.f), FMargin(0.f, 0.f, 0.f, 8.f));
		}
	}
	if (!bAny)
	{
		ItemList->AddChild(Text(WidgetTree, Str(TEXT("GARAGE.State.Empty")), 14, Steel400));
	}
}

void UUCGarageScreen::RebuildPreviewAndDetail()
{
	const UUCCatalog* Catalog = GetCatalog();
	UUCProfileSubsystem* Profile = GetProfile();
	const FUCCatalogEntry* Entry = (Catalog != nullptr && !SelectedItem.IsNone()) ? Catalog->FindEntry(SelectedItem) : nullptr;
	if (Entry == nullptr || Profile == nullptr || !Profile->IsLoaded())
	{
		PreviewHost->SetContent(NoPreview(WidgetTree));
		DetailHost->SetContent(Text(WidgetTree, FText::GetEmpty(), 12, Steel400));
		return;
	}
	const TSoftObjectPtr<UTexture2D> Icon = ItemIcon(*Entry);
	PreviewHost->SetContent(Icon.IsNull() ? NoPreview(WidgetTree) : static_cast<UWidget*>(IconImage(WidgetTree, Icon)));

	const FName Id = Entry->ItemId;
	const bool bOwned = Profile->OwnsItem(Id);
	UVerticalBox* Box = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
	Box->AddChild(Text(WidgetTree, ItemName(*Entry), 30, White));
	Box->AddChild(Text(WidgetTree, KindName(Entry->Kind), 14, Muted));
	AddPadded(Box, Text(WidgetTree, FText::Format(FText::FromString(TEXT("{0}: {1}")), Str(TEXT("GARAGE.Detail.Price")), PriceText(*Entry)), 18, White), FMargin(0.f, 14.f, 0.f, 0.f));
	Box->AddChild(Text(WidgetTree, FText::Format(FText::FromString(TEXT("{0}: {1}")), Str(TEXT("GARAGE.Detail.RequiredLevel")), FText::AsNumber(Entry->RequiredLevel)), 18, Profile->GetLevel() >= Entry->RequiredLevel ? White : WarningYellow));
	if (bOwned)
	{
		AddPadded(Box, Text(WidgetTree, Str(TEXT("GARAGE.State.Owned")), 18, HealthyGreen), FMargin(0.f, 8.f, 0.f, 0.f));
	}

	TWeakObjectPtr<UUCFrontEndWidget> WeakShell = Shell;
	auto Equip = [this, Id, WeakShell](EUCLoadoutSlot Slot)
	{
		UUCProfileSubsystem* P = GetProfile();
		if (P == nullptr) { return; }
		const EUCTransactionResult Result = P->EquipItem(Slot, Id);
		// Success is reported only when the profile now really holds the item in that slot.
		const bool bConfirmed = IsSuccess(Result) && P->GetEquippedItem(Slot) == Id;
		if (UUCFrontEndWidget* S = WeakShell.Get()) { S->Toast(bConfirmed ? UCStrings::Get(TEXT("TX.Ok")) : TransactionText(Result), bConfirmed ? UCTheme::ESeverity::Normal : UCTheme::ESeverity::Warning); }
	};
	if (bOwned && Entry->Kind == EUCItemKind::Vehicle)
	{
		AddPadded(Box, Sized(WidgetTree, Button(this, WidgetTree, Str(TEXT("GARAGE.Action.Equip")), [Equip]() { Equip(EUCLoadoutSlot::Vehicle); }, EButtonKind::Primary, true, 20), 0.f, 72.f), FMargin(0.f, 20.f, 0.f, 0.f));
	}
	else if (bOwned && Entry->Kind == EUCItemKind::Weapon)
	{
		const EUCLoadoutSlot Slots[2] = { EUCLoadoutSlot::PrimaryWeapon, EUCLoadoutSlot::SecondaryWeapon };
		static const TCHAR* SlotKeys[2] = { TEXT("GARAGE.Slot.PrimaryWeapon"), TEXT("GARAGE.Slot.SecondaryWeapon") };
		for (int32 Index = 0; Index < 2; ++Index)
		{
			const EUCLoadoutSlot Slot = Slots[Index];
			AddPadded(Box, Sized(WidgetTree, Button(this, WidgetTree, FText::Format(FText::FromString(TEXT("{0}: {1}")), Str(TEXT("GARAGE.Action.Equip")), Str(SlotKeys[Index])), [Equip, Slot]() { Equip(Slot); }, EButtonKind::Primary, true, 16), 0.f, 64.f), FMargin(0.f, Index == 0 ? 20.f : 8.f, 0.f, 0.f));
		}
	}
	const bool bStackable = Entry->Kind == EUCItemKind::Consumable;
	if (!bOwned || bStackable)
	{
		const bool bLevelOk = Profile->GetLevel() >= Entry->RequiredLevel;
		const bool bFunds = Profile->GetBalance(Entry->Currency) >= Entry->Price;
		const FText Label = !bLevelOk ? Str(TEXT("GARAGE.Action.LevelLocked")) : (!bFunds ? Str(TEXT("GARAGE.Action.InsufficientFunds")) : Str(TEXT("GARAGE.Action.Purchase")));
		AddPadded(Box, Sized(WidgetTree, Button(this, WidgetTree, Label, [this, Id, WeakShell]()
		{
			UUCProfileSubsystem* P = GetProfile();
			if (P == nullptr) { return; }
			const EUCTransactionResult Result = P->PurchaseItem(Id);   // the profile decides; the UI never does the arithmetic
			if (UUCFrontEndWidget* S = WeakShell.Get()) { S->Toast(IsSuccess(Result) ? UCStrings::Get(TEXT("STORE.Result.Success")) : TransactionText(Result), IsSuccess(Result) ? UCTheme::ESeverity::Normal : UCTheme::ESeverity::Warning); }
		}, EButtonKind::Primary, bLevelOk && bFunds, 20), 0.f, 72.f), FMargin(0.f, 20.f, 0.f, 0.f));
	}
	DetailHost->SetContent(Box);
}

void UUCGarageScreen::RebuildLoadout()
{
	const UUCProfileSubsystem* Profile = GetProfile();
	const UUCCatalog* Catalog = GetCatalog();
	UVerticalBox* Box = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
	UHorizontalBox* Slots = WidgetTree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());
	static const TCHAR* Keys[3] = { TEXT("GARAGE.Slot.Vehicle"), TEXT("GARAGE.Slot.PrimaryWeapon"), TEXT("GARAGE.Slot.SecondaryWeapon") };
	for (int32 Index = 0; Index < 3; ++Index)
	{
		UBorder* Card = Panel(WidgetTree, Steel700, false, FMargin(14.f, 6.f));
		UVerticalBox* Content = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
		Content->AddChild(Text(WidgetTree, Str(Keys[Index]), 12, Muted));
		FText Value = FText::FromString(TEXT("-"));      // neutral dash: nothing equipped
		if (Profile != nullptr && Profile->IsLoaded() && Catalog != nullptr)
		{
			const FName Equipped = Profile->GetEquippedItem(static_cast<EUCLoadoutSlot>(Index));
			if (const FUCCatalogEntry* Entry = Equipped.IsNone() ? nullptr : Catalog->FindEntry(Equipped)) { Value = ItemName(*Entry); }
		}
		Content->AddChild(Text(WidgetTree, Value, 18, White));
		Card->SetContent(Content);
		AddFill(Slots, Card, FMargin(0.f, 0.f, 8.f, 0.f));
	}
	Box->AddChild(Slots);
	// Standing notice: stays until the game mode resolves each player's owned loadout (roadmap gap).
	Box->AddChild(Text(WidgetTree, Str(TEXT("GARAGE.Warning.LoadoutNotUsedInMatch")), 14, WarningYellow));
	LoadoutHost->SetContent(Box);
}

// ---------------------------------------------------------------- store (PH-STORE-001)

TSharedRef<SWidget> UUCStoreScreen::RebuildWidget()
{
	if (!bBuilt && WidgetTree != nullptr)
	{
		bBuilt = true;
		UCanvasPanel* Canvas = WidgetTree->ConstructWidget<UCanvasPanel>(UCanvasPanel::StaticClass());
		WidgetTree->RootWidget = Canvas;
		UVerticalBox* Page = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
		Fill(Canvas, Page, 40.f, 24.f, 40.f, 24.f);

		UHorizontalBox* Top = WidgetTree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());
		TWeakObjectPtr<UUCFrontEndWidget> WeakShell = Shell;
		Top->AddChild(Sized(WidgetTree, Button(this, WidgetTree, Str(TEXT("NAV.Back")), [WeakShell]() { if (UUCFrontEndWidget* S = WeakShell.Get()) { S->Back(); } }), 160.f, 72.f));
		UVerticalBox* TitleBox = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
		TitleBox->AddChild(Text(WidgetTree, Str(TEXT("STORE.Title")), 40, White));
		// Honest about what this economy is: a local profile, not an online shop.
		TitleBox->AddChild(Text(WidgetTree, Str(TEXT("STORE.Warning.LocalEconomyOnly")), 13, WarningYellow));
		AddFill(Top, TitleBox, FMargin(24.f, 0.f, 0.f, 0.f));
		CurrencyHost = Panel(WidgetTree);
		Top->AddChild(CurrencyHost);
		Cast<UVerticalBoxSlot>(Page->AddChild(Sized(WidgetTree, Top, 0.f, 96.f)))->SetPadding(FMargin(0.f, 0.f, 0.f, 12.f));

		UHorizontalBox* Body = WidgetTree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());
		Cast<UVerticalBoxSlot>(Page->AddChild(Body))->SetSize(FSlateChildSize(ESlateSizeRule::Fill));
		FilterBox = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
		Body->AddChild(Sized(WidgetTree, FilterBox, 220.f, 0.f));
		UScrollBox* Scroll = WidgetTree->ConstructWidget<UScrollBox>(UScrollBox::StaticClass());
		Grid = WidgetTree->ConstructWidget<UWrapBox>(UWrapBox::StaticClass());
		Grid->SetInnerSlotPadding(FVector2D(24.0, 24.0));
		Scroll->AddChild(Grid);
		UHorizontalBoxSlot* GridSlot = Cast<UHorizontalBoxSlot>(Body->AddChild(Scroll));
		GridSlot->SetSize(FSlateChildSize(ESlateSizeRule::Fill));
		GridSlot->SetPadding(FMargin(20.f, 0.f));
		DetailHost = Panel(WidgetTree);
		Body->AddChild(Sized(WidgetTree, DetailHost, 440.f, 0.f));
	}
	return Super::RebuildWidget();
}

void UUCStoreScreen::Refresh()
{
	CurrencyHost->SetContent(CurrencyStrip(WidgetTree, GetProfile()));
	RebuildFilters();
	RebuildGrid();
	RebuildDetail();
}

void UUCStoreScreen::RebuildFilters()
{
	FilterBox->ClearChildren();
	static const TCHAR* Keys[5] = { TEXT("STORE.Filter.All"), TEXT("STORE.Filter.Vehicles"), TEXT("STORE.Filter.Weapons"), TEXT("STORE.Filter.Upgrades"), TEXT("STORE.Filter.Consumables") };
	for (int32 Index = 0; Index < 5; ++Index)
	{
		const int32 Value = Index - 1;
		AddPadded(FilterBox, Sized(WidgetTree, Button(this, WidgetTree, Str(Keys[Index]), [this, Value]() { Filter = Value; SelectedItem = NAME_None; MarkDirty(); },
			Value == Filter ? EButtonKind::Selected : EButtonKind::Secondary, true, 18), 0.f, 64.f), FMargin(0.f, 0.f, 0.f, 8.f));
	}
}

void UUCStoreScreen::RebuildGrid()
{
	Grid->ClearChildren();
	const UUCCatalog* Catalog = GetCatalog();
	const UUCProfileSubsystem* Profile = GetProfile();
	if (Catalog == nullptr || Profile == nullptr || !Profile->IsLoaded())
	{
		Grid->AddChildToWrapBox(Text(WidgetTree, Str(TEXT("MENU.State.Loading")), 16, Steel400));
		return;
	}
	for (const FUCCatalogEntry& Entry : Catalog->Items)
	{
		if (Filter >= 0 && static_cast<int32>(Entry.Kind) != Filter) { continue; }
		if (SelectedItem.IsNone()) { SelectedItem = Entry.ItemId; }
		const FName Id = Entry.ItemId;
		const bool bOwned = Profile->OwnsItem(Id);
		const bool bLocked = Profile->GetLevel() < Entry.RequiredLevel;
		UButton* Card = Button(this, WidgetTree, FText::GetEmpty(), [this, Id]() { SelectedItem = Id; MarkDirty(); }, Id == SelectedItem ? EButtonKind::Selected : EButtonKind::Secondary);
		Card->ClearChildren();
		UVerticalBox* Content = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
		const TSoftObjectPtr<UTexture2D> Icon = ItemIcon(Entry);
		Content->AddChild(Sized(WidgetTree, Icon.IsNull() ? NoPreview(WidgetTree) : static_cast<UWidget*>(IconImage(WidgetTree, Icon)), 0.f, 170.f));
		AddPadded(Content, Text(WidgetTree, ItemName(Entry), 20, White), FMargin(0.f, 10.f, 0.f, 0.f));
		Content->AddChild(Text(WidgetTree, KindName(Entry.Kind), 13, Muted));
		Content->AddChild(Text(WidgetTree, PriceText(Entry), 16, PlayerAmber));
		if (bOwned) { Content->AddChild(Text(WidgetTree, Str(TEXT("STORE.State.Owned")), 14, HealthyGreen)); }
		else if (bLocked) { Content->AddChild(Text(WidgetTree, FText::Format(FText::FromString(TEXT("{0} {1}")), Str(TEXT("STORE.State.Locked")), FText::AsNumber(Entry.RequiredLevel)), 14, WarningYellow)); }
		else if (Profile->GetBalance(Entry.Currency) < Entry.Price) { Content->AddChild(Text(WidgetTree, Str(TEXT("STORE.State.InsufficientFunds")), 14, Muted)); }
		Card->AddChild(Content);
		Grid->AddChildToWrapBox(Sized(WidgetTree, Card, 280.f, 340.f));
	}
}

void UUCStoreScreen::RebuildDetail()
{
	const UUCCatalog* Catalog = GetCatalog();
	UUCProfileSubsystem* Profile = GetProfile();
	const FUCCatalogEntry* Entry = (Catalog != nullptr && !SelectedItem.IsNone()) ? Catalog->FindEntry(SelectedItem) : nullptr;
	if (Entry == nullptr || Profile == nullptr || !Profile->IsLoaded())
	{
		DetailHost->SetContent(Text(WidgetTree, FText::GetEmpty(), 12, Steel400));
		return;
	}
	const FName Id = Entry->ItemId;
	const bool bOwned = Profile->OwnsItem(Id);
	const bool bStackable = Entry->Kind == EUCItemKind::Consumable;
	const bool bLevelOk = Profile->GetLevel() >= Entry->RequiredLevel;
	const bool bFunds = Profile->GetBalance(Entry->Currency) >= Entry->Price;
	TWeakObjectPtr<UUCFrontEndWidget> WeakShell = Shell;

	UVerticalBox* Box = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
	const TSoftObjectPtr<UTexture2D> Icon = ItemIcon(*Entry);
	Box->AddChild(Sized(WidgetTree, Icon.IsNull() ? NoPreview(WidgetTree) : static_cast<UWidget*>(IconImage(WidgetTree, Icon)), 0.f, 200.f));
	AddPadded(Box, Text(WidgetTree, ItemName(*Entry), 30, White), FMargin(0.f, 12.f, 0.f, 0.f));
	Box->AddChild(Text(WidgetTree, KindName(Entry->Kind), 14, Muted));
	AddPadded(Box, Text(WidgetTree, FText::Format(FText::FromString(TEXT("{0}: {1}")), Str(TEXT("STORE.Price")), PriceText(*Entry)), 18, White), FMargin(0.f, 12.f, 0.f, 0.f));
	Box->AddChild(Text(WidgetTree, FText::Format(FText::FromString(TEXT("{0}: {1}")), Str(TEXT("STORE.RequiredLevel")), FText::AsNumber(Entry->RequiredLevel)), 18, bLevelOk ? White : WarningYellow));
	if (bOwned) { Box->AddChild(Text(WidgetTree, Str(TEXT("STORE.State.Owned")), 18, HealthyGreen)); }

	if (!bOwned || bStackable)
	{
		const FText Label = !bLevelOk ? Str(TEXT("STORE.State.Locked")) : (!bFunds ? Str(TEXT("STORE.State.InsufficientFunds")) : Str(TEXT("STORE.Action.Purchase")));
		AddPadded(Box, Sized(WidgetTree, Button(this, WidgetTree, Label, [this, Id, WeakShell]()
		{
			UUCFrontEndWidget* S = WeakShell.Get();
			if (S == nullptr) { return; }
			S->ShowModal(Str(TEXT("STORE.Action.ConfirmPurchase")), FText::GetEmpty(), Str(TEXT("STORE.Action.Purchase")), Str(TEXT("STORE.Action.Cancel")), [this, Id, WeakShell]()
			{
				UUCProfileSubsystem* P = GetProfile();
				UUCFrontEndWidget* S2 = WeakShell.Get();
				if (P == nullptr || S2 == nullptr) { return; }
				const EUCTransactionResult Result = P->PurchaseItem(Id);   // authoritative result of the local profile
				S2->ShowModal(Str(IsSuccess(Result) ? TEXT("STORE.Result.Success") : TEXT("STORE.Result.Failed")), TransactionText(Result), Str(TEXT("TX.Ok")), FText::GetEmpty(), nullptr);
			});
		}, EButtonKind::Primary, bLevelOk && bFunds, 20), 0.f, 72.f), FMargin(0.f, 20.f, 0.f, 0.f));
	}
	if (bOwned && Entry->Kind != EUCItemKind::Upgrade && Entry->Kind != EUCItemKind::Consumable)
	{
		AddPadded(Box, Sized(WidgetTree, Button(this, WidgetTree, Str(TEXT("STORE.Action.ViewInGarage")), [WeakShell]() { if (UUCFrontEndWidget* S = WeakShell.Get()) { S->Open(UUCFrontEndWidget::EScreen::Garage); } }), 0.f, 64.f), FMargin(0.f, 12.f, 0.f, 0.f));
	}
	DetailHost->SetContent(Box);
}

// ---------------------------------------------------------------- mission select (PH-MISSION-001)

TSharedRef<SWidget> UUCMissionScreen::RebuildWidget()
{
	if (!bBuilt && WidgetTree != nullptr)
	{
		bBuilt = true;
		UCanvasPanel* Canvas = WidgetTree->ConstructWidget<UCanvasPanel>(UCanvasPanel::StaticClass());
		WidgetTree->RootWidget = Canvas;
		UVerticalBox* Page = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
		Fill(Canvas, Page, 40.f, 24.f, 40.f, 24.f);

		UHorizontalBox* Top = WidgetTree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());
		TWeakObjectPtr<UUCFrontEndWidget> WeakShell = Shell;
		Top->AddChild(Sized(WidgetTree, Button(this, WidgetTree, Str(TEXT("NAV.Back")), [WeakShell]() { if (UUCFrontEndWidget* S = WeakShell.Get()) { S->Back(); } }), 160.f, 72.f));
		AddFill(Top, Text(WidgetTree, Str(TEXT("MISSION.Title")), 40, White), FMargin(24.f, 10.f, 0.f, 0.f));
		FilterBox = WidgetTree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());
		Top->AddChild(FilterBox);
		Cast<UVerticalBoxSlot>(Page->AddChild(Sized(WidgetTree, Top, 0.f, 96.f)))->SetPadding(FMargin(0.f, 0.f, 0.f, 12.f));

		UHorizontalBox* Body = WidgetTree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());
		Cast<UVerticalBoxSlot>(Page->AddChild(Body))->SetSize(FSlateChildSize(ESlateSizeRule::Fill));
		UScrollBox* Scroll = WidgetTree->ConstructWidget<UScrollBox>(UScrollBox::StaticClass());
		MissionList = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
		Scroll->AddChild(MissionList);
		UHorizontalBoxSlot* ListSlot = Cast<UHorizontalBoxSlot>(Body->AddChild(Scroll));
		ListSlot->SetSize(FSlateChildSize(ESlateSizeRule::Fill));
		ListSlot->SetPadding(FMargin(0.f, 0.f, 20.f, 0.f));
		DetailHost = Panel(WidgetTree);
		Body->AddChild(Sized(WidgetTree, DetailHost, 600.f, 0.f));
	}
	return Super::RebuildWidget();
}

void UUCMissionScreen::Refresh()
{
	RebuildFilters();
	RebuildList();
	RebuildDetail();
}

void UUCMissionScreen::RebuildFilters()
{
	FilterBox->ClearChildren();
	static const TCHAR* Keys[3] = { TEXT("MISSION.Filter.All"), TEXT("MISSION.Filter.Missions"), TEXT("MISSION.Filter.BossHunt") };
	for (int32 Index = 0; Index < 3; ++Index)
	{
		const EMissionFilter Value = static_cast<EMissionFilter>(Index);
		FilterBox->AddChild(Sized(WidgetTree, Button(this, WidgetTree, Str(Keys[Index]), [this, Value]() { Filter = Value; SelectedMission = NAME_None; MarkDirty(); },
			Value == Filter ? EButtonKind::Selected : EButtonKind::Secondary, true, 16), 200.f, 64.f));
	}
}

namespace
{
	FText MissionName(const UUCMissionDefinition* Mission) { return !Mission->DisplayName.IsEmpty() ? Mission->DisplayName : FText::FromName(Mission->MissionId); }

	bool PassesFilter(const UUCMissionDefinition* Mission, EMissionFilter Filter)
	{
		return Filter == EMissionFilter::All || (Filter == EMissionFilter::BossHunt ? Mission->Mode == EUCMatchMode::BossHunt : Mission->Mode == EUCMatchMode::Mission);
	}
}

void UUCMissionScreen::RebuildList()
{
	MissionList->ClearChildren();
	const UUCFrontEndSubsystem* FrontEnd = GetFrontEnd();
	const UUCProfileSubsystem* Profile = GetProfile();
	TArray<UUCMissionDefinition*> Missions;
	if (FrontEnd != nullptr) { FrontEnd->GetMissions(Missions); }
	bool bAny = false;
	for (const UUCMissionDefinition* Mission : Missions)
	{
		if (!PassesFilter(Mission, Filter)) { continue; }
		bAny = true;
		if (SelectedMission.IsNone()) { SelectedMission = Mission->MissionId; }
		const FName Id = Mission->MissionId;
		const bool bLocked = Profile != nullptr && Profile->IsLoaded() && Profile->GetLevel() < Mission->RequiredLevel;
		const bool bDone = Profile != nullptr && Profile->IsLoaded() && Profile->HasCompletedMission(Id);
		UButton* Card = Button(this, WidgetTree, FText::GetEmpty(), [this, Id]() { SelectedMission = Id; MarkDirty(); }, Id == SelectedMission ? EButtonKind::Selected : EButtonKind::Secondary);
		Card->ClearChildren();
		UVerticalBox* Content = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
		Content->AddChild(Text(WidgetTree, MissionName(Mission), 24, White));
		Content->AddChild(Text(WidgetTree, Str(Mission->Mode == EUCMatchMode::BossHunt ? TEXT("MENU.Mode.BossHunt") : TEXT("MENU.Mode.Mission")), 14, PlayerAmber));
		if (bDone) { Content->AddChild(Text(WidgetTree, Str(TEXT("MISSION.State.Completed")), 14, HealthyGreen)); }
		if (bLocked) { Content->AddChild(Text(WidgetTree, FText::Format(FText::FromString(TEXT("{0} {1}")), Str(TEXT("MISSION.State.Locked")), FText::AsNumber(Mission->RequiredLevel)), 14, WarningYellow)); }
		Card->AddChild(Content);
		AddPadded(MissionList, Sized(WidgetTree, Card, 0.f, 120.f), FMargin(0.f, 0.f, 0.f, 12.f));
	}
	if (!bAny)
	{
		MissionList->AddChild(Text(WidgetTree, Str(TEXT("MISSION.State.None")), 18, Steel400));
	}
}

void UUCMissionScreen::RebuildDetail()
{
	const UUCFrontEndSubsystem* FrontEnd = GetFrontEnd();
	UUCFrontEndSubsystem* MutableFrontEnd = GetFrontEnd();
	const UUCProfileSubsystem* Profile = GetProfile();
	UUCMissionDefinition* Mission = SelectedMission.IsNone() ? nullptr : UUCFrontEndSubsystem::FindMission(SelectedMission);
	if (Mission == nullptr || FrontEnd == nullptr)
	{
		DetailHost->SetContent(Text(WidgetTree, FText::GetEmpty(), 12, Steel400));
		return;
	}
	UVerticalBox* Box = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
	Box->AddChild(Text(WidgetTree, MissionName(Mission), 30, White));
	Box->AddChild(Text(WidgetTree, Str(Mission->Mode == EUCMatchMode::BossHunt ? TEXT("MENU.Mode.BossHunt") : TEXT("MENU.Mode.Mission")), 16, PlayerAmber));

	AddPadded(Box, Text(WidgetTree, Str(TEXT("MISSION.Detail.Objectives")), 14, Muted), FMargin(0.f, 14.f, 0.f, 4.f));
	static const TCHAR* TypeKeys[4] = { TEXT("MISSION.Objective.DestroyTargets"), TEXT("MISSION.Objective.DefeatBoss"), TEXT("MISSION.Objective.Survive"), TEXT("MISSION.Objective.ReachCheckpoints") };
	for (const FUCObjectiveDefinition& Objective : Mission->Objectives)
	{
		const FText Label = Objective.DisplayText.IsEmpty() ? Str(TypeKeys[FMath::Clamp(static_cast<int32>(Objective.Type), 0, 3)]) : Objective.DisplayText;
		FString Line = FString::Printf(TEXT("%s  x%d"), *Label.ToString(), Objective.Required);
		if (Objective.Type == EUCObjectiveType::Survive) { Line = FString::Printf(TEXT("%s  %ds"), *Label.ToString(), Objective.Required); }
		if (Objective.bOptional) { Line += TEXT("  [") + Str(TEXT("MISSION.Objective.Optional")).ToString() + TEXT("]"); }
		Box->AddChild(Text(WidgetTree, FText::FromString(Line), 16, Objective.bOptional ? Muted : White));
	}

	AddPadded(Box, Text(WidgetTree, Str(TEXT("MISSION.Detail.Enemies")), 14, Muted), FMargin(0.f, 14.f, 0.f, 4.f));
	for (const FUCEnemySpawn& Enemy : Mission->Enemies)
	{
		FText Name = FText::GetEmpty();
		if (Enemy.Vehicle != nullptr) { Name = !Enemy.Vehicle->DisplayName.IsEmpty() ? Enemy.Vehicle->DisplayName : FText::FromName(Enemy.Vehicle->VehicleId); }
		FString Line = FString::Printf(TEXT("%s  x%d"), *Name.ToString(), Enemy.Count);
		if (Enemy.bIsBoss) { Line += TEXT("  [") + Str(TEXT("HUD.Boss.Title")).ToString() + TEXT("]"); }
		Box->AddChild(Text(WidgetTree, FText::FromString(Line), 16, Enemy.bIsBoss ? PlayerAmber : White));
	}

	AddPadded(Box, Text(WidgetTree, Str(TEXT("MISSION.Detail.TimeLimit")), 14, Muted), FMargin(0.f, 14.f, 0.f, 0.f));
	Box->AddChild(Text(WidgetTree, Mission->TimeLimit <= 0.f ? Str(TEXT("MISSION.Time.Untimed")) : FText::FromString(FString::Printf(TEXT("%02d:%02d"), FMath::FloorToInt(Mission->TimeLimit) / 60, FMath::FloorToInt(Mission->TimeLimit) % 60)), 18, White));
	AddPadded(Box, Text(WidgetTree, Str(TEXT("MISSION.Detail.Lives")), 14, Muted), FMargin(0.f, 10.f, 0.f, 0.f));
	Box->AddChild(Text(WidgetTree, Mission->PlayerLives < 0 ? Str(TEXT("MISSION.Lives.Unlimited")) : FText::AsNumber(Mission->PlayerLives), 18, White));

	const bool bLoaded = Profile != nullptr && Profile->IsLoaded();
	const bool bLevelOk = bLoaded && Profile->GetLevel() >= Mission->RequiredLevel;
	AddPadded(Box, Text(WidgetTree, FText::Format(FText::FromString(TEXT("{0}: {1}")), Str(TEXT("MISSION.RequiredLevel")), FText::AsNumber(Mission->RequiredLevel)), 16, bLevelOk ? White : WarningYellow), FMargin(0.f, 10.f, 0.f, 0.f));
	if (bLoaded && Profile->HasCompletedMission(Mission->MissionId)) { Box->AddChild(Text(WidgetTree, Str(TEXT("MISSION.State.Completed")), 16, HealthyGreen)); }

	const bool bCanLaunch = MutableFrontEnd->CanLaunchMission(Mission);
	const FText Label = !bLevelOk ? Str(TEXT("MISSION.State.Locked")) : (!bCanLaunch ? Str(TEXT("MISSION.State.Unavailable")) : Str(TEXT("MISSION.Action.Launch")));
	TWeakObjectPtr<UUCFrontEndWidget> WeakShell = Shell;
	TWeakObjectPtr<UUCFrontEndSubsystem> WeakFrontEnd = MutableFrontEnd;
	TWeakObjectPtr<UUCMissionDefinition> WeakMission = Mission;
	AddPadded(Box, Sized(WidgetTree, Button(this, WidgetTree, Label, [WeakShell, WeakFrontEnd, WeakMission]()
	{
		UUCFrontEndWidget* S = WeakShell.Get();
		if (S == nullptr) { return; }
		S->BeginLoading(UCStrings::Get(TEXT("CINE.Loading.Title")), [WeakShell, WeakFrontEnd, WeakMission]()
		{
			UUCFrontEndSubsystem* F = WeakFrontEnd.Get();
			UUCMissionDefinition* M = WeakMission.Get();
			if (F == nullptr || M == nullptr || !F->LaunchMission(M))
			{
				if (UUCFrontEndWidget* S2 = WeakShell.Get()) { S2->Toast(UCStrings::Get(TEXT("MISSION.State.Unavailable")), UCTheme::ESeverity::Warning); }
			}
		});
	}, EButtonKind::Primary, bCanLaunch, 22), 0.f, 76.f), FMargin(0.f, 20.f, 0.f, 0.f));
	DetailHost->SetContent(Box);
}
