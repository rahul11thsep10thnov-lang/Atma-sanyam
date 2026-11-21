#include "UCStrings.h"

#include "Internationalization/StringTableCore.h"
#include "Internationalization/StringTableRegistry.h"

namespace UCStrings
{
	static const TCHAR* TableId = TEXT("ST_HUD");

	void RegisterTables()
	{
		LOCTABLE_NEW(TableId, TEXT("UnrealCombat"));
#define UC_STR(Key, Text) LOCTABLE_SETSTRING(TableId, TEXT(Key), TEXT(Text));
#include "UCStringData.inl"
#undef UC_STR
	}

	FText Get(const TCHAR* Key)
	{
		return FText::FromStringTable(FName(TableId), Key);
	}
}
