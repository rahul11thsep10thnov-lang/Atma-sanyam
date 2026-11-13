#pragma once

#include "CoreMinimal.h"
#include "Engine/NetSerialization.h"
#include "GameFramework/Actor.h"
#include "UCTypes.h"
#include "UCProjectile.generated.h"

class UProjectileMovementComponent;
class USphereComponent;

/**
 * Server-authoritative projectile (rockets, shells). Movement replicates; damage is applied on the server.
 * Mesh, trail and impact effects are added by a Blueprint subclass from the visual package.
 */
UCLASS()
class UNREALCOMBAT_API AUCProjectile : public AActor
{
	GENERATED_BODY()

public:
	AUCProjectile();

	/** Server only, immediately after spawning. */
	void Launch(const FVector& Direction, float Speed, float InDamage, EUCDamageType InDamageType, float InPenetration, float InExplosionRadius, float MaxRange);

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Projectile")
	TObjectPtr<USphereComponent> Collision;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Projectile")
	TObjectPtr<UProjectileMovementComponent> Movement;

	/** Presentation hook, called on server and clients when the projectile detonates. */
	UFUNCTION(BlueprintImplementableEvent, Category = "Projectile")
	void OnDetonated(const FVector& Location);

protected:
	UFUNCTION()
	void HandleHit(UPrimitiveComponent* HitComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, FVector NormalImpulse, const FHitResult& Hit);

	UFUNCTION(NetMulticast, Reliable)
	void MulticastDetonated(FVector_NetQuantize Location);

	virtual void LifeSpanExpired() override;

private:
	void Detonate(const FHitResult* Hit);

	float Damage = 0.f;
	EUCDamageType DamageType = EUCDamageType::Explosive;
	float Penetration = 0.f;
	float ExplosionRadius = 0.f;
	bool bDetonated = false;
};
