#include "UCVehiclePawn.h"

#include "ChaosVehicleWheel.h"
#include "ChaosWheeledVehicleMovementComponent.h"
#include "Components/SkeletalMeshComponent.h"
#include "Engine/DamageEvents.h"
#include "Engine/LocalPlayer.h"
#include "Engine/World.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "GameFramework/PlayerController.h"
#include "InputActionValue.h"
#include "Net/UnrealNetwork.h"
#include "UCAbilityComponent.h"
#include "UCCombatStatics.h"
#include "UCDefinitions.h"
#include "UCGameFramework.h"
#include "UCGameMode.h"
#include "UCVehicleHealthComponent.h"
#include "UCWeaponComponent.h"

#include UE_INLINE_GENERATED_CPP_BY_NAME(UCVehiclePawn)

AUCVehiclePawn::AUCVehiclePawn(const FObjectInitializer& ObjectInitializer)
	: Super(ObjectInitializer)
{
	Health = CreateDefaultSubobject<UUCVehicleHealthComponent>(TEXT("Health"));
	Abilities = CreateDefaultSubobject<UUCAbilityComponent>(TEXT("Abilities"));

	PrimaryWeapon = CreateDefaultSubobject<UUCWeaponComponent>(TEXT("PrimaryWeapon"));
	PrimaryWeapon->SetupAttachment(GetMesh());
	SecondaryWeapon = CreateDefaultSubobject<UUCWeaponComponent>(TEXT("SecondaryWeapon"));
	SecondaryWeapon->SetupAttachment(GetMesh());

	bReplicates = true;
}

void AUCVehiclePawn::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
	Super::GetLifetimeReplicatedProps(OutLifetimeProps);
	DOREPLIFETIME(AUCVehiclePawn, Definition);
}

void AUCVehiclePawn::InitFromDefinition(const UUCVehicleDefinition* InDefinition)
{
	if (HasAuthority())
	{
		Definition = InDefinition;
		ApplyDefinitionLocal();
	}
}

void AUCVehiclePawn::OnRep_Definition()
{
	ApplyDefinitionLocal();
}

void AUCVehiclePawn::ApplyDefinitionLocal()
{
	if (Definition == nullptr)
	{
		return;
	}
	Health->InitFromDefinition(Definition);
	Abilities->InitFromDefinition(Definition);
	if (HasAuthority())
	{
		PrimaryWeapon->SetDefinition(Definition->PrimaryWeapon);
		SecondaryWeapon->SetDefinition(Definition->SecondaryWeapon);
	}
	ApplyPerformanceModifiers();
}

void AUCVehiclePawn::BeginPlay()
{
	Super::BeginPlay();
	Health->OnStateChanged.AddUniqueDynamic(this, &AUCVehiclePawn::HandleHealthChanged);
	Health->OnVehicleDestroyed.AddUniqueDynamic(this, &AUCVehiclePawn::HandleDestroyed);
	Abilities->OnAbilitiesChanged.AddUniqueDynamic(this, &AUCVehiclePawn::HandleAbilitiesChanged);
	ApplyPerformanceModifiers();
}

void AUCVehiclePawn::PawnClientRestart()
{
	Super::PawnClientRestart();
	const APlayerController* PlayerController = Cast<APlayerController>(GetController());
	const ULocalPlayer* LocalPlayer = PlayerController != nullptr ? PlayerController->GetLocalPlayer() : nullptr;
	if (LocalPlayer != nullptr && DrivingMappingContext != nullptr)
	{
		if (UEnhancedInputLocalPlayerSubsystem* Subsystem = ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(LocalPlayer))
		{
			Subsystem->RemoveMappingContext(DrivingMappingContext);
			Subsystem->AddMappingContext(DrivingMappingContext, 0);
		}
	}
}

void AUCVehiclePawn::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
	Super::SetupPlayerInputComponent(PlayerInputComponent);
	UEnhancedInputComponent* Input = Cast<UEnhancedInputComponent>(PlayerInputComponent);
	if (Input == nullptr)
	{
		return;
	}
	if (ThrottleAction != nullptr)
	{
		Input->BindAction(ThrottleAction, ETriggerEvent::Triggered, this, &AUCVehiclePawn::OnThrottleInput);
		Input->BindAction(ThrottleAction, ETriggerEvent::Completed, this, &AUCVehiclePawn::OnThrottleInput);
	}
	if (SteerAction != nullptr)
	{
		Input->BindAction(SteerAction, ETriggerEvent::Triggered, this, &AUCVehiclePawn::OnSteerInput);
		Input->BindAction(SteerAction, ETriggerEvent::Completed, this, &AUCVehiclePawn::OnSteerInput);
	}
	if (HandbrakeAction != nullptr)
	{
		Input->BindAction(HandbrakeAction, ETriggerEvent::Started, this, &AUCVehiclePawn::OnHandbrakeInput);
		Input->BindAction(HandbrakeAction, ETriggerEvent::Completed, this, &AUCVehiclePawn::OnHandbrakeInput);
	}
	if (FirePrimaryAction != nullptr)
	{
		Input->BindAction(FirePrimaryAction, ETriggerEvent::Started, this, &AUCVehiclePawn::OnFirePrimaryInput);
		Input->BindAction(FirePrimaryAction, ETriggerEvent::Completed, this, &AUCVehiclePawn::OnFirePrimaryInput);
	}
	if (FireSecondaryAction != nullptr)
	{
		Input->BindAction(FireSecondaryAction, ETriggerEvent::Started, this, &AUCVehiclePawn::OnFireSecondaryInput);
		Input->BindAction(FireSecondaryAction, ETriggerEvent::Completed, this, &AUCVehiclePawn::OnFireSecondaryInput);
	}
	if (ReloadAction != nullptr)
	{
		Input->BindAction(ReloadAction, ETriggerEvent::Started, this, &AUCVehiclePawn::OnReloadInput);
	}
	for (int32 Slot = 0; Slot < AbilityActions.Num(); ++Slot)
	{
		if (AbilityActions[Slot] != nullptr)
		{
			Input->BindAction(AbilityActions[Slot], ETriggerEvent::Started, this, &AUCVehiclePawn::OnAbilityInput, Slot);
		}
	}
}

void AUCVehiclePawn::OnThrottleInput(const FInputActionValue& Value)
{
	PlayerThrottle = Value.Get<float>();
	PushPlayerDriveInput();
}

void AUCVehiclePawn::OnSteerInput(const FInputActionValue& Value)
{
	PlayerSteering = Value.Get<float>();
	PushPlayerDriveInput();
}

void AUCVehiclePawn::OnHandbrakeInput(const FInputActionValue& Value)
{
	bPlayerHandbrake = Value.Get<bool>();
	PushPlayerDriveInput();
}

void AUCVehiclePawn::OnFirePrimaryInput(const FInputActionValue& Value)
{
	PrimaryWeapon->SetTriggerHeld(Value.Get<bool>() && !IsWrecked());
}

void AUCVehiclePawn::OnFireSecondaryInput(const FInputActionValue& Value)
{
	SecondaryWeapon->SetTriggerHeld(Value.Get<bool>() && !IsWrecked());
}

void AUCVehiclePawn::OnReloadInput(const FInputActionValue& Value)
{
	PrimaryWeapon->RequestReload();
	SecondaryWeapon->RequestReload();
}

void AUCVehiclePawn::OnAbilityInput(const FInputActionValue& Value, int32 SlotIndex)
{
	Abilities->ActivateAbility(SlotIndex);
}

void AUCVehiclePawn::PushPlayerDriveInput()
{
	SetDriveInput(PlayerThrottle, PlayerSteering, bPlayerHandbrake);
}

void AUCVehiclePawn::SetDriveInput(float Throttle, float Steering, bool bHandbrake)
{
	UChaosVehicleMovementComponent* Movement = GetVehicleMovementComponent();
	if (Movement == nullptr)
	{
		return;
	}
	if (IsWrecked())
	{
		Movement->SetThrottleInput(0.f);
		Movement->SetBrakeInput(0.f);
		Movement->SetSteeringInput(0.f);
		Movement->SetHandbrakeInput(true);
		return;
	}
	const uc::FPerformanceModifiers Modifiers = Health->GetPerformanceModifiers();
	const float ClampedThrottle = FMath::Clamp(Throttle, -1.f, 1.f);
	Movement->SetThrottleInput(Modifiers.bImmobilised ? 0.f : FMath::Max(ClampedThrottle, 0.f));
	// Chaos vehicles treat brake input at standstill as reverse, so one axis covers both.
	Movement->SetBrakeInput(FMath::Max(-ClampedThrottle, 0.f));
	Movement->SetSteeringInput(FMath::Clamp(Steering, -1.f, 1.f) * Modifiers.SteeringScale);
	Movement->SetHandbrakeInput(bHandbrake);
}

void AUCVehiclePawn::SetFiring(bool bPrimary, bool bSecondary)
{
	const bool bCanFire = !IsWrecked();
	PrimaryWeapon->SetTriggerHeld(bPrimary && bCanFire);
	SecondaryWeapon->SetTriggerHeld(bSecondary && bCanFire);
}

bool AUCVehiclePawn::IsWrecked() const
{
	return Health->IsDestroyed();
}

float AUCVehiclePawn::GetSpeedKmh() const
{
	const UChaosVehicleMovementComponent* Movement = GetVehicleMovementComponent();
	return Movement != nullptr ? Movement->GetForwardSpeed() * 0.036f : 0.f;
}

int32 AUCVehiclePawn::GetTeamId() const
{
	const AUCPlayerState* State = GetPlayerState<AUCPlayerState>();
	return State != nullptr ? State->GetTeamId() : INDEX_NONE;
}

void AUCVehiclePawn::SetAISpeedScale(float Scale)
{
	AISpeedScale = FMath::Clamp(Scale, 0.f, 5.f);
	ApplyPerformanceModifiers();
}

void AUCVehiclePawn::HandleHealthChanged(UUCVehicleHealthComponent* InHealth)
{
	ApplyPerformanceModifiers();
}

void AUCVehiclePawn::HandleAbilitiesChanged(UUCAbilityComponent* InAbilities)
{
	ApplyPerformanceModifiers();
}

void AUCVehiclePawn::ApplyPerformanceModifiers()
{
	UChaosWheeledVehicleMovementComponent* Movement = Cast<UChaosWheeledVehicleMovementComponent>(GetVehicleMovementComponent());
	if (Movement == nullptr)
	{
		return;
	}
	if (!bBaseValuesCaptured)
	{
		// Remember the Blueprint-authored tuning so damage scales it instead of replacing it.
		BaseMaxEngineTorque = Movement->EngineSetup.MaxTorque;
		BaseWheelFriction.Reset();
		for (const FChaosWheelSetup& Setup : Movement->WheelSetups)
		{
			const UChaosVehicleWheel* WheelDefaults = Setup.WheelClass != nullptr ? Setup.WheelClass->GetDefaultObject<UChaosVehicleWheel>() : nullptr;
			BaseWheelFriction.Add(WheelDefaults != nullptr ? WheelDefaults->FrictionForceMultiplier : 1.f);
		}
		bBaseValuesCaptured = true;
	}

	const uc::FPerformanceModifiers Modifiers = Health->GetPerformanceModifiers();
	Movement->SetMaxEngineTorque(BaseMaxEngineTorque * Modifiers.EnginePowerScale * Abilities->GetBoostScale() * AISpeedScale);

	const int32 WheelCount = FMath::Min3(BaseWheelFriction.Num(), Movement->GetNumWheels(), uc::NumWheels);
	for (int32 Wheel = 0; Wheel < WheelCount; ++Wheel)
	{
		Movement->SetWheelFrictionMultiplier(Wheel, BaseWheelFriction[Wheel] * Modifiers.WheelGripScale[Wheel]);
	}

	if (HasAuthority())
	{
		PrimaryWeapon->SetMountOnline(Modifiers.bPrimaryWeaponOnline);
		SecondaryWeapon->SetMountOnline(Modifiers.bSecondaryWeaponOnline);
	}
}

void AUCVehiclePawn::HandleDestroyed(UUCVehicleHealthComponent* InHealth, AController* Killer)
{
	SetDriveInput(0.f, 0.f, true);
	if (HasAuthority())
	{
		SetFiring(false, false);
		if (AUCGameMode* GameMode = GetWorld()->GetAuthGameMode<AUCGameMode>())
		{
			GameMode->NotifyVehicleDestroyed(this, Killer);
		}
	}
}

float AUCVehiclePawn::TakeDamage(float DamageAmount, const FDamageEvent& DamageEvent, AController* EventInstigator, AActor* DamageCauser)
{
	// Engine damage sources (radial damage, kill volumes, Blueprint hazards) are routed into the damage model.
	const float Accepted = Super::TakeDamage(DamageAmount, DamageEvent, EventInstigator, DamageCauser);
	if (!HasAuthority() || !(Accepted > 0.f) || !UUCCombatStatics::CanDamage(EventInstigator, this))
	{
		return 0.f;
	}
	FUCHitInfo Info;
	Info.Amount = Accepted;
	Info.DamageType = DamageEvent.IsOfType(FRadialDamageEvent::ClassID) ? EUCDamageType::Explosive : EUCDamageType::Kinetic;
	if (DamageEvent.IsOfType(FPointDamageEvent::ClassID))
	{
		const FPointDamageEvent& PointEvent = static_cast<const FPointDamageEvent&>(DamageEvent);
		Info.Facing = Health->FacingFromShotDirection(FVector(PointEvent.ShotDirection));
		Info.Target = Health->ComponentFromHit(PointEvent.HitInfo);
	}
	else if (DamageCauser != nullptr)
	{
		Info.Facing = Health->FacingFromShotDirection(GetActorLocation() - DamageCauser->GetActorLocation());
	}
	const float Dealt = Health->ApplyHit(Info, EventInstigator);
	if (AUCGameMode* GameMode = GetWorld()->GetAuthGameMode<AUCGameMode>())
	{
		GameMode->NotifyDamageDealt(EventInstigator, Dealt);
	}
	return Dealt;
}

void AUCVehiclePawn::NotifyHit(UPrimitiveComponent* MyComp, AActor* Other, UPrimitiveComponent* OtherComp, bool bSelfMoved, FVector HitLocation, FVector HitNormal, FVector NormalImpulse, const FHitResult& Hit)
{
	Super::NotifyHit(MyComp, Other, OtherComp, bSelfMoved, HitLocation, HitNormal, NormalImpulse, Hit);
	if (!HasAuthority() || Definition == nullptr || IsWrecked())
	{
		return;
	}
	// Requires "Simulation Generates Hit Events" on the vehicle mesh.
	const float Impulse = static_cast<float>(NormalImpulse.Size());
	const double Now = GetWorld()->GetTimeSeconds();
	if (Impulse <= Definition->CollisionImpulseThreshold || Now - LastCollisionDamageTime < 0.2)
	{
		return;
	}
	LastCollisionDamageTime = Now;

	const float Damage = (Impulse - Definition->CollisionImpulseThreshold) * Definition->CollisionDamagePerImpulse;
	// Ramming credits the other driver; hitting scenery has no instigator.
	const APawn* OtherPawn = Cast<APawn>(Other);
	AController* Rammer = OtherPawn != nullptr ? OtherPawn->GetController() : nullptr;

	FHitResult SelfHit;
	SelfHit.HitObjectHandle = FActorInstanceHandle(this);
	SelfHit.Component = MyComp;
	SelfHit.ImpactPoint = HitLocation;
	SelfHit.Location = HitLocation;
	UUCCombatStatics::ApplyImpact(SelfHit, GetActorLocation() - HitLocation, Damage, EUCDamageType::Collision, 0.f, Rammer, Other);
}
