// Source of truth for the FOCUS Plant Library: 100 plants widely grown on
// Indian balconies. `npm run plants:manifest` turns these rows into
// assets/plants/FOCUS_PLANT_LIBRARY/plant_manifest.json, which the app
// imports and every generator script reads. Edit here, then regenerate.
//
// Row: [name, botanicalName, category, indoor, outdoor, growthForm, rootType, leafColor, accentColor, hint]
//   growthForm  — silhouette family the placeholder renderer draws and the
//                 image prompt describes (see docs/PLANT_LIBRARY.md).
//   rootType    — root morphology the cutaway must show for this species.
//   accentColor — dominant flower / fruit colour, or null for foliage-only.
//   hint        — one sentence of botanical detail appended to the prompt.

export const CATEGORIES = {
  flowering: 'Flowering plants',
  foliage: 'Indian ornamental / foliage plants',
  succulent: 'Succulents / cacti',
  herb: 'Herbs / edible balcony plants',
  specialty: 'Tropical / specialty / showpiece plants',
};

export const SPECIES = [
  // ---- FLOWERING (001–030) --------------------------------------------------
  ['Rose', 'Rosa hybrida', 'flowering', false, true, 'shrub', 'fine-branching', '#3f6b3a', '#c8324a', 'Thorny woody canes, pinnate glossy leaves, a few fully open layered blooms in deep red.'],
  ['Jasmine', 'Jasminum officinale', 'flowering', false, true, 'vine', 'fibrous', '#4a7a44', '#fbf7ee', 'Slender twining stems, pinnate leaves, clusters of small white star-shaped fragrant flowers.'],
  ['Arabian Jasmine', 'Jasminum sambac (Mogra)', 'flowering', false, true, 'shrub', 'fibrous', '#3d6f3b', '#fdfaf2', 'Compact bush, ovate glossy leaves, rounded white multi-petalled mogra flowers and buds.'],
  ['Hibiscus', 'Hibiscus rosa-sinensis', 'flowering', false, true, 'shrub', 'fine-branching', '#376b36', '#e8412e', 'Upright shrub, serrated ovate leaves, one or two large five-petalled red trumpet flowers with a long stamen column.'],
  ['Marigold', 'Tagetes erecta (Genda)', 'flowering', false, true, 'bushy', 'fibrous', '#4c7d3e', '#f2a31b', 'Bushy annual with feathery pinnate leaves and dense pom-pom orange-yellow flower heads.'],
  ['Bougainvillea', 'Bougainvillea glabra', 'flowering', false, true, 'vine', 'woody', '#3e6b3c', '#d9318a', 'Woody scrambling stems with thorns, small ovate leaves, masses of papery magenta bracts around tiny white flowers.'],
  ['Ixora', 'Ixora coccinea', 'flowering', false, true, 'shrub', 'fibrous', '#2f5f32', '#e7442c', 'Dense evergreen shrub, leathery dark leaves, rounded clusters of small four-petalled scarlet flowers.'],
  ['Gardenia', 'Gardenia jasminoides', 'flowering', false, true, 'shrub', 'fibrous', '#2e5c33', '#fbf8f0', 'Glossy dark-green ovate leaves, large creamy white double rose-like fragrant flowers.'],
  ['Periwinkle', 'Catharanthus roseus (Sadabahar)', 'flowering', false, true, 'bushy', 'taproot', '#3f703e', '#e26ca3', 'Neat bushy plant, glossy oblong leaves with a pale midrib, flat five-petalled pink flowers with a darker eye.'],
  ['Chrysanthemum', 'Chrysanthemum morifolium (Guldaudi)', 'flowering', false, true, 'bushy', 'fibrous', '#4a7a3f', '#f3c431', 'Bushy plant with lobed leaves and many-layered yellow flower heads.'],
  ['Gerbera', 'Gerbera jamesonii', 'flowering', false, true, 'rosette', 'fibrous', '#3f7340', '#f0612d', 'Basal rosette of lobed hairy leaves, a few tall leafless stalks each holding one large orange daisy flower.'],
  ['Petunia', 'Petunia × atkinsiana', 'flowering', false, true, 'bushy', 'fibrous', '#4e7d47', '#9a3fb8', 'Low mounding plant, soft sticky leaves, many funnel-shaped purple flowers.'],
  ['Portulaca', 'Portulaca grandiflora (Moss rose)', 'flowering', false, true, 'bushy', 'shallow', '#5b8a4a', '#f06a2b', 'Low spreading succulent stems, cylindrical fleshy leaves, bright orange rose-like flowers.'],
  ['Zinnia', 'Zinnia elegans', 'flowering', false, true, 'bushy', 'fibrous', '#4a7a3f', '#e03a5f', 'Upright stems with opposite rough leaves and layered dahlia-like pink-red flower heads.'],
  ['Dahlia', 'Dahlia pinnata', 'flowering', false, true, 'bushy', 'tuberous', '#3f6e3b', '#d22f4e', 'Sturdy stems, pinnate leaves, a large perfectly layered crimson pompon flower; tuberous roots.'],
  ['Cosmos', 'Cosmos bipinnatus', 'flowering', false, true, 'bushy', 'fibrous', '#5a8c4e', '#e86aa8', 'Airy plant with very fine feathery leaves and simple eight-petalled pink daisy flowers on thin stems.'],
  ['Calendula', 'Calendula officinalis', 'flowering', false, true, 'bushy', 'taproot', '#5c8a4a', '#f29a1c', 'Soft spatulate aromatic leaves and bright orange many-rayed flower heads.'],
  ['Dianthus', 'Dianthus chinensis', 'flowering', false, true, 'bushy', 'fibrous', '#5f8f6e', '#e04a7a', 'Grey-green grassy foliage and fringed pink flowers with a darker centre ring.'],
  ['Impatiens', 'Impatiens walleriana (Balsam)', 'flowering', true, true, 'bushy', 'fibrous', '#4a7e43', '#f26a8d', 'Succulent translucent stems, serrated leaves, flat five-petalled coral-pink flowers covering the plant.'],
  ['Begonia', 'Begonia semperflorens', 'flowering', true, true, 'bushy', 'fibrous', '#3d6b40', '#e85a7a', 'Fleshy stems, glossy rounded asymmetric leaves with a bronze tint, clusters of small pink flowers.'],
  ['Adenium', 'Adenium obesum (Desert Rose)', 'flowering', false, true, 'caudex', 'fleshy', '#4f7f45', '#e5486a', 'Swollen sculptural grey caudex, thick branches, glossy oblong leaves at the tips, pink-red trumpet flowers.'],
  ['Kalanchoe', 'Kalanchoe blossfeldiana', 'flowering', true, true, 'bushy', 'shallow', '#3f7a3b', '#e8402e', 'Thick scalloped succulent leaves and dense clusters of tiny four-petalled red flowers.'],
  ['Plumeria', 'Plumeria rubra (Frangipani / Champa)', 'flowering', false, true, 'tree', 'woody', '#4b7d44', '#fbe9c2', 'Thick grey branching stems with whorls of long leaves at the tips and clusters of creamy five-petalled flowers with yellow centres.'],
  ['Rangoon Creeper', 'Combretum indicum (Madhumalti)', 'flowering', false, true, 'vine', 'woody', '#3f703b', '#e05a7a', 'Vigorous twining vine, elliptic leaves, drooping clusters of slender tubular flowers aging from white through pink to red.'],
  ['Crossandra', 'Crossandra infundibuliformis (Kanakambaram)', 'flowering', true, true, 'bushy', 'fibrous', '#2f5e33', '#f58a3a', 'Glossy wavy-edged dark leaves and spikes of fan-shaped apricot-orange flowers.'],
  ['Oleander', 'Nerium oleander (Kaner)', 'flowering', false, true, 'shrub', 'woody', '#486f44', '#ee6f9a', 'Upright multi-stemmed shrub, long narrow leathery leaves in whorls, clusters of five-petalled pink flowers.'],
  ['Butterfly Pea', 'Clitoria ternatea (Aparajita)', 'flowering', false, true, 'vine', 'taproot', '#4a7a44', '#2b4ec4', 'Twining pea vine with pinnate leaflets and vivid deep-blue single flowers with a pale throat.'],
  ['Tuberose', 'Agave amica (Rajnigandha)', 'flowering', false, true, 'blades', 'bulb', '#5a8c4a', '#fbf9f1', 'Grassy strap leaves from a bulb and a tall spike of waxy white tubular flowers.'],
  ['Canna Lily', 'Canna indica', 'flowering', false, true, 'broadleaf', 'rhizome', '#3f7a3e', '#e8502a', 'Large banana-like paddle leaves on upright stems topped by orange-red flower spikes; rhizomatous roots.'],
  ['Lily', 'Lilium (Asiatic lily)', 'flowering', false, true, 'blades', 'bulb', '#4f8043', '#f0a1b8', 'Single upright stem ringed with narrow leaves, topped by large six-petalled pink lily flowers; bulb with basal roots.'],
  // ---- FOLIAGE (031–060) ----------------------------------------------------
  ['Money Plant', 'Epipremnum aureum (Golden Pothos)', 'foliage', true, true, 'vine', 'adventitious', '#4f8a3f', null, 'Trailing and climbing vine with heart-shaped green leaves splashed with golden-yellow variegation; aerial roots at the nodes.'],
  ['Marble Queen Pothos', 'Epipremnum aureum ‘Marble Queen’', 'foliage', true, false, 'vine', 'adventitious', '#5f8f5a', null, 'Trailing vine with heart-shaped leaves heavily marbled cream-white and green.'],
  ['Heartleaf Philodendron', 'Philodendron hederaceum', 'foliage', true, false, 'vine', 'adventitious', '#2f5f33', null, 'Trailing vine of glossy deep-green heart-shaped leaves on slim stems.'],
  ['Monstera', 'Monstera deliciosa', 'foliage', true, true, 'broadleaf', 'adventitious', '#2e6436', null, 'Huge glossy leaves deeply split and perforated with characteristic holes; thick stems with aerial roots.'],
  ['Monstera adansonii', 'Monstera adansonii (Swiss cheese vine)', 'foliage', true, false, 'vine', 'adventitious', '#386d3a', null, 'Climbing vine with smaller oval leaves perforated by many oval holes.'],
  ['Rubber Plant', 'Ficus elastica', 'foliage', true, true, 'tree', 'woody', '#244b2a', null, 'Single upright stem with large thick glossy oval dark-green leaves and a red new-leaf sheath.'],
  ['Fiddle Leaf Fig', 'Ficus lyrata', 'foliage', true, false, 'tree', 'woody', '#2f6033', null, 'Upright woody stem with very large leathery violin-shaped leaves with prominent veins.'],
  ['Weeping Fig', 'Ficus benjamina', 'foliage', true, true, 'tree', 'woody', '#386b38', null, 'Small tree with pale bark, arching branches and many small glossy pointed leaves.'],
  ['Chinese Banyan', 'Ficus microcarpa', 'foliage', true, true, 'tree', 'woody', '#2f6033', null, 'Thick trunk with aerial roots, dense crown of small glossy oval leaves.'],
  ['Croton', 'Codiaeum variegatum', 'foliage', true, true, 'shrub', 'fibrous', '#5a7a2c', '#e0712a', 'Upright shrub with leathery leaves boldly veined and blotched in yellow, orange and red.'],
  ['Dracaena marginata', 'Dracaena marginata', 'foliage', true, false, 'cane', 'fibrous', '#3f7a44', '#b7384a', 'Slender woody canes topped with tufts of long narrow leaves edged in red.'],
  ['Corn Plant', 'Dracaena fragrans', 'foliage', true, false, 'cane', 'fibrous', '#4a8a3f', null, 'Thick cane with a rosette of long arching glossy leaves with a lighter central stripe.'],
  ['Snake Plant', 'Dracaena trifasciata (Sansevieria)', 'foliage', true, true, 'blades', 'rhizome', '#3f6b3a', null, 'Stiff upright sword-shaped leaves with grey-green banding and yellow margins; thick rhizomes.'],
  ['ZZ Plant', 'Zamioculcas zamiifolia', 'foliage', true, false, 'feather', 'tuberous', '#2d5c33', null, 'Arching stems of glossy pinnate leaflets rising from swollen underground tubers.'],
  ['Peace Lily', 'Spathiphyllum wallisii', 'foliage', true, false, 'broadleaf', 'fibrous', '#2b5a31', '#fbfaf3', 'Clump of glossy lance leaves and a white hooded spathe around a cream spadix.'],
  ['Spider Plant', 'Chlorophytum comosum', 'foliage', true, true, 'grass', 'tuberous', '#6a9a4a', null, 'Fountain of long arching striped green-and-white leaves with a runner carrying a small plantlet; fleshy tuberous roots.'],
  ['Areca Palm', 'Dypsis lutescens', 'foliage', true, true, 'palm', 'fibrous', '#5a9a44', null, 'Clustering golden-stemmed palm with many feathery arching fronds.'],
  ['Kentia Palm', 'Howea forsteriana', 'foliage', true, false, 'palm', 'fibrous', '#2f6636', null, 'Elegant palm with a few long gracefully drooping dark-green pinnate fronds.'],
  ['Bamboo Palm', 'Chamaedorea seifrizii', 'foliage', true, true, 'palm', 'fibrous', '#3f7a3b', null, 'Clump of slender bamboo-like canes with narrow feathery fronds.'],
  ['Lady Palm', 'Rhapis excelsa', 'foliage', true, true, 'palm', 'fibrous', '#2f6a35', null, 'Clustering palm with fibrous stems and fan-shaped leaves split into blunt finger-like segments.'],
  ['Parlor Palm', 'Chamaedorea elegans', 'foliage', true, false, 'palm', 'fibrous', '#4a8a44', null, 'Small delicate palm with light-green feathery fronds on thin stems.'],
  ['Bird of Paradise', 'Strelitzia reginae', 'foliage', true, true, 'broadleaf', 'fleshy', '#2f6a3a', '#f5931c', 'Fan of long-stalked banana-like leaves and a crane-shaped orange-and-blue flower.'],
  ['Calathea', 'Goeppertia orbifolia', 'foliage', true, false, 'broadleaf', 'rhizome', '#2f6a38', null, 'Clump of large rounded leaves striped silver-green with purple undersides.'],
  ['Prayer Plant', 'Maranta leuconeura', 'foliage', true, false, 'broadleaf', 'rhizome', '#3f7a3a', '#c23a4a', 'Low plant with oval leaves patterned in dark green with red herringbone veins.'],
  ['Dieffenbachia', 'Dieffenbachia seguine', 'foliage', true, false, 'broadleaf', 'fibrous', '#4a8a3f', null, 'Thick cane with large oblong leaves splashed cream and pale green.'],
  ['Aglaonema', 'Aglaonema commutatum', 'foliage', true, false, 'broadleaf', 'fibrous', '#3f7a44', '#e0506a', 'Clump of lance-shaped leaves marbled silver, green and pink.'],
  ['Syngonium', 'Syngonium podophyllum', 'foliage', true, false, 'vine', 'adventitious', '#5a9a52', null, 'Climbing vine with arrowhead-shaped leaves in pale green with white veins.'],
  ['Alocasia', 'Alocasia × amazonica', 'foliage', true, false, 'broadleaf', 'rhizome', '#1f4a2c', null, 'Dramatic upright arrow-shaped glossy dark leaves with bold white veins and scalloped edges.'],
  ['Anthurium', 'Anthurium andraeanum', 'foliage', true, false, 'broadleaf', 'fibrous', '#2f6a38', '#e0323a', 'Heart-shaped glossy leaves and a lacquered red heart-shaped spathe with a cream spadix.'],
  ['Fittonia', 'Fittonia albivenis (Nerve plant)', 'foliage', true, false, 'bushy', 'fibrous', '#2f6a38', '#e86a8a', 'Low creeping plant with small oval leaves netted in pink veins.'],
  // ---- SUCCULENTS / CACTI (061–070) ----------------------------------------
  ['Aloe Vera', 'Aloe vera', 'succulent', true, true, 'rosette', 'fleshy', '#5f9a5a', null, 'Rosette of thick fleshy grey-green toothed leaves; thick fibrous roots.'],
  ['Haworthia', 'Haworthiopsis attenuata', 'succulent', true, false, 'rosette', 'fleshy', '#3f6b40', null, 'Small tight rosette of pointed dark leaves speckled with white tubercles.'],
  ['Echeveria', 'Echeveria elegans', 'succulent', true, true, 'rosette', 'shallow', '#8fb3a6', null, 'Perfect rosette of plump pale blue-green leaves with pink tips.'],
  ['Jade Plant', 'Crassula ovata', 'succulent', true, true, 'shrub', 'shallow', '#4f8a44', null, 'Thick brown branching trunk with plump glossy oval jade leaves edged red.'],
  ['Sedum', 'Sedum morganianum (Burro’s tail)', 'succulent', true, true, 'trailing', 'shallow', '#8fb59a', null, 'Trailing stems densely packed with plump blue-green bead-like leaves.'],
  ['String of Pearls', 'Curio rowleyanus', 'succulent', true, false, 'trailing', 'shallow', '#5a9a4f', null, 'Thin trailing threads strung with round pea-like green beads.'],
  ['String of Hearts', 'Ceropegia woodii', 'succulent', true, false, 'trailing', 'tuberous', '#6a8a6a', '#b45a7a', 'Thin purple trailing threads with small silver-marbled heart-shaped leaves.'],
  ['Zebra Haworthia', 'Haworthiopsis fasciata', 'succulent', true, false, 'rosette', 'fleshy', '#2f5f36', null, 'Rosette of stiff pointed leaves with raised white horizontal stripes on the backs.'],
  ['Christmas Cactus', 'Schlumbergera truncata', 'succulent', true, false, 'cactusSegment', 'fibrous', '#4a8a4a', '#e8407a', 'Arching chains of flat scalloped stem segments ending in tubular magenta flowers.'],
  ['Prickly Pear', 'Opuntia ficus-indica (Nagphani)', 'succulent', false, true, 'cactusPad', 'shallow', '#5f9a5a', '#f0c030', 'Stack of flat oval green pads studded with spine clusters and a yellow flower on top; shallow spreading roots.'],
  // ---- HERBS / EDIBLES (071–085) -------------------------------------------
  ['Tulsi', 'Ocimum tenuiflorum (Holy Basil)', 'herb', true, true, 'bushy', 'fibrous', '#4f8a3f', '#9a5fb0', 'Aromatic bushy herb with ovate toothed leaves, purple-tinged stems and small purple flower spikes.'],
  ['Mint', 'Mentha spicata (Pudina)', 'herb', true, true, 'bushy', 'rhizome', '#4a9a3f', null, 'Square stems with bright-green wrinkled toothed leaves; spreading underground runners.'],
  ['Coriander', 'Coriandrum sativum (Dhania)', 'herb', true, true, 'bushy', 'taproot', '#5a9a4a', null, 'Soft lacy bright-green leaves on thin stems; a slender taproot.'],
  ['Curry Leaf', 'Murraya koenigii (Kadi patta)', 'herb', false, true, 'tree', 'woody', '#2f6a35', null, 'Small tree with pinnate aromatic dark-green leaflets on woody stems.'],
  ['Lemongrass', 'Cymbopogon citratus', 'herb', false, true, 'grass', 'fibrous', '#7aa85a', null, 'Dense clump of tall arching grass blades from a bulbous base; dense fibrous roots.'],
  ['Rosemary', 'Salvia rosmarinus', 'herb', false, true, 'shrub', 'fibrous', '#4f7a5a', '#8aa0d8', 'Woody upright shrub with needle-like grey-green leaves and tiny pale-blue flowers.'],
  ['Thyme', 'Thymus vulgaris', 'herb', false, true, 'bushy', 'fibrous', '#5f8a5a', null, 'Low woody mound of tiny grey-green oval leaves.'],
  ['Oregano', 'Origanum vulgare', 'herb', false, true, 'bushy', 'rhizome', '#4f8a44', null, 'Spreading mound of small rounded soft leaves on square stems.'],
  ['Indian Borage', 'Plectranthus amboinicus (Ajwain patta)', 'herb', true, true, 'bushy', 'fibrous', '#6a9a5a', null, 'Thick fleshy velvety scalloped leaves on succulent stems.'],
  ['Fenugreek', 'Trigonella foenum-graecum (Methi)', 'herb', true, true, 'bushy', 'taproot', '#5a9a4a', null, 'Soft upright stems with clover-like trifoliate leaves; replaces the duplicate lemongrass entry.'],
  ['Green Chilli', 'Capsicum annuum (Hari mirch)', 'herb', false, true, 'bushy', 'taproot', '#3f7a3a', '#3f9a2f', 'Branching bush with smooth lance leaves and slender glossy green chillies hanging down.'],
  ['Tomato', 'Solanum lycopersicum', 'herb', false, true, 'bushy', 'taproot', '#4f8a3f', '#e03a2a', 'Hairy sprawling stems with compound leaves and trusses of red ripe and green tomatoes.'],
  ['Strawberry', 'Fragaria × ananassa', 'herb', false, true, 'rosette', 'fibrous', '#3f7a3a', '#d8282f', 'Low rosette of trifoliate serrated leaves, white flowers and red strawberries on short runners.'],
  ['Dwarf Lemon', 'Citrus × limon (dwarf)', 'herb', false, true, 'tree', 'woody', '#2f6a35', '#f2d23a', 'Small citrus tree with glossy leaves, white blossom and a few ripe yellow lemons.'],
  ['Dwarf Orange', 'Citrus reticulata (dwarf, Santra)', 'herb', false, true, 'tree', 'woody', '#2f6a35', '#f0882a', 'Small citrus tree with glossy leaves and round orange fruit.'],
  // ---- SPECIALTY / SHOWPIECE (086–100) -------------------------------------
  ['Banana Plant', 'Musa acuminata (dwarf)', 'specialty', false, true, 'broadleaf', 'rhizome', '#4a9a3f', null, 'Thick pseudostem with enormous paddle-shaped leaves; corm-like rhizome with cord roots.'],
  ['Dwarf Papaya', 'Carica papaya (dwarf)', 'specialty', false, true, 'tree', 'taproot', '#4a8a3f', '#f0a02a', 'Single straight stem crowned with large deeply lobed leaves on long stalks and small green-orange fruit at the top.'],
  ['Guava Bonsai', 'Psidium guajava (bonsai)', 'specialty', false, true, 'bonsai', 'compact', '#3f7a3a', null, 'Bonsai with smooth mottled peeling bark, a tapered trunk and small oval leaves on layered pads.'],
  ['Ficus Bonsai', 'Ficus retusa (bonsai)', 'specialty', true, true, 'bonsai', 'compact', '#2f6033', null, 'Classic ficus bonsai with a thick tapered trunk, aerial roots and dense small-leaved pads.'],
  ['Bougainvillea Bonsai', 'Bougainvillea (bonsai)', 'specialty', false, true, 'bonsai', 'compact', '#3f6b3c', '#d9318a', 'Gnarled twisted trunk, small leaves and magenta bracts on a bonsai silhouette.'],
  ['Jade Bonsai', 'Crassula ovata (bonsai)', 'specialty', true, true, 'bonsai', 'compact', '#4f8a44', null, 'Thick succulent trunk pruned into a tree shape with plump jade leaves.'],
  ['Juniper Bonsai', 'Juniperus procumbens (bonsai)', 'specialty', false, true, 'bonsai', 'compact', '#3f6a4a', null, 'Windswept juniper bonsai with twisted trunk, deadwood and scaly blue-green foliage pads.'],
  ['Schefflera Bonsai', 'Schefflera arboricola (bonsai)', 'specialty', true, true, 'bonsai', 'compact', '#3f7a3a', null, 'Bonsai with a banyan-like trunk, aerial roots and umbrella-shaped palmate leaves.'],
  ['Fukien Tea Bonsai', 'Carmona retusa (bonsai)', 'specialty', true, true, 'bonsai', 'compact', '#2f6033', '#fbfaf3', 'Bonsai with rough grey bark, tiny glossy leaves and tiny white flowers.'],
  ['Elephant Bush Bonsai', 'Portulacaria afra (bonsai)', 'specialty', true, true, 'bonsai', 'compact', '#5a9a4f', null, 'Red-brown succulent stems pruned into a bonsai shape with tiny round fleshy leaves.'],
  ['Bird’s Nest Fern', 'Asplenium nidus', 'specialty', true, false, 'fern', 'fibrous', '#5a9a3f', null, 'Rosette of broad bright-green wavy undivided fronds rising from a dark fuzzy centre.'],
  ['Boston Fern', 'Nephrolepis exaltata', 'specialty', true, false, 'fern', 'fibrous', '#4a8a3f', null, 'Fountain of long arching fronds with many small leaflets.'],
  ['Maidenhair Fern', 'Adiantum raddianum', 'specialty', true, false, 'fern', 'rhizome', '#5f9a52', null, 'Delicate fan-shaped leaflets on thin wiry black stems.'],
  ['Lucky Bamboo', 'Dracaena sanderiana', 'specialty', true, false, 'cane', 'fibrous', '#5a9a4a', null, 'Several jointed green canes, some spiralled, with narrow leaves at the tops.'],
  ['Norfolk Island Pine', 'Araucaria heterophylla', 'specialty', true, true, 'conifer', 'fibrous', '#3f7a44', null, 'Symmetrical tiers of horizontal branches with soft needle-like foliage, a small living Christmas tree.'],
];

export const ROOT_TYPES = {
  'fine-branching': 'fine, many-branched roots spreading evenly',
  fibrous: 'a dense mat of fine fibrous roots',
  taproot: 'one thick central taproot with sparse side roots',
  woody: 'thick woody roots spreading wide with finer root hairs',
  adventitious: 'fine adventitious roots sprouting from the stem nodes',
  rhizome: 'horizontal creeping rhizomes with fibrous roots below',
  shallow: 'a shallow wide-spreading net of thin roots',
  compact: 'a compact fine root pad as pruned for bonsai',
  tuberous: 'swollen tuberous roots among finer roots',
  fleshy: 'thick fleshy roots',
  bulb: 'a bulb with a basal plate of short roots',
};

export function slugify(name) {
  return name
    .normalize('NFKD')
    .replace(/[‘’'’]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

export function manifestRows() {
  return SPECIES.map((row, i) => {
    const [name, botanicalName, category, indoor, outdoor, growthForm, rootType, leafColor, accentColor, hint] = row;
    const id = i + 1;
    const num = String(id).padStart(3, '0');
    return {
      id,
      name,
      botanicalName,
      filename: `${num}_${slugify(name)}.png`,
      category,
      indoor,
      outdoor,
      growthForm,
      rootType,
      leafColor,
      accentColor,
      hint,
    };
  });
}
