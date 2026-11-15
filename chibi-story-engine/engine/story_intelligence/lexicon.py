"""Language packs: the vocabulary the rule-based analyser understands.

A pack is plain data. Adding a language means adding a pack, not changing the analyser.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

DEV = r"ऀ-ॿ"


@dataclass(frozen=True)
class EntityWord:
    key: str
    names: tuple[str, ...]
    species: str
    habitat: str = "ground"
    group: bool = False


@dataclass(frozen=True)
class LanguagePack:
    code: str
    entities: tuple[EntityWord, ...]
    relations: dict[str, str]                     # word -> relation key ("wife")
    relation_joiner: str                          # regex between owner and relation word
    speech_verbs: str                             # regex
    emotions: tuple[tuple[str, str], ...]         # (regex, emotion) in narration
    quote_emotions: tuple[tuple[str, str], ...]   # (regex, emotion) inside speech
    actions: tuple[tuple[str, str], ...]          # (regex, semantic)
    targets: tuple[tuple[str, str], ...]          # (regex, target tag)
    locations: tuple[tuple[str, str], ...]        # (regex, location tag)
    props: tuple[tuple[str, str], ...]            # (regex, prop tag)
    time_markers: tuple[str, ...]
    moral_markers: tuple[str, ...]
    object_markers: str                           # regex that, right after a name, marks it as not the subject
    possessive_markers: str = ""
    pronouns: tuple[str, ...] = ()
    letter_class: str = r"\w"
    seconds_per_word: float = 0.42
    names_extra: dict[str, tuple[str, ...]] = field(default_factory=dict)

    def name_pattern(self, name: str) -> str:
        """Regex for a name including its common inflections, bounded by non-letters."""
        if self.code.startswith("hi"):
            if name.endswith("ा") and len(name) > 2:
                core = re.escape(name[:-1]) + "(?:ा|े|ों)"
            elif name.endswith("ी"):
                core = re.escape(name[:-1]) + "(?:ी|ियों|ियाँ)"
            else:
                core = re.escape(name) + "(?:ों|ें)?"
            core = core.replace(r"\ ", r"\s+")
            return rf"(?<![{DEV}]){core}(?![{DEV}])"
        return rf"(?<!\w){re.escape(name)}(?:s|'s)?(?!\w)"


def _b(p: str) -> str:
    """Bound a Hindi stem on the left so it does not match inside another word."""
    return rf"(?<![{DEV}])(?:{p})"


HINDI = LanguagePack(
    code="hi",
    entities=(
        EntityWord("monkey", ("बंदर", "बन्दर", "वानर"), "monkey", "arboreal"),
        EntityWord("crocodile", ("मगरमच्छ", "घड़ियाल"), "crocodile", "aquatic"),
        EntityWord("lion", ("शेर", "सिंह"), "lion"),
        EntityWord("rabbit", ("खरगोश",), "rabbit"),
        EntityWord("jackal", ("सियार", "गीदड़"), "jackal"),
        EntityWord("farmer", ("किसान",), "human"),
        EntityWord("rich_man", ("सेठ", "साहूकार", "ज़मींदार", "जमींदार", "धनी आदमी", "अमीर आदमी"), "human"),
        EntityWord("king", ("राजा", "बादशाह"), "human"),
        EntityWord("elephant", ("हाथी",), "elephant"),
        EntityWord("tortoise", ("कछुआ",), "tortoise", "aquatic"),
        EntityWord("mouse", ("चूहा",), "mouse"),
        EntityWord("crow", ("कौआ", "कौवा"), "crow", "arboreal"),
        EntityWord("fox", ("लोमड़ी",), "fox"),
        EntityWord("deer", ("हिरण", "हिरन"), "deer"),
        EntityWord("tiger", ("बाघ",), "tiger"),
        EntityWord("dog", ("कुत्ता",), "dog"),
        EntityWord("cat", ("बिल्ली",), "cat"),
        EntityWord("snake", ("साँप", "सांप"), "snake"),
        EntityWord("frog", ("मेंढक",), "frog", "aquatic"),
        EntityWord("bird", ("चिड़िया", "पक्षी"), "bird", "arboreal"),
        EntityWord("dyer", ("रंगरेज", "धोबी"), "human"),
        EntityWord("animals", ("जानवर", "पशु"), "animals", group=True),
    ),
    relations={"पत्नी": "wife", "पति": "husband", "बेटा": "son", "बेटी": "daughter", "माँ": "mother", "पिता": "father"},
    relation_joiner=r"\s+(?:की|के|का)\s+",
    speech_verbs=_b(r"कहा|कही|कहने लग|बोल[ाीे]|पूछ[ाीे]|चिल्ला|उत्तर दिया|जवाब दिया|पुकार|दहाड़|गरज|समझाया|बताया"),
    emotions=(
        (_b(r"हँस|हंस|मुस्कुरा|मुस्करा|ठहाक"), "laughing"),
        (_b(r"खुश|प्रसन्न|आनंद|मज़े|मजे"), "happy"),
        (_b(r"दुखी|दुःखी|उदास|रोने|रो पड़|शर्मिंदा|पछता|निराश"), "sad"),
        (_b(r"डर|घबरा|भयभीत|काँप|कांप|सहम"), "worried"),
        (_b(r"गुस्स|क्रोध|नाराज़|नाराज|चिल्ला|दहाड़|गरज"), "angry"),
        (_b(r"हैरान|चकित|चौंक|आश्चर्य|दंग"), "surprised"),
        (_b(r"सोच|विचार|तरकीब|उपाय|योजना"), "thinking"),
    ),
    quote_emotions=(
        (_b(r"वाह|धन्यवाद|शाबाश|बहुत अच्छा"), "happy"),
        (_b(r"मूर्ख|दुष्ट|धोखेबाज़|धोखेबाज|चुप"), "angry"),
        (_b(r"क्षमा|माफ़|माफ"), "sad"),
        (_b(r"बचाओ|हाय|नहीं नहीं"), "worried"),
        (_b(r"क्या\?|अरे"), "surprised"),
    ),
    actions=(
        (_b(r"तैर"), "swim"),
        (_b(r"कूद"), "jump"),
        (_b(r"चढ़"), "climb"),
        (_b(r"फेंक"), "throw"),
        (_b(r"खा(?:ता|ती|ते|ए|या|यी|ई|कर|ने लग)") + rf"(?![{DEV}])", "eat"),
        (_b(r"पी(?:ता|ती|या|कर|ने लग)") + rf"(?![{DEV}])", "drink"),
        (_b(r"बैठ"), "sit"),
        (_b(r"दौड़|भाग"), "run"),
        (_b(r"उड़"), "fly"),
        (_b(r"गिर"), "fall"),
        (_b(r"लौट|चल[ाी] ग[याई]|चले गए|वापस चल[ाी]"), "leave"),
        (_b(r"आया|आई|आए|पहुँच|पहुंच|के पास गया|के पास गई|ले आया|ले गया|ले गई"), "arrive"),
        (_b(r"हँस|हंस"), "laugh"),
        (_b(r"रो(?:या|ई|ने लग)|रो पड़"), "cry"),
        (_b(r"उठा(?:या|ई|कर)"), "pick_up"),
        (_b(r"सो(?:या|ई|ता|ती) |सो ग[याई]|नींद"), "sleep"),
        (_b(r"झाँक|झांक|देख(?:ा|ी|कर|ने लग)"), "look"),
        (_b(r"चल(?:ा|ी|े|ता|ती|ने लग)") + rf"(?![{DEV}])", "walk"),
        (_b(r"दिया|दिए"), "give"),
    ),
    targets=(
        (_b(r"पीठ पर"), "back"),
        (_b(r"पेड़ पर"), "tree"),
        (_b(r"पेड़ से"), "from_tree"),
        (_b(r"नदी में|पानी में|तालाब में"), "water"),
        (_b(r"कुएँ में|कुएं में|कुआँ में"), "well"),
        (_b(r"नीचे"), "down"),
        (_b(r"के पास"), "near"),
    ),
    locations=(
        (_b(r"नदी के बीच|बीच नदी|मझधार|बीच धारा"), "river_mid"),
        (_b(r"नदी"), "river"),
        (_b(r"जामुन"), "jamun"),
        (_b(r"पेड़"), "tree"),
        (_b(r"जंगल|वन में"), "forest"),
        (_b(r"घर"), "home"),
        (_b(r"गाँव|गांव"), "village"),
        (_b(r"महल"), "palace"),
        (_b(r"दरबार"), "court"),
        (_b(r"कुआँ|कुएँ|कुएं|कुआं"), "well"),
        (_b(r"खेत"), "field"),
        (_b(r"गुफा|माँद|मांद"), "cave"),
        (_b(r"बाज़ार|बाजार"), "market"),
        (_b(r"तालाब"), "pond"),
        (_b(r"हवेली"), "mansion"),
        (_b(r"बगीच|बाग़|बाग में"), "garden"),
    ),
    props=(
        (_b(r"जामुन"), "jamun"),
        (_b(r"फल"), "fruit"),
        (_b(r"रोटी|भोजन|खाना"), "food"),
        (_b(r"थैली|सिक्क|धन|सोन"), "money"),
        (_b(r"नील|रंग"), "dye"),
    ),
    time_markers=("एक दिन", "अगले दिन", "दूसरे दिन", "उस दिन से", "कुछ दिन बाद", "कुछ दिनों बाद", "एक बार", "तभी", "रात को", "सुबह", "शाम को"),
    moral_markers=("शिक्षा", "सीख", "नैतिक शिक्षा", "कहानी की सीख"),
    object_markers=r"\s*(?:को|से|के|का|की|पर|में)(?![" + DEV + r"])",
    pronouns=("वह", "उसने", "उसे", "वे", "उन्होंने", "दोनों"),
    letter_class=DEV,
    seconds_per_word=0.42,
)

ENGLISH = LanguagePack(
    code="en",
    entities=(
        EntityWord("monkey", ("monkey",), "monkey", "arboreal"),
        EntityWord("crocodile", ("crocodile",), "crocodile", "aquatic"),
        EntityWord("lion", ("lion",), "lion"),
        EntityWord("rabbit", ("rabbit", "hare"), "rabbit"),
        EntityWord("jackal", ("jackal",), "jackal"),
        EntityWord("farmer", ("farmer",), "human"),
        EntityWord("rich_man", ("rich man", "merchant", "landlord"), "human"),
        EntityWord("king", ("king",), "human"),
    ),
    relations={"wife": "wife", "husband": "husband", "son": "son", "daughter": "daughter", "mother": "mother"},
    relation_joiner=r"'s\s+",
    speech_verbs=r"\b(?:said|says|asked|replied|shouted|cried|answered|told|roared|whispered)\b",
    emotions=((r"\blaugh", "laughing"), (r"\bhapp|\bglad|\bdelight", "happy"), (r"\bsad|\bsorrow|\bashamed", "sad"),
              (r"\bafraid|\bscared|\bfright|\btrembl", "worried"), (r"\bangr|\bfurious", "angry"),
              (r"\bsurpris|\bamazed", "surprised"), (r"\bthought|\bthink|\bidea", "thinking")),
    quote_emotions=((r"\bthank|\bwonderful", "happy"), (r"\bfool|\bwicked", "angry"), (r"\bsorry|\bforgive", "sad"), (r"\bhelp!", "worried")),
    actions=((r"\bsw[ia]m", "swim"), (r"\bjump|\bleap", "jump"), (r"\bclimb", "climb"), (r"\bthrew|\bthrow", "throw"),
             (r"\bate\b|\beat", "eat"), (r"\bdrank|\bdrink", "drink"), (r"\bsat\b|\bsit", "sit"), (r"\bran\b|\brun", "run"),
             (r"\bflew|\bfly", "fly"), (r"\bfell\b|\bfall", "fall"), (r"\bwent away|\breturned|\bleft\b", "leave"),
             (r"\bcame|\barrived|\breached", "arrive"), (r"\bwalk", "walk"), (r"\bgave|\bgive", "give")),
    targets=((r"\bon (?:his|her|its|the \w+'s) back", "back"), (r"\b(?:up|onto|on) the tree", "tree"), (r"\binto the (?:river|water)", "water"),
             (r"\binto the well", "well"), (r"\bdown\b", "down")),
    locations=((r"\bmiddle of the river|\bmid-river", "river_mid"), (r"\briver", "river"), (r"\btree", "tree"), (r"\bforest|\bjungle", "forest"),
               (r"\bhome|\bhouse", "home"), (r"\bvillage", "village"), (r"\bpalace", "palace"), (r"\bwell\b", "well"), (r"\bfield", "field"),
               (r"\bcave|\bden\b", "cave")),
    props=((r"\bfruit|\bberr", "fruit"), (r"\bfood", "food"), (r"\bgold|\bmoney|\bcoins", "money")),
    time_markers=("one day", "the next day", "from that day", "once upon a time", "a few days later"),
    moral_markers=("moral",),
    object_markers=r"'s\b",
    pronouns=("he", "she", "it", "they"),
    seconds_per_word=0.36,
)

PACKS = {"hi": HINDI, "en": ENGLISH}


def pack_for(language: str) -> LanguagePack | None:
    return PACKS.get(language.split("-")[0].lower())


def supported_languages() -> list[str]:
    return sorted(PACKS)
