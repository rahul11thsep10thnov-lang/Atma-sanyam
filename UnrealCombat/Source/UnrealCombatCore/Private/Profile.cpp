#include "UCCore/Profile.h"

#include <cstdlib>
#include <limits>

namespace uc
{
	static const size_t MaxStoredTransactions = 256;
	static const int64_t MaxBalance = 1000000000000LL;

	bool FCatalog::Add(const FCatalogItem& Item)
	{
		if (!IsValidId(Item.Id) || Item.Price < 0)
		{
			return false;
		}
		for (FCatalogItem& Existing : Items)
		{
			if (Existing.Id == Item.Id)
			{
				Existing = Item;
				return true;
			}
		}
		Items.push_back(Item);
		return true;
	}

	const FCatalogItem* FCatalog::Find(const FId& Id) const
	{
		for (const FCatalogItem& Item : Items)
		{
			if (Item.Id == Id)
			{
				return &Item;
			}
		}
		return nullptr;
	}

	static bool ContainsId(const std::vector<FId>& List, const FId& Id)
	{
		for (const FId& Entry : List)
		{
			if (Entry == Id)
			{
				return true;
			}
		}
		return false;
	}

	bool FPlayerProfile::Owns(const FId& ItemId) const { return ContainsId(OwnedItems, ItemId); }
	bool FPlayerProfile::HasCompletedMission(const FId& MissionId) const { return ContainsId(CompletedMissions, MissionId); }
	bool FPlayerProfile::HasAppliedTransaction(const FId& TransactionId) const { return ContainsId(AppliedTransactions, TransactionId); }

	const char* ToString(ETxResult Result)
	{
		switch (Result)
		{
		case ETxResult::Ok: return "Ok";
		case ETxResult::Duplicate: return "Duplicate";
		case ETxResult::InvalidId: return "InvalidId";
		case ETxResult::InvalidAmount: return "InvalidAmount";
		case ETxResult::InsufficientFunds: return "InsufficientFunds";
		case ETxResult::UnknownItem: return "UnknownItem";
		case ETxResult::AlreadyOwned: return "AlreadyOwned";
		case ETxResult::NotOwned: return "NotOwned";
		case ETxResult::LevelTooLow: return "LevelTooLow";
		case ETxResult::WrongItemKind: return "WrongItemKind";
		}
		return "Unknown";
	}

	static void RecordTransaction(FPlayerProfile& Profile, const FId& TransactionId)
	{
		Profile.AppliedTransactions.push_back(TransactionId);
		if (Profile.AppliedTransactions.size() > MaxStoredTransactions)
		{
			Profile.AppliedTransactions.erase(Profile.AppliedTransactions.begin());
		}
	}

	/** Shared pre-check. Returns Ok when the transaction should proceed. */
	static ETxResult CheckTransaction(const FPlayerProfile& Profile, const FId& TransactionId)
	{
		if (!IsValidId(TransactionId))
		{
			return ETxResult::InvalidId;
		}
		return Profile.HasAppliedTransaction(TransactionId) ? ETxResult::Duplicate : ETxResult::Ok;
	}

	ETxResult GrantCurrency(FPlayerProfile& Profile, ECurrency Currency, int64_t Amount, const FId& TransactionId)
	{
		const ETxResult Check = CheckTransaction(Profile, TransactionId);
		if (Check != ETxResult::Ok)
		{
			return Check;
		}
		int64_t& Balance = Profile.Balance[static_cast<int32_t>(Currency)];
		if (Amount <= 0 || Amount > MaxBalance || Balance > MaxBalance - Amount)
		{
			return ETxResult::InvalidAmount;
		}
		Balance += Amount;
		RecordTransaction(Profile, TransactionId);
		return ETxResult::Ok;
	}

	ETxResult SpendCurrency(FPlayerProfile& Profile, ECurrency Currency, int64_t Amount, const FId& TransactionId)
	{
		const ETxResult Check = CheckTransaction(Profile, TransactionId);
		if (Check != ETxResult::Ok)
		{
			return Check;
		}
		if (Amount <= 0)
		{
			return ETxResult::InvalidAmount;
		}
		int64_t& Balance = Profile.Balance[static_cast<int32_t>(Currency)];
		if (Balance < Amount)
		{
			return ETxResult::InsufficientFunds;
		}
		Balance -= Amount;
		RecordTransaction(Profile, TransactionId);
		return ETxResult::Ok;
	}

	ETxResult PurchaseItem(FPlayerProfile& Profile, const FCatalog& Catalog, const FId& ItemId, const FId& TransactionId)
	{
		const ETxResult Check = CheckTransaction(Profile, TransactionId);
		if (Check != ETxResult::Ok)
		{
			return Check;
		}
		const FCatalogItem* Item = Catalog.Find(ItemId);
		if (Item == nullptr)
		{
			return ETxResult::UnknownItem;
		}
		const bool bStackable = Item->Kind == EItemKind::Consumable;
		if (!bStackable && Profile.Owns(ItemId))
		{
			return ETxResult::AlreadyOwned;
		}
		if (Profile.Level < Item->RequiredLevel)
		{
			return ETxResult::LevelTooLow;
		}
		int64_t& Balance = Profile.Balance[static_cast<int32_t>(Item->Currency)];
		if (Balance < Item->Price)
		{
			return ETxResult::InsufficientFunds;
		}
		Balance -= Item->Price;
		if (!Profile.Owns(ItemId))
		{
			Profile.OwnedItems.push_back(ItemId);
		}
		RecordTransaction(Profile, TransactionId);
		return ETxResult::Ok;
	}

	ETxResult EquipItem(FPlayerProfile& Profile, const FCatalog& Catalog, ELoadoutSlot Slot, const FId& ItemId)
	{
		const FCatalogItem* Item = Catalog.Find(ItemId);
		if (Item == nullptr)
		{
			return ETxResult::UnknownItem;
		}
		if (!Profile.Owns(ItemId))
		{
			return ETxResult::NotOwned;
		}
		const EItemKind Wanted = Slot == ELoadoutSlot::Vehicle ? EItemKind::Vehicle : EItemKind::Weapon;
		if (Item->Kind != Wanted)
		{
			return ETxResult::WrongItemKind;
		}
		Profile.Loadout[static_cast<int32_t>(Slot)] = ItemId;
		return ETxResult::Ok;
	}

	int64_t XpForNextLevel(const FProgressionSpec& Spec, int32_t Level)
	{
		const int64_t Steps = Level > 1 ? static_cast<int64_t>(Level - 1) : 0;
		const int64_t Needed = Spec.BaseXp + Spec.XpGrowthPerLevel * Steps;
		return Needed > 1 ? Needed : 1;
	}

	int32_t AddXp(FPlayerProfile& Profile, const FProgressionSpec& Spec, int64_t Amount)
	{
		if (Amount <= 0)
		{
			return 0;
		}
		if (Profile.Level >= Spec.MaxLevel)
		{
			Profile.Xp = 0;
			return 0;
		}
		int32_t Gained = 0;
		Profile.Xp += Amount;
		while (Profile.Level < Spec.MaxLevel && Profile.Xp >= XpForNextLevel(Spec, Profile.Level))
		{
			Profile.Xp -= XpForNextLevel(Spec, Profile.Level);
			++Profile.Level;
			++Gained;
		}
		if (Profile.Level >= Spec.MaxLevel)
		{
			Profile.Xp = 0;
		}
		return Gained;
	}

	FMatchReward ComputeMatchReward(const FMatchPerformance& Performance, const FRewardSpec& Spec)
	{
		const int64_t Kills = Performance.Kills > 0 ? Performance.Kills : 0;
		const int64_t Assists = Performance.Assists > 0 ? Performance.Assists : 0;
		const int64_t Bosses = Performance.BossesDefeated > 0 ? Performance.BossesDefeated : 0;
		const float Damage = ClampF(Performance.DamageDealt, 0.f, 10000000.f);

		FMatchReward Reward;
		Reward.Xp = Spec.XpParticipation + Kills * Spec.XpPerKill + Assists * Spec.XpPerAssist + Bosses * Spec.XpPerBoss
			+ static_cast<int64_t>(Damage / 1000.f * static_cast<float>(Spec.XpPer1000Damage));
		Reward.Credits = Spec.CreditsParticipation + Kills * Spec.CreditsPerKill + Bosses * Spec.CreditsPerBoss;
		if (Performance.bWon)
		{
			Reward.Xp += Spec.XpWinBonus;
			Reward.Credits += Spec.CreditsWinBonus;
		}
		if (Performance.bMissionCompleted)
		{
			Reward.Xp += Spec.XpMissionComplete;
			Reward.Credits += Spec.CreditsMissionComplete;
		}
		return Reward;
	}

	int32_t ApplyMatchReward(FPlayerProfile& Profile, const FProgressionSpec& Progression, const FMatchReward& Reward, const FId& MatchId)
	{
		if (CheckTransaction(Profile, MatchId) != ETxResult::Ok)
		{
			return 0;
		}
		if (Reward.Credits > 0)
		{
			int64_t& Balance = Profile.Balance[static_cast<int32_t>(ECurrency::Credits)];
			Balance = Reward.Credits > MaxBalance - Balance ? MaxBalance : Balance + Reward.Credits;
		}
		RecordTransaction(Profile, MatchId);
		return AddXp(Profile, Progression, Reward.Xp);
	}

	// ---- Serialisation -------------------------------------------------

	static std::string EscapeText(const std::string& In)
	{
		static const char* Hex = "0123456789ABCDEF";
		std::string Out;
		for (const char C : In)
		{
			const unsigned char U = static_cast<unsigned char>(C);
			if (U < 0x20 || C == '%' || C == '=' || C == ',' || U == 0x7F)
			{
				Out += '%';
				Out += Hex[U >> 4];
				Out += Hex[U & 0xF];
			}
			else
			{
				Out += C;
			}
		}
		return Out;
	}

	static int HexValue(char C)
	{
		if (C >= '0' && C <= '9') { return C - '0'; }
		if (C >= 'A' && C <= 'F') { return C - 'A' + 10; }
		if (C >= 'a' && C <= 'f') { return C - 'a' + 10; }
		return -1;
	}

	static bool UnescapeText(const std::string& In, std::string& Out)
	{
		Out.clear();
		for (size_t i = 0; i < In.size(); ++i)
		{
			if (In[i] != '%')
			{
				Out += In[i];
				continue;
			}
			if (i + 2 >= In.size())
			{
				return false;
			}
			const int Hi = HexValue(In[i + 1]);
			const int Lo = HexValue(In[i + 2]);
			if (Hi < 0 || Lo < 0)
			{
				return false;
			}
			Out += static_cast<char>((Hi << 4) | Lo);
			i += 2;
		}
		return true;
	}

	static std::string JoinIds(const std::vector<FId>& Ids)
	{
		std::string Out;
		for (size_t i = 0; i < Ids.size(); ++i)
		{
			if (i > 0)
			{
				Out += ',';
			}
			Out += Ids[i];
		}
		return Out;
	}

	static bool SplitIds(const std::string& In, std::vector<FId>& Out)
	{
		Out.clear();
		if (In.empty())
		{
			return true;
		}
		size_t Start = 0;
		while (true)
		{
			const size_t Comma = In.find(',', Start);
			const FId Id = In.substr(Start, Comma == std::string::npos ? std::string::npos : Comma - Start);
			if (!IsValidId(Id))
			{
				return false;
			}
			if (!ContainsId(Out, Id))
			{
				Out.push_back(Id);
			}
			if (Comma == std::string::npos)
			{
				return true;
			}
			Start = Comma + 1;
		}
	}

	static bool ParseInt64(const std::string& In, int64_t& Out)
	{
		if (In.empty() || In.size() > 19)
		{
			return false;
		}
		int64_t Value = 0;
		for (const char C : In)
		{
			if (C < '0' || C > '9')
			{
				return false;
			}
			const int64_t Digit = C - '0';
			if (Value > (std::numeric_limits<int64_t>::max() - Digit) / 10)
			{
				return false;
			}
			Value = Value * 10 + Digit;
		}
		Out = Value;
		return true;
	}

	std::string SerializeProfile(const FPlayerProfile& Profile)
	{
		std::string Out;
		Out += "uc_profile=" + std::to_string(FPlayerProfile::CurrentSchemaVersion) + "\n";
		Out += "player_id=" + Profile.PlayerId + "\n";
		Out += "display_name=" + EscapeText(Profile.DisplayName) + "\n";
		Out += "level=" + std::to_string(Profile.Level) + "\n";
		Out += "xp=" + std::to_string(Profile.Xp) + "\n";
		Out += "credits=" + std::to_string(Profile.Balance[static_cast<int32_t>(ECurrency::Credits)]) + "\n";
		Out += "premium=" + std::to_string(Profile.Balance[static_cast<int32_t>(ECurrency::Premium)]) + "\n";
		Out += "owned=" + JoinIds(Profile.OwnedItems) + "\n";
		Out += "vehicle=" + Profile.Loadout[static_cast<int32_t>(ELoadoutSlot::Vehicle)] + "\n";
		Out += "primary=" + Profile.Loadout[static_cast<int32_t>(ELoadoutSlot::PrimaryWeapon)] + "\n";
		Out += "secondary=" + Profile.Loadout[static_cast<int32_t>(ELoadoutSlot::SecondaryWeapon)] + "\n";
		Out += "missions=" + JoinIds(Profile.CompletedMissions) + "\n";
		Out += "tx=" + JoinIds(Profile.AppliedTransactions) + "\n";
		return Out;
	}

	bool DeserializeProfile(const std::string& Text, FPlayerProfile& OutProfile)
	{
		FPlayerProfile Parsed;
		bool bSawHeader = false;
		size_t Start = 0;
		while (Start < Text.size())
		{
			size_t End = Text.find('\n', Start);
			if (End == std::string::npos)
			{
				End = Text.size();
			}
			std::string Line = Text.substr(Start, End - Start);
			Start = End + 1;
			if (!Line.empty() && Line.back() == '\r')
			{
				Line.pop_back();
			}
			if (Line.empty())
			{
				continue;
			}
			const size_t Eq = Line.find('=');
			if (Eq == std::string::npos)
			{
				return false;
			}
			const std::string Key = Line.substr(0, Eq);
			const std::string Value = Line.substr(Eq + 1);
			int64_t Number = 0;

			if (Key == "uc_profile")
			{
				// Newer saves are refused rather than silently truncated; older ones migrate here.
				if (!ParseInt64(Value, Number) || Number < 1 || Number > FPlayerProfile::CurrentSchemaVersion)
				{
					return false;
				}
				bSawHeader = true;
			}
			else if (Key == "player_id")
			{
				if (!Value.empty() && !IsValidId(Value)) { return false; }
				Parsed.PlayerId = Value;
			}
			else if (Key == "display_name")
			{
				if (!UnescapeText(Value, Parsed.DisplayName)) { return false; }
			}
			else if (Key == "level")
			{
				if (!ParseInt64(Value, Number) || Number < 1 || Number > 100000) { return false; }
				Parsed.Level = static_cast<int32_t>(Number);
			}
			else if (Key == "xp")
			{
				if (!ParseInt64(Value, Parsed.Xp)) { return false; }
			}
			else if (Key == "credits" || Key == "premium")
			{
				if (!ParseInt64(Value, Number) || Number > MaxBalance) { return false; }
				Parsed.Balance[static_cast<int32_t>(Key == "credits" ? ECurrency::Credits : ECurrency::Premium)] = Number;
			}
			else if (Key == "owned")
			{
				if (!SplitIds(Value, Parsed.OwnedItems)) { return false; }
			}
			else if (Key == "vehicle" || Key == "primary" || Key == "secondary")
			{
				if (!Value.empty() && !IsValidId(Value)) { return false; }
				const ELoadoutSlot Slot = Key == "vehicle" ? ELoadoutSlot::Vehicle : (Key == "primary" ? ELoadoutSlot::PrimaryWeapon : ELoadoutSlot::SecondaryWeapon);
				Parsed.Loadout[static_cast<int32_t>(Slot)] = Value;
			}
			else if (Key == "missions")
			{
				if (!SplitIds(Value, Parsed.CompletedMissions)) { return false; }
			}
			else if (Key == "tx")
			{
				if (!SplitIds(Value, Parsed.AppliedTransactions)) { return false; }
			}
			// Unknown keys are ignored so older builds can read saves with additive fields.
		}
		if (!bSawHeader)
		{
			return false;
		}
		OutProfile = Parsed;
		return true;
	}
}
