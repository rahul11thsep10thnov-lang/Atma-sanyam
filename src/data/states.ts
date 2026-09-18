import { StateInfo, StateCode } from "@/types";

export const STATES: StateInfo[] = [
  {
    code: "up",
    name: "Uttar Pradesh",
    hinglishName: "UP",
    capital: "Lucknow",
    formationYear: 1950,
    officialLanguages: ["Hindi"],
    totalDistricts: 75,
    highCourt: "Allahabad High Court",
    policeBoardName: "Uttar Pradesh Police Recruitment and Promotion Board",
    policeBoardShort: "UPPRPB",
  },
  {
    code: "mp",
    name: "Madhya Pradesh",
    hinglishName: "MP",
    capital: "Bhopal",
    formationYear: 1956,
    officialLanguages: ["Hindi"],
    totalDistricts: 55,
    highCourt: "Madhya Pradesh High Court (Jabalpur)",
    policeBoardName: "Madhya Pradesh Police (Employees Selection Board)",
    policeBoardShort: "ESB MP",
  },
  {
    code: "rajasthan",
    name: "Rajasthan",
    hinglishName: "Rajasthan",
    capital: "Jaipur",
    formationYear: 1949,
    officialLanguages: ["Hindi"],
    totalDistricts: 50,
    highCourt: "Rajasthan High Court (Jodhpur)",
    policeBoardName: "Rajasthan Police / RSMSSB",
    policeBoardShort: "RSMSSB",
  },
  {
    code: "bihar",
    name: "Bihar",
    hinglishName: "Bihar",
    capital: "Patna",
    formationYear: 1912,
    officialLanguages: ["Hindi"],
    totalDistricts: 38,
    highCourt: "Patna High Court",
    policeBoardName: "Bihar Police Subordinate Services Commission / Central Selection Board of Constable",
    policeBoardShort: "BPSSC / CSBC",
  },
  {
    code: "jharkhand",
    name: "Jharkhand",
    hinglishName: "Jharkhand",
    capital: "Ranchi",
    formationYear: 2000,
    officialLanguages: ["Hindi"],
    totalDistricts: 24,
    highCourt: "Jharkhand High Court",
    policeBoardName: "Jharkhand Staff Selection Commission",
    policeBoardShort: "JSSC",
  },
  {
    code: "uttarakhand",
    name: "Uttarakhand",
    hinglishName: "Uttarakhand",
    capital: "Dehradun (interim)",
    formationYear: 2000,
    officialLanguages: ["Hindi"],
    totalDistricts: 13,
    highCourt: "Uttarakhand High Court (Nainital)",
    policeBoardName: "Uttarakhand Police Recruitment Board",
    policeBoardShort: "UKPRB",
  },
  {
    code: "haryana",
    name: "Haryana",
    hinglishName: "Haryana",
    capital: "Chandigarh",
    formationYear: 1966,
    officialLanguages: ["Hindi"],
    totalDistricts: 22,
    highCourt: "Punjab & Haryana High Court (Chandigarh)",
    policeBoardName: "Haryana Staff Selection Commission",
    policeBoardShort: "HSSC",
  },
  {
    code: "punjab",
    name: "Punjab",
    hinglishName: "Punjab",
    capital: "Chandigarh",
    formationYear: 1966,
    officialLanguages: ["Punjabi"],
    totalDistricts: 23,
    highCourt: "Punjab & Haryana High Court (Chandigarh)",
    policeBoardName: "Punjab Police Recruitment Board",
    policeBoardShort: "PPRB",
  },
  {
    code: "chhattisgarh",
    name: "Chhattisgarh",
    hinglishName: "Chhattisgarh",
    capital: "Raipur",
    formationYear: 2000,
    officialLanguages: ["Hindi"],
    totalDistricts: 33,
    highCourt: "Chhattisgarh High Court (Bilaspur)",
    policeBoardName: "Chhattisgarh Police / Chhattisgarh Vyapam (CGPEB)",
    policeBoardShort: "CGPEB",
  },
];

export const STATE_MAP: Record<StateCode, StateInfo> = STATES.reduce(
  (acc, s) => {
    acc[s.code] = s;
    return acc;
  },
  {} as Record<StateCode, StateInfo>
);

export function getState(code: string): StateInfo | undefined {
  return STATE_MAP[code as StateCode];
}
