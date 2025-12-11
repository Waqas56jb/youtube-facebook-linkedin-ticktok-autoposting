from __future__ import annotations

"""
Hashtag generation service.

Strategy:
1) Topic detection from transcript via lightweight keyword matching.
2) Map topics to a curated hashtag library (big/mid/niche) per niche.
3) Assemble a balanced set (2 big, 3 mid, 2 niche) and deduplicate.
4) Fallback to bigram-based extractor if no niche matches.
"""

from typing import Dict, List, Tuple
import re


NICHES: Dict[str, Dict[str, List[str]]] = {
    # Property / Investing niche
    "property": {
        "keywords": [
            "property", "real estate", "realestate", "buy to let", "buy-to-let",
            "invest", "investing", "investment", "rental", "mortgage", "landlord",
            "uk property", "yield", "cash flow", "cashflow", "roi"
        ],
        "big": ["propertyinvesting", "realestate", "investing"],
        "mid": ["ukproperty", "buytolet", "propertystrategy", "passiveincome", "propertytips"],
        "niche": ["analysisparalysis", "StopOverthinking", "FindYourSpot", "investorfocus", "arearesearch"],
    },
    # General lifestyle / vlog
    "lifestyle": {
        "keywords": [
            "daily", "routine", "morning", "evening", "coffee", "breakfast",
            "lunch", "dinner", "walk", "movie", "series", "vlog", "day"
        ],
        "big": ["DailyVlog", "LifeStyle", "MorningRoutine"],
        "mid": ["CoffeeTime", "LunchBreak", "EveningWalk", "MovieNight", "DailyRoutine"],
        "niche": ["MorningEmails", "SimpleHabits", "SmallWins"],
    },
    # Business / entrepreneurship
    "business": {
        "keywords": [
            "business", "entrepreneur", "startup", "growth", "marketing", "sales",
            "system", "automation", "cash flow", "strategy", "kpi"
        ],
        "big": ["business", "entrepreneurship", "smallbusiness"],
        "mid": ["growthstrategy", "operations", "automation", "kpis", "leadgen"],
        "niche": ["StandardOperatingProcedures", "Delegation", "AsyncWork"],
    },
}


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def _score_niches(transcript: str) -> List[Tuple[str, int]]:
    txt = _normalize(transcript)
    scores: List[Tuple[str, int]] = []
    for niche, cfg in NICHES.items():
        count = 0
        for kw in cfg.get("keywords", []):
            if kw in txt:
                count += 1
        scores.append((niche, count))
    scores.sort(key=lambda kv: (-kv[1], kv[0]))
    return scores


def _pick_balanced(tags: Dict[str, List[str]], max_total: int = 10) -> List[str]:
    chosen: List[str] = []
    seen = set()
    def take(arr: List[str], n: int):
        for t in arr:
            if len(chosen) >= max_total:
                return
            if t not in seen:
                seen.add(t)
                chosen.append(t)
                if len(chosen) >= max_total:
                    return
    take(tags.get("big", []), 2)
    take(tags.get("mid", []), 3)
    take(tags.get("niche", []), 2)
    # Fill remainder with remaining mid then big
    take(tags.get("mid", [])[3:], max_total - len(chosen))
    take(tags.get("big", [])[2:], max_total - len(chosen))
    return chosen[:max_total]


def hashtags_from_niches(transcript: str, max_tags: int = 10) -> List[str]:
    scores = _score_niches(transcript)
    if not scores or scores[0][1] <= 0:
        return []
    top_niche = scores[0][0]
    cfg = NICHES.get(top_niche) or {}
    picked = _pick_balanced(cfg, max_total=max_tags)
    # Ensure hashtags format with '#'
    return [('#' + t if not t.startswith('#') else t) for t in picked]


def hashtags_bigrams_generic(transcript: str, max_tags: int = 10) -> List[str]:
    """Generic bigram fallback used when no niche matches."""
    txt = _normalize(transcript)
    stop = set([
        'the','a','an','and','or','but','so','to','of','in','on','for','with','as','at','by','from','is','are','was','were','be','been','being','it','its','that','this','these','those','i','you','he','she','we','they','them','me','my','our','your','his','her','their','not','no','do','did','does','doing','have','has','had','having','about','into','over','after','before','between','up','down','out','again','further','then','once','here','there','when','where','why','how','all','any','both','each','few','more','most','other','some','such','only','own','same','than','too','very','can','will','just','now'
    ])
    low = set(['around','usually','always','really','nothing','important','followed','during','comes','come','coming','start','starts','starting','feel','feels','felt','quite','often','sometimes','typically','generally','mostly','mainly','just','only','maybe','probably','perhaps','get','gets','getting','got','set','sets','setting','make','makes','making','take','takes','taking','go','goes','going','went','say','says','saying','said','like','likes','liked','try','tries','trying','tried','work','works','working','drink','drinks','drinking','eat','eats','eating','meet','meets','meeting','meetings','think','thinks','thinking','cup','thing','stuff','things','bit','lot'])
    tokens = [t for t in re.findall(r"[a-zA-Z][a-zA-Z\-']+", txt) if t not in stop and t not in low and len(t) >= 3]
    if len(tokens) < 2:
        return []
    # counts
    uni: Dict[str,int] = {}
    for t in tokens:
        uni[t] = uni.get(t, 0) + 1
    N = max(1, len(tokens))
    bigrams: Dict[Tuple[str,str], int] = {}
    for i in range(len(tokens)-1):
        a, b = tokens[i], tokens[i+1]
        if a in low or b in low:
            continue
        bg = (a, b)
        bigrams[bg] = bigrams.get(bg, 0) + 1
    import math
    def pmi(a: str, b: str, f_ab: int) -> float:
        return math.log((f_ab * N) / max(1, uni.get(a,1) * uni.get(b,1)))
    scored = [((f * (1.0 + pmi(a,b,f))), (a,b), f) for (a,b), f in bigrams.items()]
    scored.sort(key=lambda x: (-x[0], -x[2], x[1]))
    def render(a: str, b: str) -> str:
        # Normalize endings like "time(s)"
        if b in ("time","times","hour","hours"):
            b = "time"
        return f"#{a.capitalize()}{b.capitalize()}"
    tags: List[str] = []
    seen = set()
    for score, (a,b), f in scored:
        if pmi(a,b,f) <= 0:
            continue
        hh = render(a,b)
        if len(hh) < 6 or hh.lower() in seen:
            continue
        seen.add(hh.lower())
        tags.append(hh)
        if len(tags) >= max_tags:
            break
    return tags


def generate_hashtags(transcript: str, max_tags: int = 10) -> List[str]:
    # Try niche mapping first
    mapped = hashtags_from_niches(transcript, max_tags=max_tags)
    if mapped:
        return mapped[:max_tags]
    # Fallback: data-driven bigrams
    return hashtags_bigrams_generic(transcript, max_tags=max_tags)


