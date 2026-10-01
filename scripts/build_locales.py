# Writes locale JSON files from scripts/i18n_data.py. Existing translations are kept; only the listed keys are (re)written.
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from i18n_data import DATA, ATTRACTION_LABELS
root = os.path.join(os.path.dirname(__file__), "..", "locales")

def load(lang, name):
    p = os.path.join(root, lang, f"{name}.json")
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else {}

def save(lang, name, data):
    os.makedirs(os.path.join(root, lang), exist_ok=True)
    with open(os.path.join(root, lang, f"{name}.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False); f.write("\n")

for lang, d in DATA.items():
    common, home, dest = load(lang, "common"), load(lang, "home"), load(lang, "destination")
    if d["nav"]: common.setdefault("nav", {}).update(d["nav"])
    common.setdefault("ui", {}).update(d["ui"])
    common.setdefault("search", {}).update(d["search"])
    for k in ("tagline",):
        if k in d: common[k] = d[k]
    if "footer" in d: common.setdefault("footer", {}).update(d["footer"])
    common.setdefault("siteName", "budgettourism")
    dest.setdefault("sectionTitles", {}).update(d["st"])
    dest.setdefault("pages", {}).update(d["pages"])
    if lang in ATTRACTION_LABELS: dest.setdefault("attraction", {}).update(ATTRACTION_LABELS[lang])
    for k, v in d["home"].items():
        if isinstance(v, dict): home.setdefault(k, {}).update(v)
        else: home[k] = v
    save(lang, "common", common); save(lang, "home", home); save(lang, "destination", dest)
print("ok", list(DATA))
