#pragma once

#include "CoreMinimal.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "UCTypes.h"
#include "UCCombatStatics.generated.h"

/** Shared server-side damage delivery used by hitscan weapons, projectiles and hazards. */
UCLASS()
class UNREALCOMBAT_API UUCCombatStatics : public UBlueprintFunctionLibrary
{
	GENERATED_BODY()

public:
	/** False for team-mates (unless friendly fire is on) and for self-damage from one's own weapons. */
	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Combat")
	static bool CanDamage(const AController* InstigatorController, const AActor* Target);

	/**
	 * Deliver one impact. Vehicles go through their health component (armour facing and component
	 * are resolved from the hit); anything else receives ordinary point damage.
	 * Returns the damage actually dealt.
	 */
	UFUNCTION(BlueprintCallable, Category = "Unreal Combat|Combat")
	static float ApplyImpact(const FHitResult& Hit, const FVector& ShotDirection, float Damage, EUCDamageType DamageType, float Penetration, AController* InstigatorController, AActor* DamageCauser);

	/** Area damage with linear falloff to zero at Radius. */
	UFUNCTION(BlueprintCallable, Category = "Unreal Combat|Combat")
	static void ApplyExplosion(const UObject* WorldContextObject, const FVector& Origin, float Radius, float Damage, EUCDamageType DamageType, AController* InstigatorController, AActor* DamageCauser);
};
