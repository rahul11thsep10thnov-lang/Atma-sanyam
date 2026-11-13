#pragma once

#include "CoreMinimal.h"
#include "WheeledVehiclePawn.h"
#include "UCTypes.h"
#include "UCVehiclePawn.generated.h"

class UInputAction;
class UInputMappingContext;
class UUCAbilityComponent;
class UUCVehicleDefinition;
class UUCVehicleHealthComponent;
class UUCWeaponComponent;
struct FInputActionValue;

/**
 * A drivable combat vehicle built on Chaos Vehicles.
 *
 * This class owns function only: input, handling changes from damage, weapons, abilities.
 * A Blueprint subclass supplies the skeletal mesh, wheel classes, engine/transmission tuning,
 * the camera and the muzzle positions. Wheel setups must be ordered FL, FR, RL, RR.
 */
UCLASS()
class UNREALCOMBAT_API AUCVehiclePawn : public AWheeledVehiclePawn
{
	GENERATED_BODY()

public:
	AUCVehiclePawn(const FObjectInitializer& ObjectInitializer = FObjectInitializer::Get());

	/** Server: call between deferred spawn and FinishSpawning. */
	void InitFromDefinition(const UUCVehicleDefinition* InDefinition);

	/**
	 * Driving input shared by players and AI.
	 * Throttle: -1 (brake / reverse) .. 1. Steering: -1 (left) .. 1 (right).
	 */
	UFUNCTION(BlueprintCallable, Category = "Unreal Combat|Vehicle")
	void SetDriveInput(float Throttle, float Steering, bool bHandbrake);

	UFUNCTION(BlueprintCallable, Category = "Unreal Combat|Vehicle")
	void SetFiring(bool bPrimary, bool bSecondary);

	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Vehicle")
	const UUCVehicleDefinition* GetDefinition() const { return Definition; }

	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Vehicle")
	bool IsWrecked() const;

	/** Forward speed in km/h (negative when reversing). */
	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Vehicle")
	float GetSpeedKmh() const;

	UFUNCTION(BlueprintPure, Category = "Unreal Combat|Vehicle")
	int32 GetTeamId() const;

	/** Server: extra engine-torque multiplier from AI (boss phases). */
	void SetAISpeedScale(float Scale);

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Unreal Combat")
	TObjectPtr<UUCVehicleHealthComponent> Health;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Unreal Combat")
	TObjectPtr<UUCAbilityComponent> Abilities;

	/** Muzzle of the primary weapon. Position it in the Blueprint subclass. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Unreal Combat")
	TObjectPtr<UUCWeaponComponent> PrimaryWeapon;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Unreal Combat")
	TObjectPtr<UUCWeaponComponent> SecondaryWeapon;

	// ---- Input assets (Enhanced Input). Assigned in the Blueprint subclass. ----

	UPROPERTY(EditDefaultsOnly, Category = "Unreal Combat|Input")
	TObjectPtr<UInputMappingContext> DrivingMappingContext;

	/** Axis1D: -1 brake/reverse .. 1 accelerate. */
	UPROPERTY(EditDefaultsOnly, Category = "Unreal Combat|Input")
	TObjectPtr<UInputAction> ThrottleAction;

	/** Axis1D: -1 left .. 1 right. */
	UPROPERTY(EditDefaultsOnly, Category = "Unreal Combat|Input")
	TObjectPtr<UInputAction> SteerAction;

	UPROPERTY(EditDefaultsOnly, Category = "Unreal Combat|Input")
	TObjectPtr<UInputAction> HandbrakeAction;

	UPROPERTY(EditDefaultsOnly, Category = "Unreal Combat|Input")
	TObjectPtr<UInputAction> FirePrimaryAction;

	UPROPERTY(EditDefaultsOnly, Category = "Unreal Combat|Input")
	TObjectPtr<UInputAction> FireSecondaryAction;

	UPROPERTY(EditDefaultsOnly, Category = "Unreal Combat|Input")
	TObjectPtr<UInputAction> ReloadAction;

	/** One action per ability slot, in the order of the vehicle definition's Abilities. */
	UPROPERTY(EditDefaultsOnly, Category = "Unreal Combat|Input")
	TArray<TObjectPtr<UInputAction>> AbilityActions;

	virtual void BeginPlay() override;
	virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;
	virtual void PawnClientRestart() override;
	virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const override;
	virtual float TakeDamage(float DamageAmount, const struct FDamageEvent& DamageEvent, AController* EventInstigator, AActor* DamageCauser) override;
	virtual void NotifyHit(UPrimitiveComponent* MyComp, AActor* Other, UPrimitiveComponent* OtherComp, bool bSelfMoved, FVector HitLocation, FVector HitNormal, FVector NormalImpulse, const FHitResult& Hit) override;

private:
	void OnThrottleInput(const FInputActionValue& Value);
	void OnSteerInput(const FInputActionValue& Value);
	void OnHandbrakeInput(const FInputActionValue& Value);
	void OnFirePrimaryInput(const FInputActionValue& Value);
	void OnFireSecondaryInput(const FInputActionValue& Value);
	void OnReloadInput(const FInputActionValue& Value);
	void OnAbilityInput(const FInputActionValue& Value, int32 SlotIndex);
	void PushPlayerDriveInput();

	UFUNCTION()
	void OnRep_Definition();

	UFUNCTION()
	void HandleHealthChanged(UUCVehicleHealthComponent* InHealth);

	UFUNCTION()
	void HandleDestroyed(UUCVehicleHealthComponent* InHealth, AController* Killer);

	UFUNCTION()
	void HandleAbilitiesChanged(UUCAbilityComponent* InAbilities);

	void ApplyDefinitionLocal();
	/** Push the damage model's handling penalties into the Chaos vehicle simulation. */
	void ApplyPerformanceModifiers();

	UPROPERTY(ReplicatedUsing = OnRep_Definition)
	TObjectPtr<const UUCVehicleDefinition> Definition;

	float PlayerThrottle = 0.f;
	float PlayerSteering = 0.f;
	bool bPlayerHandbrake = false;

	float BaseMaxEngineTorque = 0.f;
	TArray<float> BaseWheelFriction;
	float AISpeedScale = 1.f;
	bool bBaseValuesCaptured = false;
	double LastCollisionDamageTime = -1.0;
};
