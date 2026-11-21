#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "UCTouchWidgets.generated.h"

class UBorder;
class UCanvasPanel;
class UProgressBar;
class UTextBlock;
class AUCVehiclePawn;

DECLARE_DELEGATE_OneParam(FUCTouchHeldSignature, bool /*bHeld*/);
DECLARE_DELEGATE_TwoParams(FUCTouchStickSignature, float /*Steer*/, float /*Throttle*/);

/**
 * PH-TOUCH-001 round touch target (handbrake, fire, reload, abilities).
 * The hit rectangle is the full widget size; the visible face is smaller (spec 2.3).
 * Each instance tracks its own finger, so several buttons work at once.
 */
UCLASS()
class UNREALCOMBAT_API UUCTouchButton : public UUserWidget
{
	GENERATED_BODY()

public:
	/** Called on press (true) and release / cancel (false). Hold-type controls act on both; tap controls on true only. */
	FUCTouchHeldSignature OnHeldChanged;

	/** Build the visuals. HitSize = target diameter, FaceSize = visible face diameter. */
	void Configure(const FText& Label, float HitSize, float FaceSize);

	/** Visual-only states. Input is still delivered; the game decides validity. */
	void SetUnavailable(bool bUnavailable);
	void SetActive(bool bActive);
	void SetReady(bool bReady);
	/** 0..1 progress bar under the label; negative hides it. */
	void SetProgress(float Progress01);
	void SetCountText(const FText& Text);

	/** Release if held, e.g. when the owning pawn changes or the widget is removed. */
	void ForceRelease();

protected:
	virtual TSharedRef<SWidget> RebuildWidget() override;
	virtual void NativeDestruct() override;
	virtual FReply NativeOnTouchStarted(const FGeometry& InGeometry, const FPointerEvent& InGestureEvent) override;
	virtual FReply NativeOnTouchMoved(const FGeometry& InGeometry, const FPointerEvent& InGestureEvent) override;
	virtual FReply NativeOnTouchEnded(const FGeometry& InGeometry, const FPointerEvent& InGestureEvent) override;
	virtual void NativeOnMouseCaptureLost(const FCaptureLostEvent& CaptureLostEvent) override;

private:
	void SetPressed(bool bPressed);
	void RefreshVisual();

	UPROPERTY() TObjectPtr<UBorder> Face;
	UPROPERTY() TObjectPtr<UTextBlock> LabelText;
	UPROPERTY() TObjectPtr<UTextBlock> CountLabel;
	UPROPERTY() TObjectPtr<UProgressBar> ProgressBar;
	UPROPERTY() TObjectPtr<UTextBlock> ReadyMark;

	FText LabelValue;
	float HitSizeValue = 100.f;
	float FaceSizeValue = 90.f;
	int32 PointerIndex = INDEX_NONE;
	bool bIsPressed = false;
	bool bIsUnavailable = false;
	bool bIsActive = false;
	bool bIsReady = false;
	bool bBuilt = false;
};

/** PH-TOUCH-001-LPAD: fixed virtual driving pad. Horizontal = steer, vertical = throttle (up forward, down reverse). */
UCLASS()
class UNREALCOMBAT_API UUCTouchStick : public UUserWidget
{
	GENERATED_BODY()

public:
	FUCTouchStickSignature OnStickChanged;

	/** RegionSize = active (hit) area; the base ring is centred in it. */
	void Configure(const FVector2D& RegionSize, float BaseDiameter, float KnobDiameter);

	/** Immediately neutral, no animation (focus loss, pawn change). */
	void ForceNeutral();

	virtual void NativeTick(const FGeometry& MyGeometry, float InDeltaTime) override;

protected:
	virtual TSharedRef<SWidget> RebuildWidget() override;
	virtual void NativeDestruct() override;
	virtual FReply NativeOnTouchStarted(const FGeometry& InGeometry, const FPointerEvent& InGestureEvent) override;
	virtual FReply NativeOnTouchMoved(const FGeometry& InGeometry, const FPointerEvent& InGestureEvent) override;
	virtual FReply NativeOnTouchEnded(const FGeometry& InGeometry, const FPointerEvent& InGestureEvent) override;
	virtual void NativeOnMouseCaptureLost(const FCaptureLostEvent& CaptureLostEvent) override;

private:
	void UpdateFromTouch(const FGeometry& Geometry, const FPointerEvent& Event);
	void Release();
	void Apply(const FVector2D& Normalised);
	void RefreshVisual();

	UPROPERTY() TObjectPtr<UBorder> Base;
	UPROPERTY() TObjectPtr<UBorder> Knob;
	UPROPERTY() TObjectPtr<UCanvasPanel> Canvas;

	FVector2D Region = FVector2D(360.0, 380.0);
	float BaseDiameterValue = 300.f;
	float KnobDiameterValue = 112.f;
	FVector2D Value = FVector2D::ZeroVector;      // normalised -1..1, x steer, y up-positive throttle
	FVector2D ReleaseFrom = FVector2D::ZeroVector;
	float ReleaseTime = 1.f;                      // >= ReleaseDuration when idle
	int32 PointerIndex = INDEX_NONE;
	FVector2D LastSent = FVector2D::ZeroVector;
	bool bBuilt = false;
};

/**
 * PH-TOUCH-001 complete control set. Reference layout 1920x1080; left group anchored to the left
 * edge, right group to the right edge, so 20:9 phones gain width in the middle, not bigger controls.
 * All controls end in AUCVehiclePawn::SetPlayer* / Player*, the same entry points as the Enhanced Input
 * actions. Contains no gameplay rules.
 */
UCLASS()
class UNREALCOMBAT_API UUCTouchControlsWidget : public UUserWidget
{
	GENERATED_BODY()

public:
	virtual void NativeTick(const FGeometry& MyGeometry, float InDeltaTime) override;

protected:
	virtual TSharedRef<SWidget> RebuildWidget() override;
	virtual void NativeDestruct() override;

private:
	void BindPawn(AUCVehiclePawn* Pawn);
	void NeutraliseAll();
	void RebuildAbilityButtons(AUCVehiclePawn* Pawn);
	void RefreshStates(AUCVehiclePawn* Pawn);

	UPROPERTY() TObjectPtr<UCanvasPanel> Root;
	UPROPERTY() TObjectPtr<UUCTouchStick> Stick;
	UPROPERTY() TObjectPtr<UUCTouchButton> Handbrake;
	UPROPERTY() TObjectPtr<UUCTouchButton> FirePrimary;
	UPROPERTY() TObjectPtr<UUCTouchButton> FireSecondary;
	UPROPERTY() TObjectPtr<UUCTouchButton> Reload;
	UPROPERTY() TArray<TObjectPtr<UUCTouchButton>> AbilityButtons;

	TWeakObjectPtr<AUCVehiclePawn> BoundPawn;
	int32 BuiltAbilityCount = -1;
	bool bBuilt = false;
};
