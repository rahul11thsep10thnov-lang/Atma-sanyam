import type { Destination } from "@/lib/types";
import { placeholderImage } from "@/lib/data/placeholder";

export const varanasi: Destination = {
  id: "dest-varanasi",
  slug: "varanasi",
  name: "Varanasi",
  state: "Uttar Pradesh",
  stateSlug: "uttar-pradesh",
  district: "Varanasi",
  tagline: "The Eternal City on the Ganges",
  shortDescription:
    "One of the world's oldest continuously inhabited cities, Varanasi is a living centre of Hindu spirituality — a maze of ghats, temples and narrow lanes on the banks of the Ganga.",
  heroImage: placeholderImage("Varanasi — Ganga Ghats at dawn", 1600, 900),
  bestTimeToVisit: "October to March",
  popularity: 96,
  tags: ["spiritual", "heritage", "historical", "riverside"],
  latitude: 25.3176,
  longitude: 82.9739,
  introduction:
    "Varanasi (also known as Kashi and Banaras) is a city where daily life and ancient ritual are inseparable. Pilgrims and travellers alike come for the ghats that line the Ganga, the sound of temple bells at sunrise, and the Ganga Aarti that closes each evening. It is regarded by many Hindus as one of the holiest places on earth and a wish to die and be cremated here, attaining moksha, has drawn devotees for millennia.",
  history:
    "Varanasi is among the oldest continuously inhabited cities in the world, with settlement evidence going back over 3,000 years. It is mentioned in the Rigveda and features prominently in the Mahabharata and Puranic literature. The city has been a centre of learning, philosophy and Sanskrit scholarship for centuries, and was an important stop on trade routes across northern India. Nearby Sarnath is where the Buddha is believed to have delivered his first sermon after attaining enlightenment, cementing the wider region's importance to Buddhism as well as Hinduism.",
  geography:
    "Varanasi sits on the left (western) bank of the Ganga in the Gangetic plain of eastern Uttar Pradesh, where the Varuna and Assi streams meet the main river — giving the city its old name, Varanasi. The riverfront is defined by roughly 80 ghats (stepped embankments), while the old city behind them is a dense network of narrow lanes (galis) unsuited to motor traffic.",
  culture:
    "Varanasi is renowned for classical Hindustani music and the Banaras gharana of tabla and vocal music, for Sanskrit and philosophical scholarship centred around Banaras Hindu University, and for handicrafts — most famously Banarasi silk sarees woven with gold and silver zari thread. Life on the ghats — boatmen, priests, wrestlers at akhadas, sadhus, and pilgrims — is itself a living cultural spectacle.",
  religion:
    "Sacred to Hindus as the city of Shiva, Varanasi is home to the Kashi Vishwanath Temple, one of the twelve Jyotirlingas. It is also significant to Buddhists (nearby Sarnath), Jains (birthplace of the 23rd Tirthankara, Parshvanath, is associated with the region) and has a long-standing Muslim weaving community central to the Banarasi saree trade.",
  idealDuration: "2–4 days",
  approximateBudget: "₹1,500–₹6,000 per day per person (budget to comfort)",
  nearestAirport: "Lal Bahadur Shastri International Airport (VNS), ~26 km from the city centre",
  nearestRailwayStation: "Varanasi Junction (Varanasi Cantt), well connected to major Indian cities",
  bestKnownFor: ["Ganga Aarti", "Ghats", "Kashi Vishwanath Temple", "Banarasi silk", "Sarnath"],
  languages: ["Hindi", "Bhojpuri", "English (tourist areas)"],
  currency: "Indian Rupee (₹)",
  timeZone: "IST (UTC+5:30)",
  watermarkImages: [
    placeholderImage("Kashi Vishwanath Temple", 1600, 900),
    placeholderImage("Dashashwamedh Ghat Aarti", 1600, 900),
    placeholderImage("Assi Ghat sunrise", 1600, 900),
    placeholderImage("Sarnath stupa", 1600, 900)
  ],
  attractions: [
    {
      id: "attr-kashi-vishwanath",
      slug: "kashi-vishwanath-temple",
      name: "Kashi Vishwanath Temple",
      categories: ["religious", "historical"],
      description:
        "One of the twelve Jyotirlingas of Shiva and Varanasi's most important shrine. The present structure dates to 1780, built by Ahilyabai Holkar, with the gold-plated spire added later. The adjoining Kashi Vishwanath Corridor connects the temple directly to the Ganga ghats.",
      location: "Vishwanath Gali, Lahori Tola, Varanasi",
      geo: { lat: 25.3109, lng: 83.0107 },
      openingHours: "3:00 AM – 11:00 PM (timings vary for aarti sessions)",
      timeRequired: "1–2 hours",
      entryFee: "Free general darshan; paid Sugam Darshan tickets available for faster entry",
      bestVisitingTime: "Early morning (Mangala Aarti) or evening",
      mapUrl: "https://www.openstreetmap.org/search?query=Kashi%20Vishwanath%20Temple%20Varanasi",
      officialWebsite: "https://shrikashivishwanath.org",
      images: [placeholderImage("Kashi Vishwanath Temple spire", 1200, 800)],
      source: { label: "Shri Kashi Vishwanath Temple Trust" }
    },
    {
      id: "attr-dashashwamedh-ghat",
      slug: "dashashwamedh-ghat",
      name: "Dashashwamedh Ghat",
      categories: ["religious", "culture", "photography"],
      description:
        "Varanasi's most famous ghat, closest to Kashi Vishwanath Temple, and the venue for the nightly Ganga Aarti — a synchronised ritual of fire, bells and chanting performed by priests before large crowds.",
      location: "Dashashwamedh Ghat Road, Varanasi",
      geo: { lat: 25.3059, lng: 83.0105 },
      openingHours: "Open 24 hours; Ganga Aarti at sunset (approx. 6:00–7:15 PM, seasonal)",
      timeRequired: "1–2 hours for the aarti",
      entryFee: "Free (boat viewing costs extra)",
      bestVisitingTime: "Sunset for the aarti, sunrise for a quieter visit",
      mapUrl: "https://www.openstreetmap.org/search?query=Dashashwamedh%20Ghat",
      images: [placeholderImage("Dashashwamedh Ghat Ganga Aarti", 1200, 800)],
      source: { label: "Uttar Pradesh Tourism" }
    },
    {
      id: "attr-assi-ghat",
      slug: "assi-ghat",
      name: "Assi Ghat",
      categories: ["nature", "culture", "photography"],
      description:
        "The southernmost of the major ghats, at the confluence of the Assi stream and the Ganga. Popular for a calmer sunrise experience, morning yoga sessions and its own smaller aarti.",
      location: "Assi Ghat, Varanasi",
      geo: { lat: 25.2874, lng: 83.0064 },
      openingHours: "Open 24 hours",
      timeRequired: "1 hour",
      entryFee: "Free",
      bestVisitingTime: "Sunrise",
      mapUrl: "https://www.openstreetmap.org/search?query=Assi%20Ghat%20Varanasi",
      images: [placeholderImage("Assi Ghat sunrise boats", 1200, 800)],
      source: { label: "Uttar Pradesh Tourism" }
    },
    {
      id: "attr-sarnath",
      slug: "sarnath",
      name: "Sarnath",
      categories: ["historical", "religious", "museums"],
      description:
        "The site where the Buddha gave his first sermon after enlightenment. Home to the Dhamek Stupa, the ruins of ancient monasteries, and the Sarnath Archaeological Museum which houses the original Ashoka Lion Capital, India's national emblem.",
      location: "Sarnath, ~10 km northeast of Varanasi city centre",
      geo: { lat: 25.3811, lng: 83.0227 },
      openingHours: "Site: dawn to dusk; Museum: 9:00 AM – 5:00 PM (closed Fridays)",
      timeRequired: "2–3 hours",
      entryFee: "Nominal fee for the museum and monument complex (ASI-ticketed)",
      bestVisitingTime: "Morning",
      mapUrl: "https://www.openstreetmap.org/search?query=Sarnath",
      officialWebsite: "https://asi.nic.in",
      images: [placeholderImage("Dhamek Stupa Sarnath", 1200, 800)],
      source: { label: "Archaeological Survey of India (ASI)" }
    },
    {
      id: "attr-bhu",
      slug: "banaras-hindu-university",
      name: "Banaras Hindu University & Bharat Kala Bhavan",
      categories: ["culture", "museums", "photography"],
      description:
        "One of Asia's largest residential universities, its leafy campus houses the New Vishwanath Temple (open to all faiths) and the Bharat Kala Bhavan museum of miniature paintings, sculpture and textiles.",
      location: "BHU Campus, Varanasi",
      geo: { lat: 25.2677, lng: 82.9913 },
      openingHours: "Campus: daylight hours; museum timings vary by season",
      timeRequired: "2 hours",
      entryFee: "Museum: nominal entry fee",
      bestVisitingTime: "Late morning",
      images: [placeholderImage("Banaras Hindu University campus", 1200, 800)],
      source: { label: "Banaras Hindu University" }
    },
    {
      id: "attr-ramnagar-fort",
      slug: "ramnagar-fort",
      name: "Ramnagar Fort",
      categories: ["historical", "museums"],
      description:
        "An 18th-century sandstone fort on the eastern bank of the Ganga, seat of the former Kashi Naresh (King of Varanasi), with a museum of vintage cars, weapons and royal artefacts.",
      location: "Ramnagar, across the river from the main ghats",
      openingHours: "10:00 AM – 5:00 PM",
      timeRequired: "1–2 hours",
      entryFee: "Paid entry",
      bestVisitingTime: "Afternoon",
      images: [placeholderImage("Ramnagar Fort riverside", 1200, 800)],
      source: { label: "Kashi Naresh Trust" }
    }
  ],
  hotels: [
    {
      id: "hotel-taj-ganges",
      name: "Taj Ganges (representative luxury property)",
      category: "luxury",
      image: placeholderImage("Luxury heritage hotel Varanasi", 1200, 800),
      area: "The Mall, Cantonment",
      facilities: ["Pool", "Spa", "Multi-cuisine restaurant", "Airport transfer"],
      roomTypes: ["Deluxe", "Executive Suite"],
      distanceFromLandmark: "~6 km from Dashashwamedh Ghat",
      dataVerified: false
    },
    {
      id: "hotel-heritage-riverside",
      name: "Heritage riverside haveli (representative heritage property)",
      category: "heritage",
      image: placeholderImage("Heritage haveli overlooking ghats", 1200, 800),
      area: "Assi Ghat",
      facilities: ["River-view rooms", "Rooftop cafe"],
      roomTypes: ["Heritage Room", "River View Suite"],
      distanceFromLandmark: "On the ghats",
      dataVerified: false
    },
    {
      id: "hotel-midrange-cantt",
      name: "Business hotel near Cantt station (representative mid-range property)",
      category: "midRange",
      image: placeholderImage("Mid-range hotel Varanasi Cantt", 1200, 800),
      area: "Varanasi Cantonment",
      facilities: ["Restaurant", "Free Wi-Fi", "Airport pickup"],
      roomTypes: ["Standard", "Deluxe"],
      distanceFromLandmark: "1 km from Varanasi Junction",
      dataVerified: false
    },
    {
      id: "hotel-budget-godowlia",
      name: "Budget guesthouse near Godowlia (representative budget property)",
      category: "budget",
      image: placeholderImage("Budget guesthouse Godowlia", 1200, 800),
      area: "Godowlia, Old City",
      facilities: ["Rooftop restaurant", "Fan/AC rooms"],
      roomTypes: ["Single", "Double"],
      distanceFromLandmark: "5-minute walk to Dashashwamedh Ghat",
      dataVerified: false
    },
    {
      id: "hotel-homestay-bengali-tola",
      name: "Family homestay in Bengali Tola (representative homestay)",
      category: "homestays",
      image: placeholderImage("Homestay Bengali Tola lanes", 1200, 800),
      area: "Bengali Tola",
      facilities: ["Home-cooked meals", "Local host guidance"],
      roomTypes: ["Shared room", "Private room"],
      distanceFromLandmark: "Walking distance to the ghats",
      dataVerified: false
    }
  ],
  restaurants: [
    {
      id: "rest-kashi-chat-bhandar",
      name: "Kashi Chat Bhandar",
      categories: ["streetFood", "vegetarian", "localFood"],
      cuisine: ["Street food", "Chaat"],
      location: "Godowlia",
      openingHours: "10:00 AM – 10:00 PM",
      signatureDishes: ["Tamatar chaat", "Palak chaat"],
      vegNonVeg: "veg",
      mapUrl: "https://www.openstreetmap.org/search?query=Kashi%20Chat%20Bhandar%20Varanasi",
      dataVerified: false
    },
    {
      id: "rest-blue-lassi",
      name: "Blue Lassi Shop",
      categories: ["sweets", "streetFood", "vegetarian"],
      cuisine: ["Lassi", "Local sweets"],
      location: "Near Manikarnika Ghat, Kachori Gali",
      openingHours: "8:00 AM – 10:00 PM",
      signatureDishes: ["Fruit lassi", "Malai lassi"],
      vegNonVeg: "veg",
      dataVerified: false
    },
    {
      id: "rest-deenas-chowk",
      name: "Deena Chaat Bhandar",
      categories: ["streetFood", "vegetarian"],
      cuisine: ["Street food", "Chaat"],
      location: "Chowk",
      openingHours: "11:00 AM – 9:00 PM",
      signatureDishes: ["Tamatar chaat"],
      vegNonVeg: "veg",
      dataVerified: false
    },
    {
      id: "rest-riverfront-fine-dining",
      name: "Riverside multi-cuisine restaurant (representative fine dining)",
      categories: ["fineDining", "traditional"],
      cuisine: ["North Indian", "Continental"],
      location: "Assi Ghat area",
      openingHours: "12:00 PM – 11:00 PM",
      signatureDishes: ["Litti chokha", "Thali"],
      vegNonVeg: "both",
      dataVerified: false
    },
    {
      id: "rest-kachori-gali",
      name: "Kachori Gali eateries",
      categories: ["breakfast", "streetFood", "vegetarian"],
      cuisine: ["Kachori-sabzi", "Jalebi"],
      location: "Kachori Gali, Old City",
      openingHours: "6:00 AM – 12:00 PM (breakfast hours)",
      signatureDishes: ["Kachori-sabzi", "Jalebi"],
      vegNonVeg: "veg",
      dataVerified: false
    }
  ],
  markets: [
    {
      id: "market-vishwanath-gali",
      name: "Vishwanath Gali",
      location: "Adjacent to Kashi Vishwanath Temple",
      whatToBuy: ["Religious idols", "Rudraksha malas", "Brass items"],
      typicalPriceRange: "₹50–₹2,000",
      bargainingInfo: "Mild bargaining is common and expected",
      openingHours: "9:00 AM – 9:00 PM",
      famousProducts: ["Puja items", "Silver jewellery"]
    },
    {
      id: "market-thatheri-bazaar",
      name: "Thatheri Bazaar",
      location: "Old City, near Chowk",
      whatToBuy: ["Brass and copper utensils"],
      typicalPriceRange: "₹200–₹5,000",
      bargainingInfo: "Bargaining expected, especially for bulk purchases",
      openingHours: "10:00 AM – 8:00 PM",
      famousProducts: ["Handcrafted brassware"]
    },
    {
      id: "market-godowlia",
      name: "Godowlia Market",
      location: "Central Old City, near Dashashwamedh Ghat",
      whatToBuy: ["Banarasi silk sarees", "Stoles", "Handicrafts"],
      typicalPriceRange: "₹500–₹25,000+ (silk sarees vary widely by zari content)",
      bargainingInfo: "Bargaining common; compare a few shops before committing on silk",
      openingHours: "10:00 AM – 9:00 PM",
      famousProducts: ["Banarasi silk sarees"]
    }
  ],
  localFoods: [
    {
      id: "food-kachori-sabzi",
      name: "Kachori Sabzi",
      type: "breakfast",
      description: "A classic Banarasi breakfast of deep-fried lentil kachoris served with spiced potato curry.",
      whereToTry: ["Kachori Gali"]
    },
    {
      id: "food-tamatar-chaat",
      name: "Tamatar Chaat",
      type: "street-food",
      description: "A tangy tomato-based chaat unique to Varanasi, distinct from typical North Indian chaats.",
      whereToTry: ["Kashi Chat Bhandar", "Deena Chaat Bhandar"]
    },
    {
      id: "food-banarasi-paan",
      name: "Banarasi Paan",
      type: "sweet",
      description: "Betel leaf preparation famous across India, with Varanasi considered its spiritual home.",
      whereToTry: ["Godowlia", "Chowk"]
    },
    {
      id: "food-lassi",
      name: "Malaiyo / Lassi",
      type: "drink",
      description: "Malaiyo is a winter-only saffron-milk foam dessert; thick lassi is served year-round in earthen kulhads.",
      whereToTry: ["Blue Lassi Shop"]
    }
  ],
  emergencyContacts: [
    { label: "All-in-one Emergency (Police/Fire/Ambulance)", number: "112", scope: "national" },
    { label: "Police", number: "100", scope: "national" },
    { label: "Fire", number: "101", scope: "national" },
    { label: "Ambulance", number: "102 / 108", scope: "national" },
    { label: "Women Helpline", number: "1091", scope: "national" },
    { label: "Tourist Helpline (Incredible India)", number: "1800-11-1363", scope: "national" },
    { label: "Railway Enquiry", number: "139", scope: "national" },
    { label: "Uttar Pradesh Tourist Police, Varanasi", number: "Contact via Varanasi Commissionerate", scope: "local" },
    { label: "Varanasi District Disaster Management Authority", number: "Contact via UP DDMA directory", scope: "local" }
  ],
  transportation: {
    nearestAirport: "Lal Bahadur Shastri International Airport (VNS), ~26 km from city centre; prepaid taxis and app cabs available",
    nearestRailwayStation: "Varanasi Junction (Varanasi Cantt) and Banaras (BSB), both well connected nationally",
    majorBusStations: ["Varanasi Cantt Bus Station (UPSRTC)"],
    roadConnectivity: "Connected via NH19 (Delhi–Kolkata) and NH35; well linked to Lucknow, Prayagraj and Gorakhpur",
    taxiInfo: "Prepaid taxi counters at airport and station; app-based cabs operate in the city",
    localTransport: ["Auto-rickshaw", "Cycle-rickshaw", "E-rickshaw", "City buses"],
    autoRickshaw: "Widely available; agree on fare or insist on the meter before starting",
    rentalVehicles: "Self-drive and chauffeur-driven rentals available near the Cantt area",
    fromDelhi: "~12–14 hours by road (NH19), ~2 hours by air, or overnight train (approx. 10–13 hours)"
  },
  festivals: [
    { id: "fest-dev-deepawali", name: "Dev Deepawali", month: "November (Kartik Purnima)", description: "Lakhs of oil lamps are lit along every ghat, considered the city's most spectacular festival." },
    { id: "fest-maha-shivratri", name: "Maha Shivratri", month: "February/March", description: "Major celebration at Kashi Vishwanath Temple with processions and all-night worship." },
    { id: "fest-ganga-mahotsav", name: "Ganga Mahotsav", month: "November", description: "A five-day cultural festival of classical music and dance on the ghats." }
  ],
  localCustoms: [
    "Dress modestly, especially around temples and ghats.",
    "Remove footwear before entering temples.",
    "Photography of cremation ceremonies at Manikarnika and Harishchandra Ghats is considered highly disrespectful — avoid it.",
    "It's customary to ask before photographing sadhus, priests or pilgrims performing rituals."
  ],
  safety: [
    "Stay alert for touts near the ghats and temple approaches offering 'special' entry or guide services.",
    "Agree on boat fares before boarding; official rate boards are posted at major ghats.",
    "The old city lanes are narrow and can be crowded — keep valuables secure.",
    "Drink bottled or filtered water."
  ],
  faqs: [
    { question: "How many days are enough for Varanasi?", answer: "Most travellers find 2–3 days sufficient to cover the ghats, Kashi Vishwanath Temple and a half-day trip to Sarnath; add a day for a more unhurried pace." },
    { question: "Is Varanasi safe for solo and women travellers?", answer: "Varanasi is generally safe for tourists, but exercise normal city precautions — avoid poorly lit lanes late at night and use registered taxis or prepaid auto stands." },
    { question: "What is the best time to see the Ganga Aarti?", answer: "Arrive at Dashashwamedh Ghat by 5:30–6:00 PM to get a good spot; the aarti itself runs roughly 6:00–7:15 PM depending on the season." }
  ],
  nearbyDestinations: [
    { slug: "prayagraj", name: "Prayagraj", state: "Uttar Pradesh", distanceKm: 121 },
    { slug: "ayodhya", name: "Ayodhya", state: "Uttar Pradesh", distanceKm: 200 },
    { slug: "lucknow", name: "Lucknow", state: "Uttar Pradesh", distanceKm: 286 }
  ],
  hiddenPlaces: [
    "Man Mandir Observatory — a lesser-visited Mughal-era astronomical observatory on the ghats.",
    "Alamgir Mosque (Beni Madhav ka Darera) — built on the site of an older Vishnu temple, overlooking Panchganga Ghat.",
    "Ram Nagar's old-town lanes across the river, largely untouched by tourist crowds."
  ],
  suggestedItineraryDays: [1, 2, 3],
  source: [
    { label: "Uttar Pradesh Tourism", url: "https://uptourism.gov.in" },
    { label: "Archaeological Survey of India", url: "https://asi.nic.in" },
    { label: "Ministry of Tourism, Government of India", url: "https://tourism.gov.in" }
  ],
  isSampleData: true
};
