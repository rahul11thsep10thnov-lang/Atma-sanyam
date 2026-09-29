import type { Region, StateType } from "../enums";
import type { StateRecord } from "../types";
import { slugify, stateId } from "../ids";

interface StateSeed {
  code: string; // ISO 3166-2:IN suffix
  name: string;
  type: StateType;
  capital: string;
  region: Region;
  lat: number; // capital coordinates
  lng: number;
  languages: string[];
  cities: string[];
  themes: string[];
}

const S = (
  code: string, name: string, type: StateType, capital: string, region: Region,
  lat: number, lng: number, languages: string[], cities: string[], themes: string[]
): StateSeed => ({ code, name, type, capital, region, lat, lng, languages, cities, themes });

/**
 * The 28 states + 8 union territories (post-2020 merger of Dadra & Nagar Haveli with Daman & Diu).
 * Codes follow ISO 3166-2:IN. Coordinates are the capital's. `region` follows the
 * North/East/West/Central/Northeast/South grouping used by the Incredible India portal.
 */
const SEEDS: StateSeed[] = [
  S("AP", "Andhra Pradesh", "STATE", "Amaravati", "South", 16.5131, 80.5165, ["Telugu"], ["Visakhapatnam", "Vijayawada", "Tirupati"], ["PILGRIMAGE", "BEACH", "HERITAGE"]),
  S("AR", "Arunachal Pradesh", "STATE", "Itanagar", "Northeast", 27.0844, 93.6053, ["English", "Hindi"], ["Tawang", "Ziro", "Itanagar"], ["MOUNTAIN", "TRIBAL", "ECO_TOURISM"]),
  S("AS", "Assam", "STATE", "Dispur", "Northeast", 26.1433, 91.7898, ["Assamese", "Bodo", "Bengali"], ["Guwahati", "Jorhat", "Kaziranga"], ["WILDLIFE", "NATURE", "CULTURAL"]),
  S("BR", "Bihar", "STATE", "Patna", "East", 25.5941, 85.1376, ["Hindi", "Maithili", "Bhojpuri"], ["Patna", "Gaya", "Bodh Gaya", "Nalanda"], ["BUDDHIST", "HISTORY", "PILGRIMAGE"]),
  S("CG", "Chhattisgarh", "STATE", "Raipur", "Central", 21.2514, 81.6296, ["Hindi", "Chhattisgarhi"], ["Raipur", "Bilaspur", "Jagdalpur"], ["TRIBAL", "NATURE", "WILDLIFE"]),
  S("GA", "Goa", "STATE", "Panaji", "West", 15.4909, 73.8278, ["Konkani", "Marathi", "English"], ["Panaji", "Margao", "Vasco da Gama"], ["BEACH", "HERITAGE", "NIGHTLIFE"]),
  S("GJ", "Gujarat", "STATE", "Gandhinagar", "West", 23.2156, 72.6369, ["Gujarati", "Hindi"], ["Ahmedabad", "Surat", "Vadodara", "Dwarka"], ["HERITAGE", "WILDLIFE", "PILGRIMAGE"]),
  S("HR", "Haryana", "STATE", "Chandigarh", "North", 30.7333, 76.7794, ["Hindi", "Haryanvi", "Punjabi"], ["Gurugram", "Faridabad", "Kurukshetra"], ["HISTORY", "FAMILY", "CULTURAL"]),
  S("HP", "Himachal Pradesh", "STATE", "Shimla", "North", 31.1048, 77.1734, ["Hindi", "Pahari"], ["Shimla", "Manali", "Dharamshala"], ["MOUNTAIN", "ADVENTURE", "HILL_STATION"]),
  S("JH", "Jharkhand", "STATE", "Ranchi", "East", 23.3441, 85.3096, ["Hindi", "Santali"], ["Ranchi", "Jamshedpur", "Deoghar"], ["TRIBAL", "NATURE", "PILGRIMAGE"]),
  S("KA", "Karnataka", "STATE", "Bengaluru", "South", 12.9716, 77.5946, ["Kannada"], ["Bengaluru", "Mysuru", "Hampi", "Mangaluru"], ["HERITAGE", "WILDLIFE", "BEACH"]),
  S("KL", "Kerala", "STATE", "Thiruvananthapuram", "South", 8.5241, 76.9366, ["Malayalam"], ["Kochi", "Thiruvananthapuram", "Munnar", "Alappuzha"], ["BACKWATERS", "WELLNESS", "NATURE"]),
  S("MP", "Madhya Pradesh", "STATE", "Bhopal", "Central", 23.2599, 77.4126, ["Hindi"], ["Bhopal", "Indore", "Khajuraho", "Ujjain"], ["HERITAGE", "WILDLIFE", "PILGRIMAGE"]),
  S("MH", "Maharashtra", "STATE", "Mumbai", "West", 19.076, 72.8777, ["Marathi"], ["Mumbai", "Pune", "Aurangabad", "Nashik"], ["HERITAGE", "BEACH", "PILGRIMAGE"]),
  S("MN", "Manipur", "STATE", "Imphal", "Northeast", 24.817, 93.9368, ["Meitei (Manipuri)", "English"], ["Imphal", "Ukhrul"], ["CULTURAL", "NATURE", "TRIBAL"]),
  S("ML", "Meghalaya", "STATE", "Shillong", "Northeast", 25.5788, 91.8933, ["Khasi", "Garo", "English"], ["Shillong", "Cherrapunji"], ["NATURE", "ECO_TOURISM", "ADVENTURE"]),
  S("MZ", "Mizoram", "STATE", "Aizawl", "Northeast", 23.7271, 92.7176, ["Mizo", "English"], ["Aizawl", "Lunglei"], ["NATURE", "TRIBAL", "RURAL"]),
  S("NL", "Nagaland", "STATE", "Kohima", "Northeast", 25.6751, 94.1086, ["English", "Nagamese"], ["Kohima", "Dimapur"], ["TRIBAL", "CULTURAL", "ADVENTURE"]),
  S("OD", "Odisha", "STATE", "Bhubaneswar", "East", 20.2961, 85.8245, ["Odia"], ["Bhubaneswar", "Puri", "Konark"], ["HERITAGE", "PILGRIMAGE", "BEACH"]),
  S("PB", "Punjab", "STATE", "Chandigarh", "North", 30.7333, 76.7794, ["Punjabi"], ["Amritsar", "Ludhiana", "Patiala"], ["PILGRIMAGE", "FOOD", "HISTORY"]),
  S("RJ", "Rajasthan", "STATE", "Jaipur", "North", 26.9124, 75.7873, ["Hindi", "Rajasthani"], ["Jaipur", "Udaipur", "Jodhpur", "Jaisalmer"], ["HERITAGE", "WILDLIFE", "CULTURAL"]),
  S("SK", "Sikkim", "STATE", "Gangtok", "Northeast", 27.3389, 88.6065, ["Nepali", "Sikkimese", "English"], ["Gangtok", "Pelling"], ["MOUNTAIN", "ADVENTURE", "MONASTERY"]),
  S("TN", "Tamil Nadu", "STATE", "Chennai", "South", 13.0827, 80.2707, ["Tamil"], ["Chennai", "Madurai", "Thanjavur", "Ooty"], ["PILGRIMAGE", "HERITAGE", "HILL_STATION"]),
  S("TG", "Telangana", "STATE", "Hyderabad", "South", 17.385, 78.4867, ["Telugu", "Urdu"], ["Hyderabad", "Warangal"], ["HERITAGE", "FOOD", "HISTORY"]),
  S("TR", "Tripura", "STATE", "Agartala", "Northeast", 23.8315, 91.2868, ["Bengali", "Kokborok"], ["Agartala", "Udaipur (Tripura)"], ["HERITAGE", "TRIBAL", "NATURE"]),
  S("UP", "Uttar Pradesh", "STATE", "Lucknow", "North", 26.8467, 80.9462, ["Hindi", "Urdu"], ["Lucknow", "Varanasi", "Agra", "Prayagraj", "Ayodhya"], ["PILGRIMAGE", "HERITAGE", "FOOD"]),
  S("UT", "Uttarakhand", "STATE", "Dehradun", "North", 30.3165, 78.0322, ["Hindi", "Garhwali", "Kumaoni"], ["Dehradun", "Rishikesh", "Haridwar", "Nainital"], ["PILGRIMAGE", "ADVENTURE", "MOUNTAIN"]),
  S("WB", "West Bengal", "STATE", "Kolkata", "East", 22.5726, 88.3639, ["Bengali"], ["Kolkata", "Darjeeling", "Siliguri"], ["HERITAGE", "HILL_STATION", "CULTURAL"]),

  S("AN", "Andaman and Nicobar Islands", "UNION_TERRITORY", "Port Blair", "South", 11.6234, 92.7265, ["Hindi", "English"], ["Port Blair", "Havelock"], ["BEACH", "ADVENTURE", "ECO_TOURISM"]),
  S("CH", "Chandigarh", "UNION_TERRITORY", "Chandigarh", "North", 30.7333, 76.7794, ["Hindi", "Punjabi", "English"], ["Chandigarh"], ["ARCHITECTURE", "FAMILY", "CULTURAL"]),
  S("DH", "Dadra and Nagar Haveli and Daman and Diu", "UNION_TERRITORY", "Daman", "West", 20.3974, 72.8328, ["Gujarati", "Hindi", "Marathi"], ["Daman", "Diu", "Silvassa"], ["BEACH", "HERITAGE", "FAMILY"]),
  S("DL", "Delhi", "UNION_TERRITORY", "New Delhi", "North", 28.6139, 77.209, ["Hindi", "English", "Punjabi", "Urdu"], ["New Delhi", "Old Delhi"], ["HERITAGE", "HISTORY", "FOOD"]),
  S("JK", "Jammu and Kashmir", "UNION_TERRITORY", "Srinagar (summer) / Jammu (winter)", "North", 34.0837, 74.7973, ["Kashmiri", "Dogri", "Urdu", "Hindi", "English"], ["Srinagar", "Jammu", "Pahalgam"], ["MOUNTAIN", "NATURE", "PILGRIMAGE"]),
  S("LA", "Ladakh", "UNION_TERRITORY", "Leh", "North", 34.1526, 77.5771, ["Ladakhi", "Hindi", "English"], ["Leh", "Kargil"], ["MOUNTAIN", "ADVENTURE", "MONASTERY"]),
  S("LD", "Lakshadweep", "UNION_TERRITORY", "Kavaratti", "South", 10.5667, 72.6417, ["Malayalam", "Jeseri", "Mahl"], ["Kavaratti", "Agatti"], ["BEACH", "ECO_TOURISM", "ADVENTURE"]),
  S("PY", "Puducherry", "UNION_TERRITORY", "Puducherry", "South", 11.9416, 79.8083, ["Tamil", "French", "English", "Telugu", "Malayalam"], ["Puducherry", "Karaikal"], ["HERITAGE", "SPIRITUAL", "BEACH"])
];

export const STATE_CODE_BY_NAME: Record<string, string> = Object.fromEntries(SEEDS.map((s) => [s.name, s.code]));

export function buildStates(nowIso: string): StateRecord[] {
  return SEEDS.map((s) => ({
    id: stateId(s.code),
    country_id: "IN",
    slug: slugify(s.name),
    name: s.name,
    official_name: s.type === "STATE" ? `State of ${s.name}` : `${s.name}`,
    type: s.type,
    iso_code: `IN-${s.code}`,
    capital: s.capital,
    region: s.region,
    sub_region: null,
    latitude: s.lat,
    longitude: s.lng,
    timezone: "Asia/Kolkata",
    official_tourism_url: null, // to be confirmed by an admin — never guessed
    official_government_url: null,
    description: null,
    short_description: null,
    languages: s.languages,
    major_cities: s.cities,
    major_tourism_themes: s.themes,
    status: "DATA_COLLECTION",
    created_at: nowIso,
    updated_at: nowIso
  }));
}
