# 08 – Temple and cultural courtyard

`town.temple` is an optional, respectful part of the Miniverse: a temple with dedicated areas
for the deities named in the master prompt, a regional traditions gallery for every state and
union territory, and a separate **Shared heritage** wing for traditions that are not Hindu and
must never be mislabelled as such. It is a place for stories, cultural history, festivals,
architecture, music and understanding, with Dadaji as the guide. Every item is labelled as
historical evidence, mythology or traditional belief.

## 1. Availability

- Off by default for A0–A1; a parent switches it on from the Parent Dashboard
  (`19-parent-dashboard.md`), where the toggle explains what the section contains.
- For A2–A5 the section is visible on the map but a parent can hide it entirely.
- It never auto-unlocks, never appears in Dadaji's daily suggestions unless enabled, and never
  carries rewards that other children would miss.
- No rituals are simulated as acts of worship in the app. Children see, hear and learn; they
  do not "pray" in the app. Lighting a diya or offering flowers is shown as culture and
  craft, with the label "traditional practice".

## 2. Layout

The courtyard sits in the north-west of the world under a banyan tree, with a stepped tank
(pushkarini) in front, a bell gate, a stone courtyard, shrines around the courtyard, a gallery
hall and the Shared heritage wing to one side.

```
 ┌──────────────────────────────────────────────────────────────────────────┐
 │  SHARED HERITAGE WING                 GALLERY OF REGIONAL TRADITIONS    │
 │  Buddhist · Jain · Sikh · indigenous  (one alcove per state and UT)     │
 │  and tribal · Christian · Islamic ·                                     │
 │  Parsi · Jewish heritage of India                                       │
 ├─────────────────┬────────────────────────────────────┬──────────────────┤
 │ Shiva–Parvati   │                                    │ Rama, Lakshmana, │
 │ shrine          │        STONE COURTYARD             │ Sita shrine      │
 ├─────────────────┤   banyan tree · storytelling       ├──────────────────┤
 │ Balaji–Lakshmi  │   platform · bhajan mandap ·       │ Hanuman shrine   │
 │ shrine          │   rangoli floor · festival stalls  │                  │
 ├─────────────────┤                                    ├──────────────────┤
 │ Ganesha shrine  │                                    │ Radha–Krishna    │
 ├─────────────────┤   ARCHITECTURE WALK: shikhara,     │ shrine           │
 │ Murugan shrine  │   gopuram, mandapa, pillars        ├──────────────────┤
 ├─────────────────┤                                    │ Sai Nath shrine  │
 │ Durga shrine    │                                    │                  │
 ├─────────────────┴──────────────┬─────────────────────┴──────────────────┤
 │ bell gate · shoe rack · stepped tank · flower seller · prasad counter   │
 └────────────────────────────────┴────────────────────────────────────────┘
```

## 3. Dedicated areas

Each shrine is an alcove with original art (no reproductions of commercial images), a story
bench where Dadaji sits, a festival board and an architecture note.

| Area ID | Area | Stories (examples, mythology label) | Festivals | Architecture and traditions |
|---|---|---|---|---|
| `town.temple.shiva_parvati` | Shiva and Parvati | Ganga descending, Parvati's tapasya, the family on Kailash | Maha Shivaratri, Teej, Gauri puja | Jyotirlinga temples (Kedarnath, Somnath), Nataraja and dance link to the music room |
| `town.temple.balaji_lakshmi` | Balaji (Venkateswara) and Lakshmi | Samudra manthan and Lakshmi, Venkateswara stories | Diwali (Lakshmi puja), Brahmotsavam | Tirumala's Dravida architecture, laddu tradition |
| `town.temple.ganesha` | Ganesha | How Ganesha got his head, writing the Mahabharata, the race around the world | Ganesh Chaturthi, Sankashti | Ashtavinayak, modak, Ganesha as the patron of beginnings and learning |
| `town.temple.murugan` | Murugan (Kartikeya, Subrahmanya) | The fruit of wisdom, Murugan and the peacock, Valli and Devasena | Thaipusam, Skanda Shashti, Kanda Shashti | Arupadai Veedu (six abodes), the vel, Tamil devotional poetry |
| `town.temple.rama_sita` | Rama, Lakshmana and Sita | Episodes of the Ramayana retold for children (childhood, the forest, Hanuman's leap, return to Ayodhya) | Rama Navami, Diwali, Dussehra | Ayodhya, the Ramayana across India and Asia (Ramlila, Kathakali, Thai Ramakien noted as shared culture) |
| `town.temple.hanuman` | Hanuman | Childhood and the Sun, the Sanjeevani mountain, loyalty and strength | Hanuman Jayanti | Hanuman Chalisa as poetry (labelled devotional text), akhara tradition, link to fitness |
| `town.temple.radha_krishna` | Radha and Krishna | Butter stories, Kaliya, Govardhan, the flute, Sudama | Janmashtami, Holi, Radhashtami | Vrindavan and Dwarka, Raas lila, flute link to the music room, Pichwai art link |
| `town.temple.sai_nath` | Sai Nath of Shirdi | Historical figure (nineteenth century, labelled history): his life in Shirdi, teaching of "Shraddha and Saburi", kindness to all faiths | Guru Purnima, Ram Navami at Shirdi | Shirdi, the dhuni, a place shared by people of different faiths |
| `town.temple.durga` | Durga | Mahishasura, the nine forms (Navadurga), Durga as mother | Navaratri, Durga Puja, Dussehra | Pandal art of Bengal, dhunuchi dance, Garba and Dandiya link to dance |

## 4. Gallery of regional traditions

One alcove per state and union territory. Each alcove: the deity or tradition, its place,
story, festival, art form and food, with Dadaji's explanation. Local deities are researched
with the state's cultural department material and a sensitivity reviewer from that region
(§7). Draft list, to be verified before production:

| State or UT | Tradition featured | Place | Note |
|---|---|---|---|
| Andhra Pradesh | Venkateswara (Tirumala), Kanaka Durga | Tirupati, Vijayawada | |
| Arunachal Pradesh | Donyi-Polo (Sun–Moon) and tribal festivals | Ziro, Itanagar | **Shared heritage wing: indigenous** |
| Assam | Kamakhya | Guwahati | Ambubachi mela |
| Bihar | Chhathi Maiya (Chhath), Mahabodhi | Patna, Bodh Gaya | Mahabodhi in the **Buddhist** wing |
| Chhattisgarh | Danteshwari, Bastar Dussehra | Dantewada | Tribal elements labelled indigenous |
| Goa | Shantadurga, Mangeshi | Ponda | |
| Gujarat | Somnath, Dwarkadhish, Ambaji | Somnath, Dwarka, Ambaji | Garba |
| Haryana | Kurukshetra (Gita teaching, labelled text) | Kurukshetra | |
| Himachal Pradesh | Hadimba Devi, Naina Devi, Kullu Dussehra | Manali, Bilaspur, Kullu | |
| Jharkhand | Baidyanath, Sarhul (Sarna) | Deoghar | Sarna is **indigenous** |
| Karnataka | Chamundeshwari, Udupi Krishna, Hampi Virupaksha | Mysuru, Udupi, Hampi | Mysuru Dasara |
| Kerala | Guruvayur Krishna, Sabarimala Ayyappa, Padmanabhaswamy | Guruvayur, Sabarimala, Thiruvananthapuram | Onam (Mahabali) |
| Madhya Pradesh | Mahakaleshwar, Omkareshwar, Khajuraho | Ujjain, Omkareshwar, Khajuraho | Sanchi in the **Buddhist** wing |
| Maharashtra | Vithoba, Siddhivinayak, Shirdi, Ashtavinayak | Pandharpur, Mumbai, Shirdi | Wari pilgrimage |
| Manipur | Govindaji; Sanamahism (Lainingthou Sanamahi) | Imphal | Sanamahism is **indigenous** |
| Meghalaya | Khasi, Garo and Jaintia traditions, Nartiang Durga | Shillong, Nartiang | **Indigenous** |
| Mizoram | Mizo festivals (Chapchar Kut); church heritage | Aizawl | **Shared heritage** |
| Nagaland | Hornbill festival and Naga traditions | Kohima | **Indigenous** |
| Odisha | Jagannath, Lingaraj, Konark Sun temple | Puri, Bhubaneswar, Konark | Rath Yatra |
| Punjab | Harmandir Sahib (Sikh), Devi Talab | Amritsar, Jalandhar | Sikh heritage in the **Shared heritage wing**, never as a deity |
| Rajasthan | Khatu Shyam, Karni Mata, Eklingji, Dilwara | Khatu, Deshnoke, Eklingji, Mount Abu | Dilwara is **Jain** |
| Sikkim | Rumtek, Pemayangtse (Buddhist), Lepcha traditions | Gangtok, Pelling | **Buddhist and indigenous** |
| Tamil Nadu | Meenakshi, Murugan abodes, Brihadeeswarar, Ranganathaswamy | Madurai, Palani, Thanjavur, Srirangam | Pongal |
| Telangana | Yadadri Narasimha, Bhadrachalam Rama, Bathukamma | Yadagirigutta, Bhadrachalam | |
| Tripura | Tripura Sundari, Unakoti | Udaipur (Tripura), Unakoti | Kharchi puja |
| Uttar Pradesh | Kashi Vishwanath, Ayodhya, Vrindavan, Sarnath | Varanasi, Ayodhya, Mathura | Sarnath in the **Buddhist** wing |
| Uttarakhand | Nanda Devi, Badrinath, Kedarnath, Ganga at Haridwar | Chamoli, Badrinath, Kedarnath, Haridwar | Nanda Devi Raj Jat |
| West Bengal | Durga Puja, Kalighat, Dakshineswar, Tarapith | Kolkata, Tarapith | |
| Andaman and Nicobar | Indigenous island peoples (respectful overview only) | – | **Indigenous**; no depiction of protected tribes |
| Chandigarh | Mansa Devi | Panchkula | |
| Dadra and Nagar Haveli and Daman and Diu | Warli traditions, Portuguese-era churches | Silvassa, Diu | **Shared heritage** for churches |
| Delhi | Lotus Temple (Bahá'í), Jama Masjid, Akshardham, Kalkaji | Delhi | Mixed; each in its proper wing |
| Jammu and Kashmir | Vaishno Devi, Amarnath, Kheer Bhawani, Hazratbal | Katra, Pahalgam, Srinagar | Hazratbal in **Shared heritage** |
| Ladakh | Hemis, Thiksey monasteries | Leh | **Buddhist** |
| Lakshadweep | Island culture and Ujra mosque | Kavaratti | **Shared heritage** |
| Puducherry | Manakula Vinayagar, Aurobindo Ashram, Basilica | Puducherry | Mixed |

## 5. Shared heritage wing

`town.temple.shared_heritage` is a separate hall with its own entrance from the courtyard. It
exists so that Buddhist, Jain, Sikh, indigenous and tribal, Christian, Islamic, Parsi and
Jewish traditions of India are presented on their own terms and are never listed as Hindu
deities. Each alcove is reviewed by someone from that tradition (§7). Content is history,
architecture, festivals, music and stories of kindness; no comparative claims.

| Alcove ID | Covers |
|---|---|
| `town.temple.shared_heritage.buddhist` | Buddha's life (history and tradition labels), Bodh Gaya, Sarnath, Sanchi, Ajanta, Ladakh and Sikkim monasteries, Jataka tales (shared with the Story Corner) |
| `town.temple.shared_heritage.jain` | Mahavira, Dilwara, Shravanabelagola, Palitana, ahimsa |
| `town.temple.shared_heritage.sikh` | The ten Gurus (history), Harmandir Sahib, langar, Gurpurab, seva |
| `town.temple.shared_heritage.indigenous` | Sarna, Donyi-Polo, Sanamahism, Khasi, Naga, Gond, Bhil, Santhal and Warli traditions, sacred groves |
| `town.temple.shared_heritage.christian` | Goa, Kerala and north-east churches, Christmas, St Thomas tradition |
| `town.temple.shared_heritage.islamic` | Qutb Minar, Taj Mahal, Ajmer Sharif, Eid, Sufi music |
| `town.temple.shared_heritage.parsi_jewish` | Udvada fire temple, Navroz; Kochi and Mumbai synagogues |

## 6. Content types and labels

Every item in the section carries exactly one label, shown as a coloured ribbon and read aloud
by Dadaji the first time:

| Label | Ribbon | Meaning | Dadaji's phrasing |
|---|---|---|---|
| `history` | `monsoon` | Supported by historical evidence (dates, inscriptions, records) | "This really happened; we have records." |
| `mythology` | `plum` | A story from the epics and puranas | "This is a story people have told for thousands of years." |
| `belief` | `saffron` | A traditional belief or practice | "Many families believe this and do this; some do not, and that is all right." |

Content types per area: **stories** (narrated by Dadaji with character participation, same
engine as the Story Corner), **cultural history** (timeline cards), **festivals** (what, when,
how it is celebrated across regions, foods, crafts), **architecture** (an annotated walk:
shikhara, gopuram, mandapa, pillars, stepped tanks, monastery, gurdwara, church, mosque),
**traditions** (rangoli, torans, lamps, music, dance), **bhajans and devotional music**
(original recordings or public-domain compositions; labelled devotional, with the music-room
lesson on swar and taal) and **educational explanations** (why temples face east, how stone
is carved, how festivals follow the lunar calendar).

## 7. Review and sensitivity process

1. Every item passes the standard CMS workflow (`20-admin-cms.md`) plus a **cultural review**
   step by a reviewer from the relevant region or tradition.
2. The label (history, mythology, belief) is assigned in factual verification and cannot be
   left blank.
3. Sources are cited in the provenance field (state cultural departments, ASI, academic
   references).
4. No depiction of protected or particularly vulnerable tribal groups; indigenous content is
   produced with community consent.
5. Imagery is original DADU art; no photographs of murtis from inside shrines; no commercial
   calendar art.
6. A parent feedback path ("Tell us about this item") goes to the content team and is logged.

## 8. Interactive objects

| Object ID | Interaction | Learning | Bands |
|---|---|---|---|
| `town.temple.bell_gate` | Ring | Sound, arrival manners | A2+ |
| `town.temple.shoe_rack` | Remove shoes | Custom and cleanliness | A2+ |
| `town.temple.stepped_tank` | Look | Water architecture, stepwells | A3+ |
| `town.temple.banyan_platform` | Sit | Dadaji's story of the day | A2+ |
| `town.temple.bhajan_mandap` | Listen, clap taal | Devotional music, rhythm | A2+ |
| `town.temple.rangoli_floor` | Draw | Festival rangoli, kolam, alpana | A2+ |
| `town.temple.festival_stall` | Visit | Festival foods and crafts by region | A2+ |
| `town.temple.architecture_walk` | Walk | Temple parts, stone carving | A3+ |
| `town.temple.<shrine>.story_bench` | Sit | That area's stories | A2+ |
| `town.temple.<shrine>.festival_board` | Tap | Festival explainer | A2+ |
| `town.temple.gallery.<state>` | Enter | That state's tradition alcove | A3+ |
| `town.temple.shared_heritage.<alcove>` | Enter | That tradition's hall | A3+ |
| `town.temple.calendar_wheel` | Turn | Lunar calendar, why festival dates move | A4+ |

## 9. Little mode versus Explorer mode

Little mode (when enabled for A2) shows the courtyard, the banyan storytelling platform, the
rangoli floor and the bhajan mandap; shrines are entered only when Dadaji walks the child
there. Explorer mode shows everything, with the labels and the provenance visible on request.
