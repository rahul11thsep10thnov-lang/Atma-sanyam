#include "UCWorldActors.h"

#include "Components/BoxComponent.h"
#include "Engine/World.h"
#include "UCGameMode.h"
#include "UCVehicleHealthComponent.h"
#include "UCVehiclePawn.h"
#include "UCWeaponComponent.h"

#include UE_INLINE_GENERATED_CPP_BY_NAME(UCWorldActors)

static UBoxComponent* UCMakeTriggerBox(AActor* Owner, const FName Name)
{
	UBoxComponent* Box = Owner->CreateDefaultSubobject<UBoxComponent>(Name);
	Box->InitBoxExtent(FVector(600.0, 600.0, 300.0));
	Box->SetCollisionEnabled(ECollisionEnabled::QueryOnly);
	Box->SetCollisionResponseToAllChannels(ECR_Ignore);
	Box->SetCollisionResponseToChannel(ECC_Vehicle, ECR_Overlap);
	Box->SetCollisionResponseToChannel(ECC_Pawn, ECR_Overlap);
	Box->SetGenerateOverlapEvents(true);
	return Box;
}

AUCCheckpoint::AUCCheckpoint()
{
	Trigger = UCMakeTriggerBox(this, TEXT("Trigger"));
	RootComponent = Trigger;
}

void AUCCheckpoint::BeginPlay()
{
	Super::BeginPlay();
	Trigger->OnComponentBeginOverlap.AddUniqueDynamic(this, &AUCCheckpoint::HandleOverlap);
}

void AUCCheckpoint::HandleOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)
{
	AUCVehiclePawn* Vehicle = Cast<AUCVehiclePawn>(OtherActor);
	if (Vehicle == nullptr || Vehicle->IsWrecked())
	{
		return;
	}
	OnCheckpointReached(Vehicle);

	AController* Controller = Vehicle->GetController();
	if (!HasAuthority() || Controller == nullptr || Visitors.Contains(Controller))
	{
		return;
	}
	Visitors.Add(Controller);
	if (AUCGameMode* GameMode = GetWorld()->GetAuthGameMode<AUCGameMode>())
	{
		GameMode->NotifyCheckpointReached(Controller);
	}
}

AUCRepairZone::AUCRepairZone()
{
	PrimaryActorTick.bCanEverTick = true;
	Volume = UCMakeTriggerBox(this, TEXT("Volume"));
	RootComponent = Volume;
}

void AUCRepairZone::BeginPlay()
{
	Super::BeginPlay();
	Volume->OnComponentBeginOverlap.AddUniqueDynamic(this, &AUCRepairZone::HandleOverlap);
}

bool AUCRepairZone::Accepts(const AUCVehiclePawn* Vehicle) const
{
	return Vehicle != nullptr && !Vehicle->IsWrecked() && (TeamId < 0 || Vehicle->GetTeamId() == TeamId);
}

void AUCRepairZone::HandleOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)
{
	AUCVehiclePawn* Vehicle = Cast<AUCVehiclePawn>(OtherActor);
	if (HasAuthority() && bRearmOnEnter && Accepts(Vehicle))
	{
		Vehicle->PrimaryWeapon->Rearm();
		Vehicle->SecondaryWeapon->Rearm();
	}
}

void AUCRepairZone::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	if (!HasAuthority() || !(RepairFractionPerSecond > 0.f))
	{
		return;
	}
	TArray<AActor*> Overlapping;
	Volume->GetOverlappingActors(Overlapping, AUCVehiclePawn::StaticClass());
	for (AActor* Actor : Overlapping)
	{
		AUCVehiclePawn* Vehicle = Cast<AUCVehiclePawn>(Actor);
		if (Accepts(Vehicle))
		{
			Vehicle->Health->ExtinguishFire();
			Vehicle->Health->RepairAll(RepairFractionPerSecond * DeltaSeconds, bRepairArmor);
		}
	}
}
