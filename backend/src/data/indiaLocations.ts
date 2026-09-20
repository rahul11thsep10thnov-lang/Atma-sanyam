// Reference data for the India → State → District location filter (spec
// §20/§21). No GPS is ever used — this is a static picker data source.
// District lists cover the major/most-populous districts per state/UT so
// the MVP filter is useful immediately; admins can extend a state's
// district list via the admin API without a code change (the Location
// table itself is free-form: state/district/city).

export interface StateDefinition {
  name: string;
  isUnionTerritory: boolean;
  districts: string[];
}

export const INDIA_STATES: StateDefinition[] = [
  { name: "Andhra Pradesh", isUnionTerritory: false, districts: ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Nellore", "Kurnool"] },
  { name: "Arunachal Pradesh", isUnionTerritory: false, districts: ["Itanagar", "Tawang", "Papum Pare"] },
  { name: "Assam", isUnionTerritory: false, districts: ["Guwahati", "Dibrugarh", "Silchar", "Jorhat", "Nagaon", "Tezpur"] },
  { name: "Bihar", isUnionTerritory: false, districts: ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga", "Purnia"] },
  { name: "Chhattisgarh", isUnionTerritory: false, districts: ["Raipur", "Bilaspur", "Durg", "Bastar", "Korba"] },
  { name: "Goa", isUnionTerritory: false, districts: ["North Goa", "South Goa"] },
  { name: "Gujarat", isUnionTerritory: false, districts: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar"] },
  { name: "Haryana", isUnionTerritory: false, districts: ["Gurugram", "Faridabad", "Panipat", "Hisar", "Rohtak", "Ambala"] },
  { name: "Himachal Pradesh", isUnionTerritory: false, districts: ["Shimla", "Kangra", "Mandi", "Solan"] },
  { name: "Jharkhand", isUnionTerritory: false, districts: ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro"] },
  { name: "Karnataka", isUnionTerritory: false, districts: ["Bengaluru Urban", "Mysuru", "Mangaluru", "Hubballi-Dharwad", "Belagavi", "Kalaburagi"] },
  { name: "Kerala", isUnionTerritory: false, districts: ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Malappuram"] },
  { name: "Madhya Pradesh", isUnionTerritory: false, districts: ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain"] },
  { name: "Maharashtra", isUnionTerritory: false, districts: ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Thane"] },
  { name: "Manipur", isUnionTerritory: false, districts: ["Imphal East", "Imphal West"] },
  { name: "Meghalaya", isUnionTerritory: false, districts: ["East Khasi Hills", "West Garo Hills"] },
  { name: "Mizoram", isUnionTerritory: false, districts: ["Aizawl", "Lunglei"] },
  { name: "Nagaland", isUnionTerritory: false, districts: ["Kohima", "Dimapur"] },
  { name: "Odisha", isUnionTerritory: false, districts: ["Bhubaneswar", "Cuttack", "Rourkela", "Puri", "Sambalpur"] },
  { name: "Punjab", isUnionTerritory: false, districts: ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda"] },
  { name: "Rajasthan", isUnionTerritory: false, districts: ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Bikaner"] },
  { name: "Sikkim", isUnionTerritory: false, districts: ["East Sikkim", "West Sikkim"] },
  { name: "Tamil Nadu", isUnionTerritory: false, districts: ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli"] },
  { name: "Telangana", isUnionTerritory: false, districts: ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar"] },
  { name: "Tripura", isUnionTerritory: false, districts: ["West Tripura", "Gomati"] },
  { name: "Uttar Pradesh", isUnionTerritory: false, districts: ["Lucknow", "Prayagraj", "Kanpur", "Varanasi", "Agra", "Ghaziabad", "Meerut", "Noida"] },
  { name: "Uttarakhand", isUnionTerritory: false, districts: ["Dehradun", "Haridwar", "Nainital"] },
  { name: "West Bengal", isUnionTerritory: false, districts: ["Kolkata", "Howrah", "Durgapur", "Siliguri", "Asansol"] },
  { name: "Andaman and Nicobar Islands", isUnionTerritory: true, districts: ["Port Blair"] },
  { name: "Chandigarh", isUnionTerritory: true, districts: ["Chandigarh"] },
  { name: "Dadra and Nagar Haveli and Daman and Diu", isUnionTerritory: true, districts: ["Daman", "Diu", "Silvassa"] },
  { name: "Delhi", isUnionTerritory: true, districts: ["New Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi"] },
  { name: "Jammu and Kashmir", isUnionTerritory: true, districts: ["Srinagar", "Jammu", "Anantnag", "Baramulla"] },
  { name: "Ladakh", isUnionTerritory: true, districts: ["Leh", "Kargil"] },
  { name: "Lakshadweep", isUnionTerritory: true, districts: ["Kavaratti"] },
  { name: "Puducherry", isUnionTerritory: true, districts: ["Puducherry", "Karaikal"] },
];

export const ALL_INDIA = "All India";
