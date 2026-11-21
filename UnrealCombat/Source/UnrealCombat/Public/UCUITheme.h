#pragma once

#include "CoreMinimal.h"

/** Colour tokens from the approved design system (Delivery 02, IRON FRONT v1.1, section 1.2). */
namespace UCTheme
{
	inline FLinearColor Hex(const TCHAR* Value) { return FLinearColor::FromSRGBColor(FColor::FromHex(Value)); }

	inline const FLinearColor Graphite950 = Hex(TEXT("#0B0F13"));
	inline const FLinearColor Graphite900 = Hex(TEXT("#121920"));
	inline const FLinearColor Graphite800 = Hex(TEXT("#1C2730"));
	inline const FLinearColor Steel700 = Hex(TEXT("#394752"));
	inline const FLinearColor Steel400 = Hex(TEXT("#8B9AA5"));
	inline const FLinearColor White = Hex(TEXT("#F4F7F9"));
	inline const FLinearColor Muted = Hex(TEXT("#B1BBC2"));
	inline const FLinearColor PlayerAmber = Hex(TEXT("#FFB000"));
	inline const FLinearColor ActionOrange = Hex(TEXT("#F07824"));
	inline const FLinearColor WarningYellow = Hex(TEXT("#FFD43B"));
	inline const FLinearColor CriticalMagenta = Hex(TEXT("#E0448A"));
	inline const FLinearColor DestroyedRed = Hex(TEXT("#B4232F"));
	inline const FLinearColor EnemyRed = Hex(TEXT("#E84A3B"));
	inline const FLinearColor HealthyGreen = Hex(TEXT("#35C878"));
	inline const FLinearColor ShieldCyan = Hex(TEXT("#22B8D6"));
	inline const FLinearColor TeamBlue = Hex(TEXT("#2676D8"));
	/** Spec 3.3: fire uses a red-orange distinct from enemy red. */
	inline const FLinearColor FireOrange = Hex(TEXT("#FF6A1A"));
	/** Spec 3.5: boss bar uses a deep red-orange fill. */
	inline const FLinearColor BossFill = Hex(TEXT("#C2410C"));

	enum class ESeverity : uint8 { Normal, Warning, Critical, Destroyed };

	/** Spec 3.10 thresholds, display only. Comparison is <= on the normalised 0..1 value; never rounds up. */
	inline ESeverity SeverityFromFraction(float Fraction, float WarnAt, float CritAt)
	{
		if (Fraction <= 0.f) { return ESeverity::Destroyed; }
		if (Fraction <= CritAt) { return ESeverity::Critical; }
		if (Fraction <= WarnAt) { return ESeverity::Warning; }
		return ESeverity::Normal;
	}

	inline FLinearColor SeverityColor(ESeverity Severity, const FLinearColor& NormalColor)
	{
		switch (Severity)
		{
		case ESeverity::Warning: return WarningYellow;
		case ESeverity::Critical: return CriticalMagenta;
		case ESeverity::Destroyed: return DestroyedRed;
		default: return NormalColor;
		}
	}
}
