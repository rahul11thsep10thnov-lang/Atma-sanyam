"""Research-backed story catalogue: fetch real indexes and tables of contents, parse them, and record what each source supports.

    python -m tools.catalogue.research [--offline]

Evidence levels (strongest first):
  primary_toc     the table of contents / index of an identified edition, fetched and parsed by this script
  index_via_wiki  a scholarly index (e.g. the Perry Index) as reproduced on Wikipedia; the original index itself was not consulted
  tertiary        a Wikipedia article about the tradition (describes it; does not index its stories)
  none            nothing fetched supports it
A story is `verified` only when a fetched TOC/index lists it; `cross_verified` when two different source documents list it; entries from
the author's earlier seed list with no support stay `unverified`; collections whose sources could not be fetched are `research_pending`.
The script writes verbatim extracts under stories/research/extracts/ and records the sha256 of every fetched page.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import subprocess
from datetime import date
from pathlib import Path

from .data import COLLECTIONS, STORIES

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "stories" / "research"
UA = "story-catalogue-research/1.0 (traditional tales index)"
TODAY = date.today().isoformat()


def fetch(url: str) -> bytes | None:
    import time
    for attempt in range(3):                      # Wikimedia answers 429 / error pages when asked too quickly
        r = subprocess.run(["curl", "-sSL", "-m", "90", "-A", UA, "-w", "\n%{http_code}", url], capture_output=True)
        body, _, code = r.stdout.rpartition(b"\n")
        if code.strip() == b"200" and b"Wikimedia Error" not in body[:4000]:
            time.sleep(2)
            return body
        time.sleep(12)
    return None


def clean(s: str) -> str:
    s = re.sub(r"<(script|style).*?</\1>", "", s, flags=re.S)
    s = re.sub(r"<br\s*/?>|</p>|</li>|</tr>|</h\d>|</div>", "\n", s)
    s = html.unescape(re.sub(r"<[^>]+>", "", s))
    s = re.sub(r'",\{"template".*?\}\'>', "", s, flags=re.S)
    return re.sub(r"\n\s*\n+", "\n", s)


# source id -> (collection, title, author/compiler, publication, url, evidence level, licence note, kind)
SOURCES = {
    "ryder_1925": ("panchatantra", "The Panchatantra of Vishnu Sharma (table of contents)", "Vishnu Sharma; translated by Arthur W. Ryder", "Chicago: University of Chicago Press, 1925",
                   "https://franpritchett.com/00litlinks/panchatantra_ryder/index.html", "primary_toc", "Translation first published 1925; reported in the public domain in the US from 2021 (not independently checked). The contents page is hosted by Frances Pritchett's site (Columbia University).", "html"),
    "arnold_1861": ("hitopadesha", "The Book of Good Counsels, from the Sanskrit of the Hitopadesa (table of contents)", "Narayana (Sanskrit); translated by Edwin Arnold", "London, 1861",
                    "https://franpritchett.com/00litlinks/hitopadesha_arnold/", "primary_toc", "1861 translation, old enough to be in the public domain; the contents page is hosted by Frances Pritchett's site.", "html"),
    "jataka_table": ("jataka", "Table of the Jātaka Stories (547 numbered stories, Pali names, English titles and synopses)", "compiled by Ānandajoti Bhikkhu", "ancient-buddhist-texts.net",
                     "https://ancient-buddhist-texts.net/English-Texts/Jataka/000-Jataka-Table.htm", "primary_toc", "Modern compilation and translation; its licence was not checked. Titles and numbers are recorded as facts of the index only; no synopsis text is copied into the catalogue.", "html"),
    "perry_wp": ("aesop", "Perry Index (Wikipedia)", "Ben Edwin Perry (Aesopica, 1952) as reproduced on Wikipedia", "Wikipedia article 'Perry Index'",
                 "https://en.wikipedia.org/w/index.php?title=Perry_Index&action=raw", "index_via_wiki", "Wikipedia text (CC BY-SA); the Perry Index itself was not consulted.", "wikitext"),
    "frere_1898": ("regional", "Old Deccan Days, or Hindoo Fairy Legends current in Southern India (contents)", "collected by Mary Frere", "London: John Murray, 1898 (5th impression; first edition 1868)",
                   "https://en.wikisource.org/w/index.php?title=Old_Deccan_Days&action=render", "primary_toc", "Wikisource transcription marked public domain (PD-old).", "wikisource"),
    "kingscote_1890": ("regional", "Tales of the Sun, or Folklore of Southern India (contents)", "collected by Mrs. Howard Kingscote and Pandit Natesa Sastri", "London: W. H. Allen, 1890",
                       "https://en.wikisource.org/w/index.php?title=Tales_of_the_Sun&action=render", "primary_toc", "Wikisource transcription marked public domain (pd-old).", "wikisource"),
    "day_1883": ("regional", "Folk-Tales of Bengal (contents)", "collected by Lal Behari Day", "London: Macmillan, 1883",
                 "https://en.wikisource.org/w/index.php?title=Folk-tales_of_Bengal&action=render", "primary_toc", "Wikisource transcription of an 1883 book (public domain).", "wikisource"),
    "knowles_1893": ("regional", "Folk-Tales of Kashmir (contents)", "collected by J. Hinton Knowles", "London: Kegan Paul, Trench, Trubner, 1893 (publisher as printed in the 1893 edition; not re-checked)",
                     "https://en.wikisource.org/w/index.php?title=Folk-tales_of_Kashmir&action=render", "primary_toc", "Wikisource transcription of an 1893 book (public domain).", "wikisource"),
    "vetala_wp": ("vikram_betal", "Vetala Panchavimshati (Wikipedia)", "Wikipedia contributors", "Wikipedia article 'Vetala Panchavimshati'",
                  "https://en.wikipedia.org/w/index.php?title=Vetala_Panchavimshati&action=raw", "tertiary", "Wikipedia text (CC BY-SA). Describes recensions and translations; does not index the 25 tales.", "wikitext"),
    "singhasan_wp": ("singhasan_battisi", "Singhasan Battisi (Wikipedia)", "Wikipedia contributors", "Wikipedia article 'Singhasan Battisi'",
                     "https://en.wikipedia.org/w/index.php?title=Singhasan_Battisi&action=raw", "tertiary", "Wikipedia text (CC BY-SA). Does not index the 32 tales.", "wikitext"),
    "birbal_wp": ("akbar_birbal", "Birbal (Wikipedia)", "Wikipedia contributors", "Wikipedia article 'Birbal'", "https://en.wikipedia.org/w/index.php?title=Birbal&action=raw", "tertiary",
                  "Wikipedia text (CC BY-SA). States that the Akbar-Birbal tales are oral tradition; gives no story index.", "wikitext"),
    "tenali_wp": ("tenali_raman", "Tenali Rama (Wikipedia)", "Wikipedia contributors", "Wikipedia article 'Tenali Rama'", "https://en.wikipedia.org/w/index.php?title=Tenali_Rama&action=raw", "tertiary",
                  "Wikipedia text (CC BY-SA). Describes the folklore tradition; gives no story index.", "wikitext"),
    "nights_wp": ("arabian_nights", "One Thousand and One Nights (Wikipedia)", "Wikipedia contributors", "Wikipedia article 'One Thousand and One Nights'",
                  "https://en.wikipedia.org/w/index.php?title=One_Thousand_and_One_Nights&action=raw", "tertiary", "Wikipedia text (CC BY-SA). Source of the statement that Aladdin and Ali Baba were added after the earlier Arabic versions.", "wikitext"),
    "panchatantra_wp": ("panchatantra", "Panchatantra (Wikipedia)", "Wikipedia contributors", "Wikipedia article 'Panchatantra'", "https://en.wikipedia.org/w/index.php?title=Panchatantra&action=raw", "tertiary",
                        "Wikipedia text (CC BY-SA). Used for the recensions and the five-book structure only.", "wikitext"),
    "chacha_wp": ("chacha_chaudhary", "Chacha Chaudhary (Wikipedia)", "Wikipedia contributors", "Wikipedia article 'Chacha Chaudhary'", "https://en.wikipedia.org/w/index.php?title=Chacha_Chaudhary&action=raw", "tertiary",
                  "Wikipedia text (CC BY-SA). Records authorship and publisher of a copyrighted comic series.", "wikitext"),
}


def load_source(sid: str, offline: bool) -> tuple[str, str | None]:
    """Return (extract text, sha256 of the fetched bytes or None when only a stored extract was used)."""
    ex = OUT / "extracts" / f"{sid}.txt"
    if not offline:
        raw = fetch(SOURCES[sid][4])
        if raw:
            text = raw.decode("utf-8", "ignore")
            text = text if SOURCES[sid][7] == "wikitext" else clean(text)
            ex.write_text(text, encoding="utf-8")
            return text, hashlib.sha256(raw).hexdigest()
    if ex.exists():
        return ex.read_text(encoding="utf-8"), None
    return "", None


# ------------------------------------------------------------------------------------------------ parsers
def parse_ryder(t: str) -> list[dict]:
    """Ryder's contents wrap book headings across lines, so work on the whitespace-collapsed text, one chunk per book."""
    flat = re.sub(r"\s+", " ", t.replace("*", " "))
    out = []
    for chunk in re.split(r"(?=BOOK (?:ONE|TWO|THREE|FOUR|FIVE) --)", flat):
        m = re.match(r"BOOK (ONE|TWO|THREE|FOUR|FIVE) -- (.+?)(?: Book | ==|$)", chunk)
        if not m:
            continue
        book, title = m.group(1).title(), re.sub(r"\s+(Book|BOOK)\b.*", "", m.group(2)).strip()
        for s_ in re.finditer(r"== (\d+)\) (.+?), pp?\. ([\d\-]+)", chunk):
            out.append({"book": book, "book_title": title, "number": int(s_.group(1)), "title": s_.group(2).strip(), "pages": s_.group(3)})
    return out


def parse_arnold(t: str) -> list[dict]:
    out, book = [], None
    lines = [l.strip().strip("*").strip() for l in t.splitlines()]
    i = 0
    while i < len(lines):
        l = lines[i]
        m = re.match(r"Book\s*$", l) or re.match(r"Book\s+(\w+):\s*(.+)", l)
        if m and m.lastindex:
            book = (m.group(1), m.group(2).strip())
        elif re.match(r"Book\s*$", l) and i + 1 < len(lines):
            mm = re.match(r"(\w+):\s*(.+)", lines[i + 1])
            if mm:
                book = (mm.group(1), mm.group(2).strip())
        m = re.match(r"^(\d+)\s*$", l)
        if m and book and i + 1 < len(lines) and lines[i + 1].startswith("--"):
            out.append({"book": book[0], "book_title": book[1], "number": int(m.group(1)), "title": lines[i + 1].lstrip("- ").strip()})
        else:
            m = re.match(r"^(\d+)\s*--\s*(.+)", l)
            if m and book:
                out.append({"book": book[0], "book_title": book[1], "number": int(m.group(1)), "title": m.group(2).strip()})
        i += 1
    return out


def parse_jataka(t: str) -> list[dict]:
    out = []
    for m in re.finditer(r"Ja\s+(\d+)\s+(\S+)\s*\|\s*([^|]+?)\s*\(", t.replace("\n", " | ")):
        out.append({"number": int(m.group(1)), "pali": m.group(2), "title": m.group(3).strip()})
    have = {r["number"] for r in out}
    for m in re.finditer(r"Ja\s+(\d+)\s+([^\s,(]+)", t):
        n = int(m.group(1))
        if n not in have and 1 <= n <= 547 and not re.search(rf"(Quoted at|Compare)[^\n]*Ja {n}\b", t[max(0, m.start() - 60):m.start() + 5]):
            tail = t[m.end():m.end() + 160]
            eng = re.search(r"The Birth Story about[^\n]+", tail)
            out.append({"number": n, "pali": m.group(2), "title": eng.group(0).strip() if eng else "(English title not parsed)"})
            have.add(n)
    seen, uniq = set(), []
    for r in sorted(out, key=lambda r: r["number"]):
        if r["number"] not in seen:
            seen.add(r["number"])
            uniq.append(r)
    return uniq


def parse_perry(t: str) -> list[dict]:
    out = []
    for m in re.finditer(r"^\*\s*Perry\s+(\d+)\.\s*(.+)$", t, flags=re.M):
        title = re.sub(r"\[\[(?:[^\]|]*\|)?([^\]]+)\]\]", r"\1", m.group(2)).strip()
        out.append({"number": int(m.group(1)), "title": title})
    return out


def parse_contents(t: str, start: str = "CONTENTS", stop: tuple[str, ...] = ("NOTES", "GLOSSARY", "LIST OF")) -> list[dict]:
    """Numbered titles after a CONTENTS heading in a Wikisource transcription ('1. PUNCHKIN' then a page number)."""
    i = t.find(start)
    if i < 0:
        return []
    out = []
    for line in t[i:i + 9000].splitlines():
        if any(line.strip().upper().startswith(s) for s in stop):
            break
        m = re.match(r"^\W*(\d+)\.\s+(.+?)\s*$", line.strip())
        if m:
            out.append({"number": int(m.group(1)), "title": m.group(2).strip(" .")})
    return out


def parse_roman_contents(t: str) -> list[dict]:
    """Chapters numbered with roman numerals ('I.' on one line, the title on the next, then dotted leaders)."""
    i = t.find("CONTENTS")
    out, n = [], 0
    lines = [l.strip() for l in t[i:i + 12000].splitlines()] if i >= 0 else []
    for k, l in enumerate(lines[:-1]):
        if re.fullmatch(r"[IVXL]+\.", l) and lines[k + 1] and not set(lines[k + 1]) <= set(". "):
            n += 1
            out.append({"number": n, "title": lines[k + 1].strip(" .")})
    return out


def parse_leader_contents(t: str, numbered: bool) -> list[dict]:
    """Contents pages whose title lines are followed by rows of dots or bullets and a page number."""
    i = t.upper().find("CONTENTS")
    lines = [l.replace("\xa0", " ").replace("\u200b", "").strip() for l in t[i:i + 60000].splitlines()] if i >= 0 else []
    lines = [l for l in lines if l and not re.fullmatch(r"[.•\s]+", l) and l.upper() not in ("PAGE", "CONTENTS", "CONTENTS.")]
    out = []
    for k, l in enumerate(lines):
        if re.match(r"^(NOTES|INDEX|GLOSSARY|ILLUSTRATIONS|LIST OF)", l, flags=re.I) and out:
            break
        if numbered:
            m = re.fullmatch(r"(\d+)\.", l)
            if m and k + 1 < len(lines):
                out.append({"number": int(m.group(1)), "title": lines[k + 1].strip(" .")})
        elif not re.fullmatch(r"[\dxvilc\-–, ]+", l, flags=re.I) and not re.fullmatch(r"[IVXL]+\.", l):
            out.append({"number": len(out) + 1, "title": l.strip(" .")})
    return out


# ------------------------------------------------------------------------------------------------ evidence for the author's seed list
EVIDENCE = {
    "monkey_and_crocodile": [("jataka_table", r"Su[ṃṁm]*sumāra"), ("ryder_1925", r"Monkey and the Crocodile")],
    "blue_jackal": [("ryder_1925", r"Blue Jackal"), ("arnold_1861", r"Dyed Jackal")],
    "lion_and_clever_rabbit": [("ryder_1925", r"Numskull and the Rabbit"), ("arnold_1861", r"Lion and the Old Hare")],
    "crows_and_black_snake": [("ryder_1925", r"Black Snake"), ("arnold_1861", r"Black Snake")],
    "tortoise_and_geese": [("arnold_1861", r"Tortoise and the Geese")],
    "mongoose_and_brahmin": [],
    "monkey_and_wedge": [("ryder_1925", r"Wedge-Pulling Monkey"), ("arnold_1861", r"Monkey and the Wedge")],
    "crane_and_crab": [("ryder_1925", r"Heron that Liked Crab"), ("arnold_1861", r"Crane and the Crab")],
    "mice_that_ate_iron": [("ryder_1925", r"Mice That Ate Iron")],
    "donkey_in_tiger_skin": [("arnold_1861", r"Washerman's Jackass"), ("ryder_1925", r"Ass in the Tiger-Skin")],
    "four_friends": [("ryder_1925", r"Winning of Friends"), ("arnold_1861", r"WINNING OF FRIENDS")],
    "lion_and_bull": [("arnold_1861", r"Lion, the Jackals, and the Bull")],
    "owls_and_crows": [("ryder_1925", r"Crows and Owls")],
    "elephant_and_sparrow": [("ryder_1925", r"Elephant and Sparrow")],
    "monkey_king": [("jataka_table", r"Mahākapi")],
    "golden_deer": [("jataka_table", r"Rurumiga|Ruruji|Golden Deer")],
    "hare_in_the_moon": [("jataka_table", r"Sasajātaka")],
    "banyan_deer": [("jataka_table", r"Nigrodhamiga|Banyan Deer")],
    "golden_goose": [("jataka_table", r"Suvaṇṇahaṃsa|Golden Goose|Golden Swan")],
    "mitralabha": [("arnold_1861", r"WINNING OF FRIENDS")],
    "tiger_and_bracelet": [("arnold_1861", r"Tiger and the Traveller")],
    "lion_and_hare_well": [("arnold_1861", r"Lion and the Old Hare")],
    "tortoise_and_hare": [("perry_wp", r"Tortoise and (the )?Hare")],
    "fox_and_grapes": [("perry_wp", r"Fox and the Grapes")],
    "lion_and_mouse": [("perry_wp", r"Lion and (the )?Mouse")],
    "boy_who_cried_wolf": [("perry_wp", r"Shepherd Boy|cried wolf|Boy Who Cried")],
    "thirsty_crow": [("perry_wp", r"Crow and the (Pitcher|Jug|Pot)|Thirsty Crow")],
    "ant_and_grasshopper": [("perry_wp", r"Ant and the (Cicada|Grasshopper)|Cicada")],
    "golden_eggs": [("perry_wp", r"Golden Egg|Goose that Laid")],
    "fisherman_and_jinni": [("nights_wp", r"Fisherman and the Jinni")],
    "sindbad": [("nights_wp", r"Sindbad|Sinbad")],
    "ali_baba": [("nights_wp", r"Ali Baba")],
    "aladdin": [("nights_wp", r"Aladdin")],
}
ADAPTATION = {"aladdin": "Not in the earlier Arabic versions; added by later translators (stated on the Wikipedia article).", "ali_baba": "Not in the earlier Arabic versions; added by later translators (stated on the Wikipedia article)."}
PENDING = {"vikram_betal": "Gutenberg #48511 (Burton, 1870) was in maintenance when fetched; the 25 tales are not yet indexed.", "singhasan_battisi": "No index of the 32 tales fetched; Wikipedia article consulted only."}


def evidence_for(sid: str, texts: dict[str, str]) -> list[dict]:
    """Search the title lines of the structured sources, and the raw text of the tertiary ones."""
    hits = []
    for src, pat in EVIDENCE.get(sid, []):
        for line in texts.get(src, "").splitlines():
            if re.search(pat, line, flags=re.I):
                hits.append({"source": src, "line": line.strip(" *=|")[:140]})
                break
    return hits


def status_for(seed_id: str, collection: str, hits: list[dict]) -> tuple[str, str]:
    docs = {h["source"] for h in hits}
    if seed_id in ADAPTATION and docs:
        return "adaptation", ADAPTATION[seed_id]
    if docs and all(SOURCES[d][5] == "tertiary" for d in docs):
        return "unverified", "only mentioned in a Wikipedia article (tertiary); no edition's contents consulted"
    if len(docs) >= 2:
        return "cross_verified", "listed in " + " and ".join(sorted(docs))
    if len(docs) == 1:
        lvl = SOURCES[next(iter(docs))][5]
        book_level = any(h["line"].startswith("BOOK") for h in hits)
        return "verified", f"listed in {next(iter(docs))} ({lvl})" + ("; matches a BOOK title, not a single story" if book_level else "") + ("; scholarly index reproduced on Wikipedia, original index not consulted" if lvl == "index_via_wiki" else "")
    if collection in PENDING:
        return "research_pending", PENDING[collection]
    return "unverified", "no fetched source lists this title"


def build(offline: bool = False) -> dict:
    texts, fetched = {}, {}
    for sid in SOURCES:
        t, sha = load_source(sid, offline)
        texts[sid] = t
        fetched[sid] = sha
    ryder, arnold = parse_ryder(texts["ryder_1925"]), parse_arnold(texts["arnold_1861"])
    if texts["jataka_table"].startswith("#reduced"):
        jat = [{"number": int(a), "pali": b, "title": c} for a, b, c in (l.split(" | ") for l in texts["jataka_table"].splitlines()[1:])]
    else:
        jat = parse_jataka(texts["jataka_table"])
        # the page is a modern compilation: keep only number, Pali name and English title, never its synopses
        (OUT / "extracts" / "jataka_table.txt").write_text("#reduced: number | Pali name | English title (facts of the index only)\n" + "\n".join(f"{r['number']} | {r['pali']} | {r['title']}" for r in jat) + "\n", encoding="utf-8")
    perry = parse_perry(texts["perry_wp"])
    frere = parse_contents(texts["frere_1898"])
    sun = parse_roman_contents(texts["kingscote_1890"])
    bengal = parse_leader_contents(texts["day_1883"], numbered=True)
    kashmir = [r for r in parse_leader_contents(texts["knowles_1893"], numbered=False) if r["title"].lower() not in ("preface", "introduction")]
    records: list[dict] = []

    def rec(rid, collection, title, src, locator, status, **kw):
        records.append({"id": rid, "collection": collection, "original_title": kw.pop("original_title", None), "english_title": title, "hindi_title": kw.pop("hindi_title", None),
                        "regional_titles": kw.pop("regional_titles", []), "source_id": src, "source_locator": locator, "source_url": SOURCES[src][4] if src in SOURCES else None,
                        "author_compiler": SOURCES[src][2] if src in SOURCES else None, "publication": SOURCES[src][3] if src in SOURCES else None,
                        "verification_status": status, "evidence_level": SOURCES[src][5] if src in SOURCES else "none",
                        "copyright_status": kw.pop("copyright_status", SOURCES[src][6] if src in SOURCES else "unknown"), "translation_status": kw.pop("translation_status", "translation or retelling; not the original text"),
                        "summary": kw.pop("summary", None), "characters": kw.pop("characters", []), "environments": kw.pop("environments", []), "props": kw.pop("props", []),
                        "scene_breakdown": kw.pop("scene_breakdown", None), "notes": kw.pop("notes", ""), **kw})

    for r in ryder:
        rec(f"pt-ryder-{r['book'][:3].lower()}-{r['number']:02d}", "panchatantra", r["title"], "ryder_1925", f"Book {r['book']} ({r['book_title']}), item {r['number']}, pp. {r['pages']}", "verified",
            original_title=None, translation_status="Ryder's 1925 English translation of Purnabhadra's 1199 CE recension (per the translation's title page); titles are Ryder's own renderings")
    for r in arnold:
        rec(f"hit-arnold-{r['book'][:3].lower()}-{r['number']:02d}", "hitopadesha", r["title"], "arnold_1861", f"Book {r['book']} ({r['book_title']}), item {r['number']}", "verified",
            translation_status="Arnold's 1861 verse-and-prose rendering; titles are Arnold's")
    for r in jat:
        rec(f"jat-{r['number']:03d}", "jataka", r["title"], "jataka_table", f"Ja {r['number']}", "verified", original_title=r["pali"],
            translation_status="Pali title with an English rendering from the table; Cowell et al. (Cambridge, 1895-1907) is the standard older English edition (not consulted)")
    for r in perry:
        rec(f"aes-perry-{r['number']:03d}", "aesop", r["title"], "perry_wp", f"Perry {r['number']}", "verified", translation_status="Index title as given by Wikipedia; Greek/Latin sources not consulted",
            notes="Evidence is the Perry Index as reproduced on Wikipedia.")
    for r in frere:
        rec(f"reg-frere-{r['number']:02d}", "regional", r["title"].title(), "frere_1898", f"Contents item {r['number']}", "verified", region="Southern India (as stated by the title; finer region not given in the contents)",
            subcollection="Deccan / Southern India", translation_status="English retelling collected from oral tradition by Mary Frere")
    for r in bengal:
        rec(f"reg-day-{r['number']:02d}", "regional", r["title"], "day_1883", f"Contents item {r['number']}", "verified", region="Bengal (per the collection's title)", subcollection="Bengal",
            translation_status="English retelling collected by Lal Behari Day from oral tradition")
    for r in kashmir:
        rec(f"reg-knowles-{r['number']:02d}", "regional", r["title"], "knowles_1893", f"Contents item {r['number']}", "verified", region="Kashmir (per the collection's title)", subcollection="Jammu and Kashmir",
            translation_status="English retelling collected by J. Hinton Knowles")
    for r in sun:
        rec(f"reg-sun-{r['number']:02d}", "regional", r["title"].title(), "kingscote_1890", f"Contents item {r['number']}", "verified", region="Southern India (as stated by the title)",
            subcollection="Southern India", translation_status="English retelling by Kingscote and Natesa Sastri")

    texts_all = dict(texts)
    texts_all["jataka_table"] = "\n".join(f"{r['pali']} {r['title']}" for r in jat)           # match titles, not synopses
    texts_all["ryder_1925"] = "\n".join(r["title"] for r in ryder) + "\n" + "\n".join(f"BOOK {r['book_title']}" for r in ryder)
    texts_all["arnold_1861"] = "\n".join(r["title"] for r in arnold) + "\n" + "\n".join(f"BOOK {r['book_title']}" for r in arnold)
    texts_all["perry_wp"] = "\n".join(r["title"] for r in perry)
    seeds = []
    for coll, items in STORIES.items():
        for (sid, ten, thi, premise, chars, locs, props, acts, emos) in items:
            hits = evidence_for(sid, texts_all)
            status, why = status_for(sid, coll, hits)
            seeds.append({"id": f"seed-{sid}", "collection": coll, "english_title": ten, "hindi_title": thi, "hindi_title_status": "unverified (supplied by the author, not from a source)", "premise_note": premise,
                          "verification_status": status, "evidence": hits, "evidence_note": why, "characters": chars, "environments": locs, "props": props,
                          "implemented_story": sid in {"monkey_and_crocodile", "blue_jackal", "lion_and_clever_rabbit", "farmer_and_rich_man"}, "source_id": hits[0]["source"] if hits else None,
                          "copyright_status": "traditional tale; wording is the project's own", "translation_status": "not reproduced from any translation"})
    # overlaps documented by the titles of two fetched sources (identification by title only; the texts were not compared)
    overlaps = [
        {"story": "The wedge-pulling monkey", "ryder_1925": "The Wedge-Pulling Monkey (Book One, 2)", "arnold_1861": "The Story of the Monkey and the Wedge (Book Two, 2)", "kind": "same tale in two related collections"},
        {"story": "The blue / dyed jackal", "ryder_1925": "The Blue Jackal (Book One, 14)", "arnold_1861": "The Story of the Dyed Jackal (Book Three, 6)", "kind": "same tale in two related collections"},
        {"story": "The heron / crane and the crab", "ryder_1925": "The Heron that Liked Crab-Meat (Book One, 9)", "arnold_1861": "The Story of the Crane and the Crab (Book Four, 7)", "kind": "same tale in two related collections"},
        {"story": "The lion and the rabbit / old hare", "ryder_1925": "Numskull and the Rabbit (Book One, 10)", "arnold_1861": "The Story of the Lion and the Old Hare (Book Two, 8)", "kind": "same tale in two related collections"},
        {"story": "The black snake", "ryder_1925": "How the Crow-Hen Killed the Black Snake (Book One, 8)", "arnold_1861": "The Story of the Black Snake and the Golden Chain (Book Two, 7)", "kind": "same tale in two related collections"},
    ]
    sources = []
    for sid, (coll, title, author, pub, url, lvl, lic, kind) in SOURCES.items():
        sources.append({"id": sid, "collection": coll, "title": title, "author_compiler": author, "publication": pub, "url": url, "evidence_level": lvl, "licence_note": lic,
                        "retrieved": TODAY if (fetched[sid] or texts[sid]) else None, "sha256_of_fetched_page": fetched[sid], "extract_file": f"stories/research/extracts/{sid}.txt" if texts[sid] else None,
                        "status": "consulted" if texts[sid] else "not_fetched"})
    return {"records": records, "seed_entries": seeds, "overlaps": overlaps, "sources": sources, "counts": {"ryder": len(ryder), "arnold": len(arnold), "jataka": len(jat), "perry": len(perry),
                                                                                                    "frere": len(frere), "kingscote": len(sun), "day": len(bengal), "knowles": len(kashmir)}}


# ------------------------------------------------------------------------------------------------ regional research plan and register
REGIONS = [
    ("Uttar Pradesh and North India", "research_pending", "Wikisource was searched (Nov 2026) and no transcribed collection for this region was found; other sources not yet consulted."),
    ("Rajasthan", "research_pending", "Wikisource was searched (Nov 2026) and no transcribed collection for this region was found; other sources not yet consulted."),
    ("Gujarat", "research_pending", "Wikisource was searched (Nov 2026) and no transcribed collection for this region was found; other sources not yet consulted."),
    ("Maharashtra", "partial", "Frere's Old Deccan Days (title says Southern India) is indexed but its tales are not attributed to Maharashtra specifically; no Maharashtra-specific source consulted."),
    ("Bengal", "partial", "Lal Behari Day's Folk-Tales of Bengal (1883) contents indexed from Wikisource. One collection only; no other Bengali source consulted."),
    ("Assam and Northeast India", "research_pending", "Wikisource was searched (Nov 2026) and no transcribed collection for this region was found; other sources not yet consulted."),
    ("Odisha", "research_pending", "Wikisource was searched (Nov 2026) and no transcribed collection for this region was found; other sources not yet consulted."),
    ("Bihar and Jharkhand", "sources_identified", "Folklore of the Santal Parganas (Bompas, 1909) identified on the Internet Archive (dli.csl.5286); contents not fetched (archive file servers blocked). Wikisource was searched (Nov 2026) and no transcribed collection for this region was found; other sources not yet consulted."),
    ("Punjab and Haryana", "sources_identified", "Wide-Awake Stories (Steel and Temple, 1884) identified on the Internet Archive (wideawakestorie00unkngoog); contents not fetched. Wikisource was searched (Nov 2026) and no transcribed collection for this region was found; other sources not yet consulted."),
    ("Himachal Pradesh and Uttarakhand", "research_pending", "Wikisource was searched (Nov 2026) and no transcribed collection for this region was found; other sources not yet consulted."),
    ("Pan-Indian selections", "sources_identified", "Joseph Jacobs's Indian Fairy Tales (1892) exists on Wikisource, but the fetched rendering did not include its contents list, so it is not indexed."),
    ("Jammu and Kashmir (extra)", "partial", "Knowles's Folk-Tales of Kashmir (1893) contents indexed from Wikisource."),
    ("Tamil Nadu", "partial", "Tales of the Sun (Kingscote and Natesa Sastri, 1890) indexed; the contents name 'Southern India', not Tamil Nadu specifically."),
    ("Kerala", "research_pending", "Wikisource was searched (Nov 2026) and no transcribed collection for this region was found; other sources not yet consulted."),
    ("Karnataka", "partial", "Same Southern-India collections as above; no Karnataka-specific source consulted."),
    ("Andhra Pradesh and Telangana", "research_pending", "The Tenali Rama folklore tradition is described on Wikipedia, but no story index was found."),
]


def register(data: dict) -> dict:
    recs, seeds = data["records"], data["seed_entries"]
    reg = []
    for ckey, meta in COLLECTIONS.items():
        r = [x for x in recs if x["collection"] == ckey]
        s = [x for x in seeds if x["collection"] == ckey]
        srcs = [x for x in data["sources"] if x["collection"] == ckey and x["status"] == "consulted"]
        counts: dict[str, int] = {}
        for x in r + s:
            counts[x["verification_status"]] = counts.get(x["verification_status"], 0) + 1
        gaps = {"panchatantra": "Only the books and stories listed in Ryder's contents are indexed; Sanskrit titles, other recensions (Tantrakhyayika, Southern recension, Pahlavi/Arabic Kalila wa Dimna) and regional versions are not.",
                "jataka": "The 547 numbered stories are indexed by title; their wording is not copied; Cowell's edition and the Pali texts were not consulted directly.",
                "hitopadesha": "Only Arnold's 1861 contents consulted; Sanskrit titles and the other translations are not.",
                "vikram_betal": "The 25 tales are not indexed (Gutenberg was down for maintenance); the frame story is described by a Wikipedia article only.",
                "singhasan_battisi": "The 32 tales are not indexed.",
                "akbar_birbal": "The tradition is oral and anecdotal; no edition's contents consulted, so no individual tale can be verified.",
                "tenali_raman": "No edition's contents consulted, so no individual tale can be verified.",
                "aesop": "Only the Perry numbering as reproduced on Wikipedia; Perry's Aesopica and the Greek/Latin sources were not consulted.",
                "arabian_nights": "Only the Wikipedia article consulted; no edition's table of contents (Burton, Lane, Haddawy, Galland) was parsed.",
                "chacha_chaudhary": "Excluded: a copyrighted comic series. Not catalogued and not reproduced.",
                "folk": "See the regional register.", "original": "Project-owned story."}.get(ckey, "")
        reg.append({"collection": ckey, "name": meta["name"], "sources_consulted": [x["id"] for x in srcs], "records_from_sources": len(r), "seed_entries": len(s), "by_status": counts,
                    "research_gaps": gaps, "remaining_work": "Fetch and parse an edition index for every gap above; verify each seed entry against it; add variants and alternate titles." if gaps and ckey not in ("chacha_chaudhary", "original") else ""})
    return {"generated": TODAY, "collections": reg, "regional_register": [{"region": a, "status": b, "note": c} for a, b, c in REGIONS],
            "totals": {"sources_consulted": len([x for x in data["sources"] if x["status"] == "consulted"]), "source_records": len(recs), "seed_entries": len(seeds),
                       "verified": sum(1 for x in recs + seeds if x["verification_status"] == "verified"), "cross_verified": sum(1 for x in recs + seeds if x["verification_status"] == "cross_verified"),
                       "adaptations": sum(1 for x in recs + seeds if x["verification_status"] == "adaptation"), "unverified": sum(1 for x in recs + seeds if x["verification_status"] == "unverified"),
                       "research_pending": sum(1 for x in recs + seeds if x["verification_status"] == "research_pending"), "documented_overlaps": len(data["overlaps"]),
                       "regions_with_a_consulted_source": len([1 for _, b, _ in REGIONS if b == "partial"]), "regions_total": len(REGIONS)}}


def markdown(reg: dict, data: dict) -> str:
    t = reg["totals"]
    L = ["# Story research register", "", f"Generated {reg['generated']} by `python -m tools.catalogue.research`. Every number is counted from the fetched sources; nothing is claimed beyond what they list.", "",
         f"- Sources consulted: **{t['sources_consulted']}**; story records taken from them: **{t['source_records']}**; seed entries checked against them: **{t['seed_entries']}**",
         f"- Verified {t['verified']} · cross-verified {t['cross_verified']} · adaptations {t['adaptations']} · unverified {t['unverified']} · research pending {t['research_pending']} · documented overlaps {t['documented_overlaps']}",
         f"- Regions with a consulted (partial) source: {t['regions_with_a_consulted_source']} of {t['regions_total']}; no region is complete.", "", "## Collections", "",
         "| Collection | Sources consulted | Records | Seed entries | By status | Research gaps |", "|---|---|---|---|---|---|"]
    for c in reg["collections"]:
        L.append(f"| {c['name']} | {', '.join(c['sources_consulted']) or 'none'} | {c['records_from_sources']} | {c['seed_entries']} | {', '.join(f'{k} {v}' for k, v in sorted(c['by_status'].items())) or '-'} | {c['research_gaps']} |")
    L += ["", "## Regional folk-tale register", "", "| Region | Status | Note |", "|---|---|---|"] + [f"| {r['region']} | {r['status']} | {r['note']} |" for r in reg["regional_register"]]
    L += ["", "## Sources", "", "| Id | Evidence | Title | URL | Status |", "|---|---|---|---|---|"] + [f"| {s['id']} | {s['evidence_level']} | {s['title']} | {s['url']} | {s['status']} |" for s in data["sources"]]
    L += ["", "## Documented overlaps (identified by title in two fetched sources)", ""] + [f"- {o['story']}: Ryder: {o['ryder_1925']}; Arnold: {o['arnold_1861']}" for o in data["overlaps"]]
    L += ["", "## Excluded", "", "- Chacha Chaudhary: copyrighted comic series (created by Pran Kumar Sharma, published by Diamond Comics, from 1971, per the Wikipedia article). Not catalogued or reproduced; the library uses original archetypes only."]
    return "\n".join(L) + "\n"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--offline", action="store_true", help="use the stored extracts instead of fetching")
    a = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "extracts").mkdir(exist_ok=True)
    data = build(a.offline)
    reg = register(data)
    (OUT / "sources.json").write_text(json.dumps(data["sources"], ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    (OUT / "records.json").write_text(json.dumps({"records": data["records"], "seed_entries": data["seed_entries"], "overlaps": data["overlaps"]}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    (OUT / "register.json").write_text(json.dumps(reg, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    (ROOT / "docs" / "generated").mkdir(parents=True, exist_ok=True)
    (ROOT / "docs" / "generated" / "STORY_RESEARCH_REGISTER.md").write_text(markdown(reg, data), encoding="utf-8")
    print(json.dumps({"parsed": data["counts"], **reg["totals"]}))


if __name__ == "__main__":
    main()
