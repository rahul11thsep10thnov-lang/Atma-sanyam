package com.wholesoul.app.data.mock

import com.wholesoul.app.domain.model.FlowerInfo
import com.wholesoul.app.domain.model.FreshnessInfo
import com.wholesoul.app.domain.model.Product
import com.wholesoul.app.domain.model.ProductCategory
import kotlin.math.roundToInt
import kotlin.random.Random

/**
 * Deterministic, in-memory product catalog used by every mock repository (spec section 27).
 * Nothing here is fetched from a network; swapping to a real backend only means replacing
 * [MockProductRepository] — this object and the [Product] shape stay the same.
 */
object MockProductData {

    private val farms = listOf(
        "Nashik Farms Collective", "Ratnagiri Growers", "Coorg Estates", "Punjab Mandi Direct",
        "Ooty Hill Farms", "Nagpur Orchard Co-op", "Malwa Valley Farmers", "Palakkad Growers Union",
    )

    private val brands = listOf(
        "WholeSoul Fresh", "Farm Direct", "Desi Roots", "Mandi Fresh", "Pure Harvest", "Local Basket",
    )

    private fun slug(name: String) = name.lowercase().replace(Regex("[^a-z0-9]+"), "-").trim('-')

    private fun freshness(random: Random) = FreshnessInfo(
        harvestedDaysAgo = random.nextInt(1, 4),
        sourceFarm = farms[random.nextInt(farms.size)],
        qualityGrade = listOf("Grade A", "Premium", "Farm Select").random(random),
    )

    private fun flowerInfo(random: Random, name: String) = FlowerInfo(
        flowerType = name,
        weightPerBunchGrams = random.nextInt(80, 260),
        approxCount = random.nextInt(15, 120),
        useCase = listOf("Daily puja", "Home decor", "Festive occasions", "Temple offering", "Gifting").random(random),
    )

    private fun benefitsFor(category: ProductCategory, random: Random): List<String> = when (category) {
        ProductCategory.FRUITS -> listOf("Rich in vitamins", "No artificial ripening", "Hand-picked at source")
        ProductCategory.VEGETABLES -> listOf("Pesticide-checked", "Sourced within 24-48 hrs", "High fiber content")
        ProductCategory.FLOWERS, ProductCategory.GARLANDS -> listOf("Freshly strung", "Long lasting fragrance", "Sourced from local flower markets")
        ProductCategory.PUJA_ITEMS -> listOf("Traditionally sourced", "Pure and unadulterated")
        ProductCategory.DAIRY -> listOf("Chilled supply chain", "No preservatives added")
        else -> listOf("Quality checked", "Great value for money")
    }.shuffled(random).take(2)

    private data class WeightPlan(val unit: String, val labels: List<String>)

    private val weightPlans = mapOf(
        ProductCategory.FRUITS to WeightPlan("kg", listOf("500 g", "1 kg", "250 g", "1 kg (6-8 pcs)")),
        ProductCategory.VEGETABLES to WeightPlan("kg", listOf("500 g", "1 kg", "250 g")),
        ProductCategory.FLOWERS to WeightPlan("bunch", listOf("1 bunch (100 g)", "1 bunch (250 g)", "1 bunch (50 g)")),
        ProductCategory.GARLANDS to WeightPlan("piece", listOf("1 piece", "2 pieces", "1 piece (36 inch)")),
        ProductCategory.PUJA_ITEMS to WeightPlan("pack", listOf("1 pack", "100 g", "1 set", "250 g")),
        ProductCategory.GROCERY to WeightPlan("kg", listOf("1 kg", "500 g", "200 g", "5 kg")),
        ProductCategory.DAIRY to WeightPlan("l", listOf("500 ml", "1 L", "200 g", "250 g")),
        ProductCategory.SNACKS to WeightPlan("pack", listOf("150 g", "200 g", "100 g")),
        ProductCategory.BEVERAGES to WeightPlan("l", listOf("1 L", "500 ml", "200 ml", "2 L")),
        ProductCategory.HOUSEHOLD to WeightPlan("unit", listOf("500 ml", "1 L", "1 unit", "200 g")),
        ProductCategory.PERSONAL_CARE to WeightPlan("unit", listOf("100 ml", "200 g", "1 unit", "50 g")),
        ProductCategory.OTHER to WeightPlan("pack", listOf("1 pack", "1 unit")),
    )

    private val priceRanges = mapOf(
        ProductCategory.FRUITS to (30.0 to 220.0),
        ProductCategory.VEGETABLES to (15.0 to 90.0),
        ProductCategory.FLOWERS to (20.0 to 150.0),
        ProductCategory.GARLANDS to (40.0 to 300.0),
        ProductCategory.PUJA_ITEMS to (10.0 to 250.0),
        ProductCategory.GROCERY to (25.0 to 450.0),
        ProductCategory.DAIRY to (20.0 to 280.0),
        ProductCategory.SNACKS to (10.0 to 120.0),
        ProductCategory.BEVERAGES to (15.0 to 150.0),
        ProductCategory.HOUSEHOLD to (30.0 to 350.0),
        ProductCategory.PERSONAL_CARE to (40.0 to 450.0),
        ProductCategory.OTHER to (25.0 to 200.0),
    )

    private fun buildCategory(
        category: ProductCategory,
        subCategory: String,
        names: List<String>,
        originLabel: String,
    ): List<Product> {
        val random = Random(category.ordinal * 7919 + subCategory.hashCode())
        val plan = weightPlans[category]!!
        val (minPrice, maxPrice) = priceRanges[category]!!

        return names.mapIndexed { index, name ->
            val mrp = (minPrice + (maxPrice - minPrice) * random.nextDouble()).let { (it / 5.0).roundToInt() * 5.0 }
            val discountPercent = random.nextInt(0, 5) * 8 // 0, 8, 16, 24, 32
            val price = (mrp * (1 - discountPercent / 100.0)).let { (it / 1.0).roundToInt().toDouble() }
            val stock = if (random.nextInt(20) == 0) 0 else random.nextInt(8, 250)
            val weightLabel = plan.labels[index % plan.labels.size]

            Product(
                id = "${category.name.lowercase()}-${slug(name)}-$index",
                name = name,
                category = category,
                subCategory = subCategory,
                description = "Fresh $name sourced directly from $originLabel, delivered to your doorstep with minimal handling for maximum freshness.",
                imageKey = "${category.name.lowercase()}/${slug(name)}",
                mrp = mrp,
                price = price,
                unit = plan.unit,
                weightLabel = weightLabel,
                rating = (3.5f + random.nextFloat() * 1.4f).let { (it * 10).roundToInt() / 10f },
                reviewCount = random.nextInt(3, 980),
                stock = stock,
                brand = brands[random.nextInt(brands.size)],
                tags = listOfNotNull(
                    subCategory.takeIf { it.isNotBlank() },
                    "fresh".takeIf { category == ProductCategory.FRUITS || category == ProductCategory.VEGETABLES },
                    name.split(" ").first().lowercase(),
                ),
                origin = originLabel,
                freshnessInfo = if (category == ProductCategory.FRUITS || category == ProductCategory.VEGETABLES) freshness(random) else null,
                flowerInfo = if (category == ProductCategory.FLOWERS || category == ProductCategory.GARLANDS) flowerInfo(random, name) else null,
                availableQuantities = plan.labels.distinct(),
                benefits = benefitsFor(category, random),
            )
        }
    }

    private val fruitNames = listOf(
        "Mango Alphonso", "Mango Kesar", "Banana Robusta", "Banana Yelakki", "Apple Shimla",
        "Apple Fuji", "Papaya", "Watermelon", "Muskmelon", "Pineapple",
        "Pomegranate", "Guava", "Orange Nagpur", "Mosambi", "Kiwi",
        "Grapes Green", "Grapes Black", "Strawberry", "Chikoo", "Litchi",
        "Dragon Fruit", "Custard Apple", "Jackfruit", "Coconut", "Lemon",
        "Sweet Lime", "Plum", "Peach", "Pear", "Fig",
        "Avocado", "Blueberry", "Cherry", "Star Fruit", "Jamun",
        "Ber", "Amla", "Tender Coconut", "Orange Valencia", "Banana Nendran",
        "Apple Kashmir", "Melon Orange", "Passion Fruit", "Rambutan", "Mulberry",
        "Wood Apple", "Kokum", "Sitaphal", "Raw Mango", "Apple Green",
    )

    private val vegetableNames = listOf(
        "Tomato", "Potato", "Onion", "Garlic", "Ginger",
        "Green Chilli", "Capsicum Green", "Capsicum Red", "Capsicum Yellow", "Cauliflower",
        "Cabbage", "Carrot", "Beetroot", "Radish", "Brinjal",
        "Bottle Gourd", "Ridge Gourd", "Bitter Gourd", "Snake Gourd", "Pumpkin",
        "Cucumber", "Lady Finger (Bhindi)", "French Beans", "Cluster Beans", "Green Peas",
        "Spinach (Palak)", "Fenugreek Leaves (Methi)", "Coriander Leaves", "Mint Leaves", "Curry Leaves",
        "Spring Onion", "Drumstick", "Raw Banana", "Sweet Corn", "Baby Corn",
        "Sweet Potato", "Yam", "Colocasia", "Turnip", "Broccoli",
        "Red Cabbage", "Lettuce Iceberg", "Celery", "Leek", "Zucchini",
        "Mushroom Button", "Banana Flower", "Ivy Gourd (Tindora)", "Elephant Yam (Suran)", "Ash Gourd",
    )

    private val flowerNames = listOf(
        "Rose Red", "Rose Pink", "Rose White", "Marigold Orange", "Marigold Yellow",
        "Jasmine (Mogra)", "Lotus", "Lily White", "Lily Pink", "Chrysanthemum Yellow",
        "Chrysanthemum White", "Orchid Purple", "Tuberose (Rajnigandha)", "Hibiscus", "Sunflower",
        "Gerbera Mixed", "Carnation Red", "Carnation Pink", "Gladiolus", "Tulip",
        "Ixora", "Champa", "Parijat", "Kadamba", "Ashoka Flower",
        "Shevanti", "Zinnia", "Cosmos", "Balsam", "Aster",
    )

    private val garlandNames = listOf(
        "Marigold Garland Small", "Marigold Garland Large", "Rose Garland", "Mixed Flower Garland", "Tulsi Mala",
        "Jasmine Garland", "Lotus Garland", "Sandalwood Garland", "Rudraksha Mala", "Betel Leaf Garland",
        "Genda Phool Mala", "Mogra Mala", "Kanakambaram Mala", "Vaddanam Flower Mala", "Crossandra Garland",
        "Marigold Rose Mix Garland", "Bridal Flower Garland", "Temple Decoration Garland", "Car Puja Garland", "Door Toran (Bandhanwar)",
    )

    private val pujaNames = listOf(
        "Agarbatti Sandalwood", "Agarbatti Rose", "Dhoop Sticks", "Camphor (Kapoor)", "Cotton Wicks (Baati)",
        "Puja Diya Clay", "Brass Diya", "Ghee Diya Oil", "Kumkum", "Haldi Powder",
        "Chandan Powder", "Chandan Tika", "Rice (Akshat)", "Coconut Whole", "Betel Nut (Supari)",
        "Betel Leaves (Paan)", "Panchamrit Ingredients Set", "Holy Thread (Kalava)", "Havan Samagri", "Sacred Ash (Vibhuti)",
        "Rudraksha Bead", "Puja Thali Set", "Incense Holder", "Bell (Ghanti) Brass", "Conch Shell (Shankh)",
        "Yagna Kund Small", "Puja Cotton Cloth (Vastra)", "Rangoli Colors", "Ganga Jal", "Puja Oil (Til)",
    )

    private val groceryNames = listOf(
        "Basmati Rice", "Sona Masoori Rice", "Toor Dal", "Moong Dal", "Chana Dal",
        "Urad Dal", "Masoor Dal", "Rajma", "Kabuli Chana", "Besan",
        "Wheat Flour (Atta)", "Maida", "Rava (Suji)", "Poha", "Sugar",
        "Jaggery", "Salt", "Mustard Oil", "Sunflower Oil", "Groundnut Oil",
        "Ghee", "Turmeric Powder", "Red Chilli Powder", "Coriander Powder", "Cumin Seeds",
        "Mustard Seeds", "Garam Masala", "Black Pepper", "Tea Leaves", "Coffee Powder",
        "Poppy Seeds", "Tamarind", "Dry Red Chilli", "Bay Leaf", "Cardamom",
        "Cloves", "Cinnamon", "Asafoetida (Hing)", "Vermicelli", "Sabudana",
        "Papad", "Pickle Mango", "Pickle Mixed", "Honey", "Peanuts Raw",
        "Cashew Nuts", "Almonds", "Raisins", "Dates", "Instant Noodles",
    )

    private val householdNames = listOf(
        "Dish Wash Liquid", "Dish Wash Bar", "Detergent Powder", "Detergent Liquid", "Toilet Cleaner",
        "Floor Cleaner", "Glass Cleaner", "Room Freshener", "Mosquito Repellent", "Broom",
        "Mop", "Scrub Pad", "Garbage Bags", "Aluminium Foil", "Cling Wrap",
        "Tissue Paper", "Toilet Paper Roll", "Candles", "Matchbox", "Clothes Hanger",
        "Laundry Basket", "Bucket Plastic", "Mug Plastic", "Storage Container Set", "Steel Wire Scrub",
        "Naphthalene Balls", "Shoe Polish", "Air Freshener Spray", "Hand Wash Refill", "Multi-Purpose Cleaner",
    )

    private val personalCareNames = listOf(
        "Shampoo", "Conditioner", "Body Wash", "Bathing Soap", "Face Wash",
        "Toothpaste", "Toothbrush", "Mouthwash", "Hair Oil", "Body Lotion",
        "Face Cream", "Sunscreen", "Talcum Powder", "Deodorant", "Perfume",
        "Razor", "Shaving Cream", "Hair Comb", "Sanitary Pads", "Cotton Buds",
        "Hand Sanitizer", "Face Wipes", "Lip Balm", "Nail Cutter Set", "Hair Gel",
        "Beard Oil", "Aftershave Lotion", "Baby Powder", "Baby Oil", "Baby Wipes",
    )

    private val dairyNames = listOf(
        "Toned Milk", "Full Cream Milk", "Curd", "Paneer", "Butter",
        "Cheese Slices", "Cheese Cube", "Flavoured Milk", "Buttermilk (Chaas)", "Fresh Cream",
        "Yogurt", "Milk Powder", "Ice Cream Vanilla", "Ice Cream Chocolate", "Khoya",
        "Malai", "Lassi Sweet", "Lassi Salted", "Condensed Milk", "Cow Ghee",
    )

    private val snackNames = listOf(
        "Potato Chips", "Banana Chips", "Namkeen Mixture", "Bhujia", "Peanut Masala",
        "Popcorn", "Glucose Biscuits", "Cream Biscuits", "Rusk", "Chocolate Bar",
        "Cookies", "Nachos", "Sev Puri Mix", "Murukku", "Chakli",
        "Khakhra", "Mathri", "Granola Bar", "Trail Mix", "Roasted Chana",
    )

    private val beverageNames = listOf(
        "Mineral Water", "Soda", "Cola", "Lemonade", "Orange Juice",
        "Mango Juice", "Mixed Fruit Juice", "Coconut Water", "Green Tea", "Black Tea",
        "Instant Coffee Sachets", "Energy Drink", "Masala Chaas", "Rose Sharbat", "Lemon Iced Tea",
        "Cold Brew Coffee", "Herbal Tea", "Flavoured Soda", "Health Drink Powder", "Buttermilk Drink",
    )

    private val otherNames = listOf(
        "Handmade Soap Bar", "Clay Water Pot", "Bamboo Basket", "Jute Shopping Bag", "Terracotta Diya Set",
        "Handloom Cotton Towel", "Wooden Chopping Board", "Coir Doormat", "Palm Leaf Plate Set", "Clay Cooking Pot",
    )

    val allProducts: List<Product> by lazy {
        buildCategory(ProductCategory.FRUITS, "Fresh Fruits", fruitNames, "local orchards") +
            buildCategory(ProductCategory.VEGETABLES, "Fresh Vegetables", vegetableNames, "nearby farms") +
            buildCategory(ProductCategory.FLOWERS, "Fresh Flowers", flowerNames, "local flower markets") +
            buildCategory(ProductCategory.GARLANDS, "Garlands & Malas", garlandNames, "local flower artisans") +
            buildCategory(ProductCategory.PUJA_ITEMS, "Puja Essentials", pujaNames, "trusted puja suppliers") +
            buildCategory(ProductCategory.GROCERY, "Grocery & Staples", groceryNames, "regional mandis") +
            buildCategory(ProductCategory.DAIRY, "Dairy", dairyNames, "local dairies") +
            buildCategory(ProductCategory.SNACKS, "Snacks", snackNames, "trusted snack makers") +
            buildCategory(ProductCategory.BEVERAGES, "Beverages", beverageNames, "regional bottlers") +
            buildCategory(ProductCategory.HOUSEHOLD, "Household Essentials", householdNames, "trusted household brands") +
            buildCategory(ProductCategory.PERSONAL_CARE, "Personal Care", personalCareNames, "trusted personal-care brands") +
            buildCategory(ProductCategory.OTHER, "Local Specialties", otherNames, "local artisans")
    }
}
