// Every species the Paradise Garden can grow: five segments, 84 plants.
// A species is a kind of plant; a grown plant is an instance of one (see
// model.ts). Rarity gates what the catalog offers as the garden fills.
import { PlantGrowthSize } from '../growth/size';

export type SegmentId = 'flowers' | 'trees' | 'indoor' | 'fruits' | 'herbs';
export const SEGMENTS: SegmentId[] = ['flowers', 'trees', 'indoor', 'fruits', 'herbs'];

export type Rarity = 'common' | 'uncommon' | 'rare';

/** Plants grown in a segment before a rarity becomes available there. */
export const RARITY_UNLOCK: Record<Rarity, number> = { common: 0, uncommon: 3, rare: 10 };

/** What kind of thing it is: decides where the landscaper puts it. */
export type Habit = 'ground' | 'shrub' | 'tree' | 'pot' | 'vine' | 'water';

export interface Species {
  id: string;
  name: string;
  scientificName: string;
  segment: SegmentId;
  rarity: Rarity;
  habit: Habit;
  /** One or two sentences, botanical and warm. */
  description: string;
  /** What appears with size: buds, fruit, a thicker trunk. */
  progression: string;
}

const F = 'flowers', T = 'trees', I = 'indoor', V = 'fruits', H = 'herbs';

export const SPECIES: Species[] = [
  // ---- flowers ---------------------------------------------------------------------------
  { id: 'rose', name: 'Rose', scientificName: 'Rosa', segment: F, rarity: 'common', habit: 'shrub', description: 'The classic garden rose: glossy leaflets, thorned canes and layered crimson blooms with a sweet scent.', progression: 'Leaves first, then buds at size 4 and a bush covered in blooms by size 7.' },
  { id: 'jasmine', name: 'Jasmine', scientificName: 'Jasminum sambac', segment: F, rarity: 'common', habit: 'shrub', description: 'Mogra: small white stars that open at dusk and perfume the whole garden.', progression: 'A leafy mound that fills with white flowers from size 4.' },
  { id: 'marigold', name: 'Marigold', scientificName: 'Tagetes erecta', segment: F, rarity: 'common', habit: 'pot', description: 'Genda: tough, cheerful orange pom-poms in a terracotta pot, the flower of every festival.', progression: 'Ferny leaves, then more and bigger flower heads with every size.' },
  { id: 'hibiscus', name: 'Hibiscus', scientificName: 'Hibiscus rosa-sinensis', segment: F, rarity: 'common', habit: 'shrub', description: 'Gudhal: big red trumpets with a long golden stamen, each lasting a single day.', progression: 'Glossy leaves, then scarlet trumpets from size 4; a tall flowering bush by size 7.' },
  { id: 'lotus', name: 'Lotus', scientificName: 'Nelumbo nucifera', segment: F, rarity: 'uncommon', habit: 'water', description: 'Kamal: round leaves that shed water like mercury and pink flowers that rise above the pond.', progression: 'Floating leaves first, then one, two, then many blooms above the bowl.' },
  { id: 'lily', name: 'Pink Lily', scientificName: 'Lilium orientalis', segment: F, rarity: 'common', habit: 'ground', description: 'Tall stems of strap leaves crowned with wide pink trumpets, freckled and fragrant.', progression: 'A clump of leaves, then flowering stems from size 4; six or more trumpets by size 7.' },
  { id: 'orchid', name: 'Orchid', scientificName: 'Phalaenopsis', segment: F, rarity: 'rare', habit: 'pot', description: 'Moth orchid: thick leaves and arching sprays of violet flowers that last for months.', progression: 'Leaves in a glazed pot, then flower spikes from size 4.' },
  { id: 'tulip', name: 'Tulip', scientificName: 'Tulipa', segment: F, rarity: 'uncommon', habit: 'ground', description: 'Red cups on smooth stems above blue-green leaves; spring in a single shape.', progression: 'Leaves, then a few cups at size 4 and a full stand of red by size 7.' },
  { id: 'dahlia', name: 'Dahlia', scientificName: 'Dahlia pinnata', segment: F, rarity: 'common', habit: 'pot', description: 'Layered magenta blooms, each a perfect spiral of petals, in a terracotta pot.', progression: 'A leafy plant that carries ever more spiral blooms.' },
  { id: 'chrysanthemum', name: 'Chrysanthemum', scientificName: 'Chrysanthemum morifolium', segment: F, rarity: 'common', habit: 'pot', description: 'Guldaudi: a mound of yellow autumn flowers, the brightest thing in a cool month.', progression: 'A green mound that disappears under yellow flowers by size 7.' },
  { id: 'sunflower', name: 'Sunflower', scientificName: 'Helianthus annuus', segment: F, rarity: 'common', habit: 'ground', description: 'Surajmukhi: a tall stalk with a great golden face that turns to follow the sun.', progression: 'Grows taller each size; the golden head opens at size 4.' },
  { id: 'lavender', name: 'Lavender', scientificName: 'Lavandula angustifolia', segment: F, rarity: 'uncommon', habit: 'shrub', description: 'Grey-green needles and violet spikes humming with bees; calming to touch and smell.', progression: 'A silver mound, then violet spikes from size 4.' },
  { id: 'bougainvillea', name: 'Bougainvillea', scientificName: 'Bougainvillea glabra', segment: F, rarity: 'common', habit: 'shrub', description: 'Paper-thin magenta bracts on a thorny, sun-loving climber that blooms almost all year.', progression: 'A green scramble, then a wall of magenta by size 7.' },
  { id: 'petunia', name: 'Petunia', scientificName: 'Petunia hybrida', segment: F, rarity: 'common', habit: 'pot', description: 'Purple trumpets spilling over the edge of a blue glazed pot.', progression: 'Trailing leaves, then trumpets from size 4.' },
  { id: 'gerbera', name: 'Gerbera', scientificName: 'Gerbera jamesonii', segment: F, rarity: 'uncommon', habit: 'pot', description: 'Bold orange daisies on bare stems, each one like a small sun.', progression: 'A rosette of leaves, then daisies on tall stems.' },
  { id: 'carnation', name: 'Carnation', scientificName: 'Dianthus caryophyllus', segment: F, rarity: 'uncommon', habit: 'shrub', description: 'Frilled pink flowers with a clove scent above blue-grey grassy leaves.', progression: 'Grey leaves, then frilled blooms from size 4.' },
  { id: 'daffodil', name: 'Daffodil', scientificName: 'Narcissus', segment: F, rarity: 'uncommon', habit: 'ground', description: 'Yellow trumpets with a paler frill, nodding on slim stems in early spring.', progression: 'Strap leaves, then trumpets at size 4 and a crowd of them by size 7.' },
  { id: 'iris', name: 'Iris', scientificName: 'Iris germanica', segment: F, rarity: 'rare', habit: 'ground', description: 'Sword leaves and violet flowers with three falls and three standards: the rainbow goddess.', progression: 'A fan of sword leaves, then violet flowers from size 4.' },
  { id: 'gardenia', name: 'Gardenia', scientificName: 'Gardenia jasminoides', segment: F, rarity: 'rare', habit: 'shrub', description: 'Waxy white blooms against dark glossy leaves, with one of the richest scents in the garden.', progression: 'A glossy bush, then creamy flowers from size 4.' },
  { id: 'plumeria', name: 'Plumeria', scientificName: 'Plumeria rubra', segment: F, rarity: 'uncommon', habit: 'tree', description: 'Champa: thick branches, long leaves and five-petalled cream flowers with a golden heart.', progression: 'A small branching tree that flowers from size 5.' },

  // ---- trees -----------------------------------------------------------------------------
  { id: 'banyan', name: 'Banyan', scientificName: 'Ficus benghalensis', segment: T, rarity: 'rare', habit: 'tree', description: 'Bargad: the great sheltering tree of India, a whole grove growing from a single trunk.', progression: 'A seedling, then a trunk that thickens and a crown that spreads wider every size.' },
  { id: 'peepal', name: 'Peepal', scientificName: 'Ficus religiosa', segment: T, rarity: 'uncommon', habit: 'tree', description: 'The sacred fig, with heart-shaped leaves that tremble in the slightest breeze.', progression: 'Heart leaves on a slender stem, then a broad trembling crown.' },
  { id: 'neem', name: 'Neem', scientificName: 'Azadirachta indica', segment: T, rarity: 'common', habit: 'tree', description: 'The village pharmacy: bitter serrated leaves, deep shade and air that feels cleaner under it.', progression: 'Taller each size with a denser, darker crown.' },
  { id: 'ashoka', name: 'Ashoka', scientificName: 'Polyalthia longifolia', segment: T, rarity: 'common', habit: 'tree', description: 'The mast tree: a narrow green column of drooping, glossy leaves.', progression: 'A green spire that rises higher each size.' },
  { id: 'gulmohar', name: 'Gulmohar', scientificName: 'Delonix regia', segment: T, rarity: 'uncommon', habit: 'tree', description: 'Flame of the forest: a wide umbrella of ferny leaves that turns scarlet in May.', progression: 'A spreading crown, then flame-red flowers from size 5.' },
  { id: 'cherry_blossom', name: 'Cherry Blossom', scientificName: 'Prunus serrulata', segment: T, rarity: 'rare', habit: 'tree', description: 'Sakura: a cloud of pale pink blossom for a week each spring, then fresh green.', progression: 'Pink blossom from size 4, a full cloud of it by size 7.' },
  { id: 'jacaranda', name: 'Jacaranda', scientificName: 'Jacaranda mimosifolia', segment: T, rarity: 'rare', habit: 'tree', description: 'Lavender-blue trumpets that carpet the ground beneath as they fall.', progression: 'Feathery leaves, then blue-violet bloom from size 5.' },
  { id: 'palm', name: 'Palm', scientificName: 'Dypsis lutescens', segment: T, rarity: 'common', habit: 'tree', description: 'A clump of golden canes with arching feathered fronds.', progression: 'More canes and longer fronds each size.' },
  { id: 'coconut', name: 'Coconut', scientificName: 'Cocos nucifera', segment: T, rarity: 'uncommon', habit: 'tree', description: 'Nariyal: the tree of the coast, every part of it useful, leaning toward the sea.', progression: 'A tall trunk and a crown of fronds that climbs higher each size.' },
  { id: 'maple', name: 'Maple', scientificName: 'Acer palmatum', segment: T, rarity: 'rare', habit: 'tree', description: 'A Japanese maple whose fine, red leaves glow like stained glass in low sun.', progression: 'A small red tree that grows into a layered crimson crown.' },
  { id: 'cedar', name: 'Cedar', scientificName: 'Cedrus deodara', segment: T, rarity: 'uncommon', habit: 'tree', description: 'Deodar: the Himalayan cedar, with tiered branches and a scent of mountain air.', progression: 'A conifer that climbs taller and denser every size.' },
  { id: 'pine', name: 'Pine', scientificName: 'Pinus roxburghii', segment: T, rarity: 'common', habit: 'tree', description: 'Chir pine: long needles in threes and bark like puzzle pieces.', progression: 'A tall straight trunk and a needle crown that fills in.' },
  { id: 'cypress', name: 'Cypress', scientificName: 'Cupressus sempervirens', segment: T, rarity: 'uncommon', habit: 'tree', description: 'A slender dark-green column, the tree of Italian hillsides and Mughal gardens.', progression: 'A narrow spire that reaches higher each size.' },
  { id: 'magnolia', name: 'Magnolia', scientificName: 'Magnolia grandiflora', segment: T, rarity: 'rare', habit: 'tree', description: 'Great leathery leaves and huge cream flowers the size of a hand, lemon scented.', progression: 'Glossy leaves, then creamy flowers from size 5.' },
  { id: 'amaltas', name: 'Amaltas', scientificName: 'Cassia fistula', segment: T, rarity: 'uncommon', habit: 'tree', description: 'The golden shower tree: long chains of yellow flowers hanging in the hot season.', progression: 'A graceful tree that drips with gold from size 5.' },
  { id: 'arjuna', name: 'Arjuna', scientificName: 'Terminalia arjuna', segment: T, rarity: 'common', habit: 'tree', description: 'A river-bank tree with pale bark and buttressed roots, beloved of healers.', progression: 'A tall smooth trunk and a wide crown.' },
  { id: 'kadamba', name: 'Kadamba', scientificName: 'Neolamarckia cadamba', segment: T, rarity: 'rare', habit: 'tree', description: 'Broad leaves in tiers and orange ball-flowers, the tree under which Krishna played.', progression: 'Layered branches, then golden balls of flower at size 6.' },

  // ---- indoor and ornamental --------------------------------------------------------------
  { id: 'monstera', name: 'Monstera', scientificName: 'Monstera deliciosa', segment: I, rarity: 'common', habit: 'pot', description: 'The Swiss cheese plant: huge split leaves that unfurl one at a time.', progression: 'Leaves grow larger and more numerous with every size.' },
  { id: 'areca_palm', name: 'Areca Palm', scientificName: 'Dypsis lutescens', segment: I, rarity: 'common', habit: 'pot', description: 'Soft feathered fronds on golden canes; the friendliest indoor palm.', progression: 'More canes and taller fronds each size.' },
  { id: 'snake_plant', name: 'Snake Plant', scientificName: 'Sansevieria trifasciata', segment: I, rarity: 'common', habit: 'pot', description: 'Upright banded blades that forgive every forgotten watering.', progression: 'Taller, thicker blades with each size.' },
  { id: 'peace_lily', name: 'Peace Lily', scientificName: 'Spathiphyllum', segment: I, rarity: 'common', habit: 'pot', description: 'Dark glossy leaves and white hooded flowers that lean toward the light.', progression: 'A fuller mound, then white spathes from size 4.' },
  { id: 'fiddle_leaf_fig', name: 'Fiddle Leaf Fig', scientificName: 'Ficus lyrata', segment: I, rarity: 'uncommon', habit: 'pot', description: 'Violin-shaped leaves the size of plates on a slim grey stem.', progression: 'A single stem that branches and grows taller each size.' },
  { id: 'rubber_plant', name: 'Rubber Plant', scientificName: 'Ficus elastica', segment: I, rarity: 'common', habit: 'pot', description: 'Thick oval leaves polished like dark leather, red when they first unfold.', progression: 'Taller with bigger, glossier leaves.' },
  { id: 'philodendron', name: 'Philodendron', scientificName: 'Philodendron hederaceum', segment: I, rarity: 'common', habit: 'pot', description: 'Heart-shaped leaves on trailing stems that climb or spill as they please.', progression: 'Ever more heart leaves and longer stems.' },
  { id: 'calathea', name: 'Calathea', scientificName: 'Calathea orbifolia', segment: I, rarity: 'uncommon', habit: 'pot', description: 'The prayer plant: patterned leaves that lift at night and open at dawn.', progression: 'More and larger patterned leaves with every size.' },
  { id: 'croton', name: 'Croton', scientificName: 'Codiaeum variegatum', segment: I, rarity: 'uncommon', habit: 'pot', description: 'Leaves painted in yellow, orange and red, as if dipped in sunset.', progression: 'A bigger, brighter shrub each size.' },
  { id: 'zz_plant', name: 'ZZ Plant', scientificName: 'Zamioculcas zamiifolia', segment: I, rarity: 'common', habit: 'pot', description: 'Arching stems of waxy leaflets that shine as if polished.', progression: 'More stems rising from the pot each size.' },
  { id: 'fern', name: 'Fern', scientificName: 'Nephrolepis exaltata', segment: I, rarity: 'common', habit: 'pot', description: 'Soft arching fronds, each unrolling from a fiddlehead.', progression: 'A fuller fountain of fronds with every size.' },
  { id: 'bonsai', name: 'Bonsai', scientificName: 'Ficus retusa', segment: I, rarity: 'rare', habit: 'pot', description: 'A tree in miniature, decades of patience in a shallow dish.', progression: 'A thicker trunk and a denser, more sculpted crown each size.' },
  { id: 'bamboo', name: 'Bamboo', scientificName: 'Bambusa vulgaris', segment: I, rarity: 'uncommon', habit: 'pot', description: 'Golden canes that whisper in the wind; the fastest-growing plant on earth.', progression: 'More canes, taller each size.' },
  { id: 'spider_plant', name: 'Spider Plant', scientificName: 'Chlorophytum comosum', segment: I, rarity: 'common', habit: 'pot', description: 'Striped arching leaves and dangling plantlets like little spiders on threads.', progression: 'A fuller fountain with plantlets from size 5.' },
  { id: 'anthurium', name: 'Anthurium', scientificName: 'Anthurium andraeanum', segment: I, rarity: 'rare', habit: 'pot', description: 'Glossy heart leaves and lacquered red flowers that last for weeks.', progression: 'Heart leaves, then red spathes from size 4.' },

  // ---- fruits and vegetables --------------------------------------------------------------
  { id: 'mango', name: 'Mango', scientificName: 'Mangifera indica', segment: V, rarity: 'common', habit: 'tree', description: 'Aam: the king of fruits, hanging golden from a dense, dark, fragrant crown.', progression: 'A sapling, then a spreading tree with mangoes from size 5.' },
  { id: 'apple', name: 'Apple', scientificName: 'Malus domestica', segment: V, rarity: 'uncommon', habit: 'tree', description: 'Pink-white blossom in spring, red apples by autumn, on a small orchard tree.', progression: 'Blossom at size 4, fruit from size 5.' },
  { id: 'orange', name: 'Orange', scientificName: 'Citrus sinensis', segment: V, rarity: 'common', habit: 'tree', description: 'Glossy leaves, waxy white blossom and bright oranges, all at once.', progression: 'A round little tree that fruits from size 5.' },
  { id: 'lemon', name: 'Lemon', scientificName: 'Citrus limon', segment: V, rarity: 'common', habit: 'tree', description: 'Nimbu: a thorny little tree that never stops making lemons.', progression: 'Taller each size, with more lemons.' },
  { id: 'pomegranate', name: 'Pomegranate', scientificName: 'Punica granatum', segment: V, rarity: 'uncommon', habit: 'tree', description: 'Anar: scarlet flowers and leathery red fruit packed with ruby seeds.', progression: 'Scarlet flowers at size 4, fruit from size 5.' },
  { id: 'guava', name: 'Guava', scientificName: 'Psidium guajava', segment: V, rarity: 'common', habit: 'tree', description: 'Amrood: smooth peeling bark and sweet green fruit with a scent you can find blindfolded.', progression: 'A round tree with guavas from size 5.' },
  { id: 'papaya', name: 'Papaya', scientificName: 'Carica papaya', segment: V, rarity: 'common', habit: 'tree', description: 'A single pale trunk with a crown of great lobed leaves and fruit clustered beneath.', progression: 'Grows taller, with fruit under the crown from size 5.' },
  { id: 'banana', name: 'Banana', scientificName: 'Musa', segment: V, rarity: 'common', habit: 'tree', description: 'Kela: huge paddle leaves on a soft green stem; not a tree at all but a giant herb.', progression: 'Taller, with bigger paddle leaves each size.' },
  { id: 'strawberry', name: 'Strawberry', scientificName: 'Fragaria ananassa', segment: V, rarity: 'uncommon', habit: 'ground', description: 'Low runners, white flowers and red hearts hidden under the leaves.', progression: 'White flowers at size 4, red fruit from size 5.' },
  { id: 'watermelon', name: 'Watermelon', scientificName: 'Citrullus lanatus', segment: V, rarity: 'rare', habit: 'vine', description: 'Tarbooz: a sprawling vine with yellow flowers and striped green globes resting on the soil.', progression: 'A spreading vine; melons swell from size 5.' },
  { id: 'tomato', name: 'Tomato', scientificName: 'Solanum lycopersicum', segment: V, rarity: 'common', habit: 'ground', description: 'Tamatar: a staked plant with yellow stars and red fruit that smells of summer.', progression: 'Flowers at size 4, red tomatoes from size 5.' },
  { id: 'chilli', name: 'Chilli', scientificName: 'Capsicum annuum', segment: V, rarity: 'common', habit: 'ground', description: 'Mirch: a neat bush hung with slim red pods that go from green to fire.', progression: 'White flowers, then red chillies from size 5.' },
  { id: 'brinjal', name: 'Brinjal', scientificName: 'Solanum melongena', segment: V, rarity: 'common', habit: 'ground', description: 'Baingan: purple star flowers and glossy aubergines on a sturdy plant.', progression: 'Purple flowers at size 4, fruit from size 5.' },
  { id: 'carrot', name: 'Carrot', scientificName: 'Daucus carota', segment: V, rarity: 'common', habit: 'ground', description: 'Gajar: feathery tops above and the sweet orange root below.', progression: 'A fuller, taller plume of leaves each size.' },
  { id: 'radish', name: 'Radish', scientificName: 'Raphanus sativus', segment: V, rarity: 'common', habit: 'ground', description: 'Mooli: broad rough leaves over a crisp white root, ready in weeks.', progression: 'Bigger leaves with every size.' },
  { id: 'pumpkin', name: 'Pumpkin', scientificName: 'Cucurbita', segment: V, rarity: 'uncommon', habit: 'vine', description: 'Kaddu: great leaves, golden flowers and orange globes on a rambling vine.', progression: 'Flowers at size 4; pumpkins from size 5.' },
  { id: 'cucumber', name: 'Cucumber', scientificName: 'Cucumis sativus', segment: V, rarity: 'common', habit: 'vine', description: 'Kheera: cool green fruit under a scramble of rough leaves.', progression: 'Yellow flowers, then cucumbers from size 5.' },
  { id: 'peas', name: 'Peas', scientificName: 'Pisum sativum', segment: V, rarity: 'common', habit: 'vine', description: 'Matar: tendrils climbing a cane, white flowers and plump pods.', progression: 'Climbs higher each size; pods from size 5.' },

  // ---- herbs and medicinal ----------------------------------------------------------------
  { id: 'tulsi', name: 'Tulsi', scientificName: 'Ocimum tenuiflorum', segment: H, rarity: 'common', habit: 'pot', description: 'Holy basil: the plant of every courtyard, purple-tinged and sharply aromatic.', progression: 'A denser, taller bush with flower spikes each size.' },
  { id: 'mint', name: 'Mint', scientificName: 'Mentha spicata', segment: H, rarity: 'common', habit: 'pot', description: 'Pudina: cool, bright and impossible to stop once it starts.', progression: 'A spreading mound that fills its pot.' },
  { id: 'coriander', name: 'Coriander', scientificName: 'Coriandrum sativum', segment: H, rarity: 'common', habit: 'ground', description: 'Dhania: lacy leaves for the kitchen and tiny white umbels for the bees.', progression: 'A leafy clump, then white umbels at size 6.' },
  { id: 'rosemary', name: 'Rosemary', scientificName: 'Salvia rosmarinus', segment: H, rarity: 'uncommon', habit: 'shrub', description: 'Pine-scented needles and pale blue flowers; the herb of remembrance.', progression: 'A grey-green bush, then blue flowers at size 6.' },
  { id: 'thyme', name: 'Thyme', scientificName: 'Thymus vulgaris', segment: H, rarity: 'uncommon', habit: 'ground', description: 'A low mat of tiny leaves that releases its scent when stepped on.', progression: 'A wider mat, then mauve flowers at size 6.' },
  { id: 'lemongrass', name: 'Lemongrass', scientificName: 'Cymbopogon citratus', segment: H, rarity: 'common', habit: 'ground', description: 'A fountain of blades that smells of lemon when crushed.', progression: 'A bigger, fuller clump each size.' },
  { id: 'aloe_vera', name: 'Aloe Vera', scientificName: 'Aloe barbadensis', segment: H, rarity: 'common', habit: 'ground', description: 'Ghritkumari: cool gel inside spiky grey-green leaves; first aid in a rosette.', progression: 'More and longer leaves with every size.' },
  { id: 'ashwagandha', name: 'Ashwagandha', scientificName: 'Withania somnifera', segment: H, rarity: 'rare', habit: 'shrub', description: 'Winter cherry: a modest shrub with orange berries in papery lanterns and famous roots.', progression: 'Flowers at size 4, orange berries from size 5.' },
  { id: 'brahmi', name: 'Brahmi', scientificName: 'Bacopa monnieri', segment: H, rarity: 'uncommon', habit: 'ground', description: 'A creeping water herb with small succulent leaves and tiny white flowers; the memory plant.', progression: 'A wider creeping mat, flowering from size 5.' },
  { id: 'giloy', name: 'Giloy', scientificName: 'Tinospora cordifolia', segment: H, rarity: 'rare', habit: 'vine', description: 'Guduchi: a heart-leaved climber with aerial roots, the nectar of immortality in Ayurveda.', progression: 'Climbs higher each size; red berries from size 5.' },
  { id: 'chamomile', name: 'Chamomile', scientificName: 'Matricaria chamomilla', segment: H, rarity: 'common', habit: 'ground', description: 'Little white daisies with yellow hearts that make the gentlest tea.', progression: 'Feathery leaves, then daisies from size 4.' },
  { id: 'sage', name: 'Sage', scientificName: 'Salvia officinalis', segment: H, rarity: 'uncommon', habit: 'shrub', description: 'Soft grey, velvety leaves and purple flower spikes; the herb of wisdom.', progression: 'A grey mound, then purple spikes at size 6.' },
  { id: 'turmeric', name: 'Turmeric', scientificName: 'Curcuma longa', segment: H, rarity: 'common', habit: 'ground', description: 'Haldi: broad lush leaves above the golden rhizome that colours every kitchen.', progression: 'Taller, broader leaves with every size.' },
  { id: 'ginger', name: 'Ginger', scientificName: 'Zingiber officinale', segment: H, rarity: 'common', habit: 'ground', description: 'Adrak: reedy stems of narrow leaves over a warming root.', progression: 'More stems and taller leaves each size.' },
];

export const SPECIES_BY_ID: Record<string, Species> = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

export function speciesOf(segment: SegmentId): Species[] {
  return SPECIES.filter((s) => s.segment === segment);
}

export const SEGMENT_NAME: Record<SegmentId, string> = { flowers: 'Flowers', trees: 'Trees', indoor: 'Indoor / Ornamental', fruits: 'Fruits & Vegetables', herbs: 'Herbs & Medicinal' };

/** A species is on offer once enough plants have grown in its segment. */
export function unlocked(species: Species, grownInSegment: number): boolean {
  return grownInSegment >= RARITY_UNLOCK[species.rarity];
}

/** The sizes a preview lists, with the minutes each needs. */
export const PREVIEW_SIZES: PlantGrowthSize[] = [1, 2, 3, 4, 5, 6, 7];
