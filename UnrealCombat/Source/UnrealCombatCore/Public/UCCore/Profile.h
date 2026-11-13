#pragma once

#include "UCCore/Types.h"

namespace uc
{
	enum class ECurrency : uint8_t
	{
		Credits = 0,
		Premium,
		Count
	};

	enum class EItemKind : uint8_t
	{
		Vehicle = 0,
		Weapon,
		Upgrade,
		Consumable
	};

	enum class ELoadoutSlot : uint8_t
	{
		Vehicle = 0,
		PrimaryWeapon,
		SecondaryWeapon,
		Count
	};

	struct FCatalogItem
	{
		FId Id;
		EItemKind Kind = EItemKind::Upgrade;
		ECurrency Currency = ECurrency::Credits;
		int64_t Price = 0;
		int32_t RequiredLevel = 1;
	};

	class UCCORE_API FCatalog
	{
	public:
		/** Adds or replaces an item. Returns false for invalid ids or negative prices. */
		bool Add(const FCatalogItem& Item);
		const FCatalogItem* Find(const FId& Id) const;
		const std::vector<FCatalogItem>& GetItems() const { return Items; }

	private:
		std::vector<FCatalogItem> Items;
	};

	/** Everything persisted for one account. The same structure is used offline and by the backend. */
	struct FPlayerProfile
	{
		static constexpr int32_t CurrentSchemaVersion = 1;

		int32_t SchemaVersion = CurrentSchemaVersion;
		FId PlayerId;
		std::string DisplayName;
		int32_t Level = 1;
		int64_t Xp = 0;
		int64_t Balance[static_cast<int32_t>(ECurrency::Count)] = { 0, 0 };
		std::vector<FId> OwnedItems;
		FId Loadout[static_cast<int32_t>(ELoadoutSlot::Count)];
		std::vector<FId> CompletedMissions;
		/** Recently applied transaction ids, newest last. Makes grants and purchases idempotent. */
		std::vector<FId> AppliedTransactions;

		bool Owns(const FId& ItemId) const;
		bool HasCompletedMission(const FId& MissionId) const;
		bool HasAppliedTransaction(const FId& TransactionId) const;
	};

	enum class ETxResult : uint8_t
	{
		Ok = 0,
		/** The transaction id was already applied; nothing changed. Callers should treat this as success. */
		Duplicate,
		InvalidId,
		InvalidAmount,
		InsufficientFunds,
		UnknownItem,
		AlreadyOwned,
		NotOwned,
		LevelTooLow,
		WrongItemKind
	};

	UCCORE_API const char* ToString(ETxResult Result);

	/** Wallet and inventory rules. Every mutating call needs a unique transaction id. */
	UCCORE_API ETxResult GrantCurrency(FPlayerProfile& Profile, ECurrency Currency, int64_t Amount, const FId& TransactionId);
	UCCORE_API ETxResult SpendCurrency(FPlayerProfile& Profile, ECurrency Currency, int64_t Amount, const FId& TransactionId);
	UCCORE_API ETxResult PurchaseItem(FPlayerProfile& Profile, const FCatalog& Catalog, const FId& ItemId, const FId& TransactionId);
	UCCORE_API ETxResult EquipItem(FPlayerProfile& Profile, const FCatalog& Catalog, ELoadoutSlot Slot, const FId& ItemId);

	struct FProgressionSpec
	{
		int32_t MaxLevel = 50;
		int64_t BaseXp = 500;
		int64_t XpGrowthPerLevel = 250;
	};

	/** XP needed to go from Level to Level + 1. */
	UCCORE_API int64_t XpForNextLevel(const FProgressionSpec& Spec, int32_t Level);
	/** Adds XP and applies level-ups. Returns the number of levels gained. */
	UCCORE_API int32_t AddXp(FPlayerProfile& Profile, const FProgressionSpec& Spec, int64_t Amount);

	struct FMatchPerformance
	{
		int32_t Kills = 0;
		int32_t Assists = 0;
		int32_t Deaths = 0;
		float DamageDealt = 0.f;
		int32_t BossesDefeated = 0;
		bool bWon = false;
		bool bMissionCompleted = false;
	};

	struct FRewardSpec
	{
		int64_t XpPerKill = 100;
		int64_t XpPerAssist = 40;
		int64_t XpPerBoss = 500;
		int64_t XpPer1000Damage = 50;
		int64_t XpWinBonus = 300;
		int64_t XpParticipation = 100;
		int64_t XpMissionComplete = 400;
		int64_t CreditsPerKill = 50;
		int64_t CreditsPerBoss = 400;
		int64_t CreditsWinBonus = 200;
		int64_t CreditsParticipation = 50;
		int64_t CreditsMissionComplete = 300;
	};

	struct FMatchReward
	{
		int64_t Xp = 0;
		int64_t Credits = 0;
	};

	UCCORE_API FMatchReward ComputeMatchReward(const FMatchPerformance& Performance, const FRewardSpec& Spec);

	/** Applies a match reward exactly once per MatchId. Returns levels gained (0 if already applied). */
	UCCORE_API int32_t ApplyMatchReward(FPlayerProfile& Profile, const FProgressionSpec& Progression, const FMatchReward& Reward, const FId& MatchId);

	/** Versioned, human-readable text form used for save games and backend sync. */
	UCCORE_API std::string SerializeProfile(const FPlayerProfile& Profile);
	/** Parses and validates. On failure OutProfile is left untouched. */
	UCCORE_API bool DeserializeProfile(const std::string& Text, FPlayerProfile& OutProfile);
}
