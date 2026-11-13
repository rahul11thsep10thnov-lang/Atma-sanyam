#include "UCProjectile.h"

#include "Components/SphereComponent.h"
#include "GameFramework/Pawn.h"
#include "GameFramework/ProjectileMovementComponent.h"
#include "UCCombatStatics.h"

#include UE_INLINE_GENERATED_CPP_BY_NAME(UCProjectile)

AUCProjectile::AUCProjectile()
{
	PrimaryActorTick.bCanEverTick = false;
	bReplicates = true;
	SetReplicatingMovement(true);

	Collision = CreateDefaultSubobject<USphereComponent>(TEXT("Collision"));
	Collision->InitSphereRadius(12.f);
	Collision->SetCollisionProfileName(TEXT("BlockAllDynamic"));
	Collision->SetNotifyRigidBodyCollision(true);
	Collision->CanCharacterStepUpOn = ECB_No;
	RootComponent = Collision;

	Movement = CreateDefaultSubobject<UProjectileMovementComponent>(TEXT("Movement"));
	Movement->UpdatedComponent = Collision;
	Movement->bRotationFollowsVelocity = true;
	Movement->ProjectileGravityScale = 0.f;
	Movement->InitialSpeed = 0.f;
	Movement->MaxSpeed = 0.f; // unlimited; the weapon definition sets the speed
}

void AUCProjectile::Launch(const FVector& Direction, float Speed, float InDamage, EUCDamageType InDamageType, float InPenetration, float InExplosionRadius, float MaxRange)
{
	Damage = InDamage;
	DamageType = InDamageType;
	Penetration = InPenetration;
	ExplosionRadius = InExplosionRadius;

	if (AActor* OwnerActor = GetOwner())
	{
		Collision->IgnoreActorWhenMoving(OwnerActor, true);
	}
	Collision->OnComponentHit.AddUniqueDynamic(this, &AUCProjectile::HandleHit);
	Movement->Velocity = Direction.GetSafeNormal() * Speed;
	SetLifeSpan(Speed > 0.f ? FMath::Clamp(MaxRange / Speed, 0.1f, 30.f) : 5.f);
}

void AUCProjectile::HandleHit(UPrimitiveComponent* HitComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, FVector NormalImpulse, const FHitResult& Hit)
{
	if (HasAuthority() && OtherActor != GetOwner())
	{
		Detonate(&Hit);
	}
}

void AUCProjectile::LifeSpanExpired()
{
	if (HasAuthority() && !bDetonated)
	{
		Detonate(nullptr);
		return;
	}
	Super::LifeSpanExpired();
}

void AUCProjectile::Detonate(const FHitResult* Hit)
{
	if (bDetonated)
	{
		return;
	}
	bDetonated = true;

	AController* InstigatorController = GetInstigatorController();
	const FVector Location = Hit != nullptr ? FVector(Hit->ImpactPoint) : GetActorLocation();
	const FVector Direction = Movement->Velocity.GetSafeNormal();

	if (ExplosionRadius > 0.f)
	{
		UUCCombatStatics::ApplyExplosion(this, Location, ExplosionRadius, Damage, DamageType, InstigatorController, this);
	}
	else if (Hit != nullptr)
	{
		UUCCombatStatics::ApplyImpact(*Hit, Direction, Damage, DamageType, Penetration, InstigatorController, this);
	}

	MulticastDetonated(Location);
	Movement->StopMovementImmediately();
	SetActorEnableCollision(false);
	// Leave a moment for the multicast to reach clients before the actor goes away.
	SetLifeSpan(0.5f);
}

void AUCProjectile::MulticastDetonated_Implementation(FVector_NetQuantize Location)
{
	OnDetonated(Location);
}
