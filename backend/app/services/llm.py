from typing import Optional
from backend.app.services.hashtags import generate_hashtags
import google.generativeai as genai
from fastapi import HTTPException
from typing import Literal
from backend.app.config import settings

_configured = False


def _ensure_configured() -> None:
    global _configured
    if _configured:
        return
    api_key: Optional[str] = settings.gemini_api_key or settings.google_api_key
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not set")
    genai.configure(api_key=api_key)
    _configured = True


def generate_story_with_gemini(
    transcript: str,
    story_format: Optional[Literal["lucy", "narrative", "business", "motivational"]] = None,
    use_custom_prompt: Optional[bool] = None,
    custom_prompt: Optional[str] = None,
) -> str:
    _ensure_configured()
    model = genai.GenerativeModel(settings.gemini_model)
    framing, story = _extract_framing_and_story(transcript)
    prompt = _build_prompt(framing, story, story_format, use_custom_prompt, custom_prompt)
    resp = model.generate_content(prompt)
    text = getattr(resp, "text", None)
    if not text:
        # SDK may return candidates structure; try to extract
        try:
            text = resp.candidates[0].content.parts[0].text  # type: ignore
        except Exception:
            raise HTTPException(status_code=502, detail="Gemini response was empty")
    # Return EXACTLY what the model outputs (preserve spacing and headings)
    return (text or "").strip()


def generate_chat_response(message: str, system_hint: Optional[str] = None) -> str:
    """General-purpose chat completion via Gemini."""
    _ensure_configured()
    model = genai.GenerativeModel(settings.gemini_model)
    prompt = message if not system_hint else f"System: {system_hint}\n\nUser: {message}"
    resp = model.generate_content(prompt)
    text = getattr(resp, "text", None)
    if not text:
        try:
            text = resp.candidates[0].content.parts[0].text  # type: ignore
        except Exception:
            raise HTTPException(status_code=502, detail="Gemini chat response empty")
    return _clean_output(text)


def _extract_framing_and_story(transcript: str) -> tuple[str, str]:
    parts = transcript.split('.')
    if len(parts) > 1:
        framing = parts[0].strip() + '.'
        story = '.'.join(parts[1:]).strip()
    else:
        framing = "Personal growth and reflection"
        story = transcript
    return framing, story


def _clean_output(story: str) -> str:
    import re as _re
    cleaned = story.strip()
    # Remove markdown symbols while preserving content
    cleaned = _re.sub(r"#+\s*\*\*(.*?)\*\*", r"\1", cleaned)
    cleaned = _re.sub(r"\*\*(.*?)\*\*", r"\1", cleaned)
    cleaned = _re.sub(r">\s*\"(.*?)\"", r"\"\1\"", cleaned)
    cleaned = _re.sub(r">\s*(.*?)(?=\n|$)", r"\1", cleaned)
    # Remove label but keep CTA text
    cleaned = _re.sub(r"🎯\s*Final CTA:\s*", "", cleaned)
    # Strip emojis and pictographs
    emoji_pattern = _re.compile(
        r"[\U0001F600-\U0001F64F]|[\U0001F300-\U0001F5FF]|[\U0001F680-\U0001F6FF]|[\U0001F700-\U0001F77F]|[\U0001F780-\U0001F7FF]|[\U0001F800-\U0001F8FF]|[\U0001F900-\U0001F9FF]|[\U0001FA00-\U0001FA6F]|[\U0001FA70-\U0001FAFF]|[\u2600-\u26FF]|[\u2700-\u27BF]",
        flags=_re.UNICODE,
    )
    cleaned = emoji_pattern.sub("", cleaned)
    # Remove bracketed placeholders like [website]
    cleaned = _re.sub(r"\[[^\]]*\]", "", cleaned)
    # Symbols normalization
    cleaned = _re.sub(r"#\s*", "", cleaned)
    cleaned = _re.sub(r"@\s*", "", cleaned)
    cleaned = _re.sub(r"&\s*", " and ", cleaned)
    cleaned = _re.sub(r"%\s*", " percent ", cleaned)
    cleaned = _re.sub(r"\$\s*", " dollars ", cleaned)
    cleaned = _re.sub(r"\+", " plus ", cleaned)
    cleaned = _re.sub(r"=", " equals ", cleaned)
    cleaned = _re.sub(r"/", " slash ", cleaned)
    cleaned = _re.sub(r"\\", " backslash ", cleaned)
    cleaned = _re.sub(r"\*", "", cleaned)
    cleaned = _re.sub(r"_", " ", cleaned)
    cleaned = _re.sub(r"\|", " or ", cleaned)
    cleaned = _re.sub(r"~", " approximately ", cleaned)
    cleaned = _re.sub(r"\^", " to the power of ", cleaned)
    # Common misreads
    cleaned = _re.sub(r"cut\s*board", "clipboard", cleaned, flags=_re.IGNORECASE)
    cleaned = _re.sub(r"hash\s*tag", "hashtag", cleaned, flags=_re.IGNORECASE)
    # Remove CUT markers
    cleaned = _re.sub(r"\bCUT\s*\d+\s*\n", "", cleaned)
    # Normalize excessive line breaks (keep meaningful newlines)
    cleaned = _re.sub(r"\n{4,}", "\n\n\n", cleaned)
    # Reduce multiple spaces but do NOT touch newlines
    cleaned = _re.sub(r"[ \t]{2,}", " ", cleaned)
    # Sentence spacing
    cleaned = _re.sub(r"([.!?])\s*([A-Z])", r"\1 \2", cleaned)
    # Clean up leftover markdown on line starts
    cleaned = _re.sub(r"^\s*[-*]\s*", "", cleaned, flags=_re.MULTILINE)
    cleaned = _re.sub(r"^\s*>\s*", "", cleaned, flags=_re.MULTILINE)
    cleaned = _re.sub(r"^\s*#+\s*", "", cleaned, flags=_re.MULTILINE)
    # Normalize repeated punctuation
    cleaned = _re.sub(r"\.{2,}", ".", cleaned)
    cleaned = _re.sub(r",{2,}", ",", cleaned)
    cleaned = _re.sub(r"!{2,}", "!", cleaned)
    cleaned = _re.sub(r"\?{2,}", "?", cleaned)
    return cleaned.strip()


def _format_story_universal(text: str) -> str:
    """Enforce universal line-breaking format: blank line after title, between sections,
    and paragraphs. Adds dashed underlines to clear section headings where appropriate."""
    try:
        t = text.replace('\r\n', '\n').replace('\r', '\n').strip()
        lines = [l.strip() for l in t.split('\n')]
        # Remove consecutive empty lines
        compact: list[str] = []
        for l in lines:
            if l == '' and (len(compact) == 0 or compact[-1] == ''):
                continue
            compact.append(l)
        # Ensure a blank line after the first non-empty line (title)
        out: list[str] = []
        title_done = False
        for l in compact:
            out.append(l)
            if not title_done and l != '':
                out.append('')
                title_done = True
        # Insert blank lines before likely section headers and underline them
        result: list[str] = []
        prev_blank = True
        def is_heading(s: str) -> bool:
            if not s:
                return False
            if s.startswith(('-', '*', '"', "'", '[')):
                return False
            if s.endswith(('.', '!', '?', '"', "'", ':')) and not s.endswith('Summary:'):
                return False
            # Only treat specific patterns as headings (segment titles, chapters, etc.)
            return (('🎬' in s) or ('Chapter' in s) or ('Segment' in s) or ('Part' in s) or ('Core Lessons' in s))
        for l in out:
            if is_heading(l):
                # Different spacing for Core Lessons vs segment titles
                if 'Core Lessons' in l:
                    # Minimal spacing for Core Lessons
                    if not prev_blank and len(result) > 0:
                        result.append('')
                    result.append(f"**{l}**")
                    result.append('')
                else:
                    # Generous spacing for segment titles
                    if not prev_blank and len(result) > 0:
                        result.append('')
                        result.append('')
                    # Make segment titles bold for visual distinction
                    if '🎬' in l or 'Chapter' in l or 'Segment' in l or 'Part' in l:
                        result.append(f"**{l}**")
                    else:
                        result.append(l)
                    # No underlines, just spacing
                    result.append('')
                    result.append('')
                prev_blank = True
                continue
            result.append(l)
            prev_blank = (l == '')
        # Collapse excessive blank lines to max 2
        final_lines: list[str] = []
        blank_count = 0
        for l in result:
            if l == '':
                blank_count += 1
                if blank_count <= 2:
                    final_lines.append('')
            else:
                blank_count = 0
                final_lines.append(l)
        formatted = '\n'.join(final_lines).strip()
        return formatted
    except Exception:
        return text


def _build_prompt(
    framing: str,
    story: str,
    story_format: Optional[str],
    use_custom_prompt: Optional[bool],
    custom_prompt: Optional[str],
) -> str:
    # If a custom prompt is supplied, use it verbatim
    if use_custom_prompt and (custom_prompt or "").strip():
        return f"""
You are a professional scriptwriter and formatter.
Your job is to generate property/finance stories in EXACTLY the required format.
Do not add or remove headings. No commentary, emojis, checkmarks, explanations, or meta-text.

{custom_prompt}

SOURCE TRANSCRIPT (use as the only source of truth):
Framing:
{framing}

Story:
{story}
"""

    # Enforce the strict story template universally
    return f"""
You are a professional scriptwriter and formatter.
Your job is to generate property/finance stories in EXACTLY the format below.
Rules:
- Do not add or remove headings.
- Do not add any extra commentary, emojis, ✅ marks, explanations, or meta-text.
- Keep spacing and alignment EXACTLY as shown.
- Replace all bracketed placeholders with concrete story content derived ONLY from the transcript.
- Do NOT output any brackets [] in the final story.
 - Do NOT shorten, compress, or summarize away specific details from the transcript.
 - Preserve all concrete items, names, dates, prices, measurements, counts, and brand/model names verbatim.

Use ONLY the following transcript content as source material:
Framing:
{framing}

Story:
{story}

Now output the story in the exact template below (preserve spaces and newlines, center alignment spacing, and headings exactly):

=====================================================
[Title of Story]

[Intro line: one sentence]

Core Lessons
[Lesson 1]
[Lesson 2]
[Lesson 3]

                                                     Segment 1:  

[Segment Title]

[Hook line 1]  
[Hook line 2]  
[Hook line 3]  

[Paragraph story text]  

[Engagement question]  

                                        Segment 2:  

[Segment Title]

[Hook line 1]  
[Hook line 2]  
[Hook line 3]  

[Paragraph story text]  

[Engagement question]  

                                      Segment 3:  

[Segment Title]

[Hook line 1]  
[Hook line 2]  
[Hook line 3]  

[Paragraph story text]  

[Engagement question]  

                                         Segment 4:  

[Segment Title]

[Hook line 1]  
[Hook line 2]  
[Hook line 3]  

[Paragraph story text]  

[Engagement question]  

[Final 3 closing lines – no heading, no label]
=====================================================

MANDATORY:
- Keep spacing exactly as shown (including the centered Segment labels with leading spaces).
- Keep "Core Lessons" heading only. No other headings.
- Do not include any brackets or placeholder text in the final output.
- Only use content grounded in the provided transcript.
 - Content length and fidelity requirements:
   - Total story length: at least 600 words.
   - [Intro line]: 18–28 words, sets context without buzzwords.
   - Core Lessons: exactly 3 lines; each 8–14 words; concrete and transcript-grounded.
   - For each Segment's [Paragraph story text]: 140–220 words. Include ALL actionable items and specifics from the transcript. Use clear sentences, semicolons, and commas to enumerate details; do NOT switch to bullet points.
   - Hook lines: 3 lines; each 6–12 words; no emojis; no hashtags.
   - Engagement question: single sentence, ends with a question mark, 14–22 words.
   - Final 3 closing lines: each 10–18 words, summarizing outcomes and next steps without new headings.
   - Do not translate the transcript’s terminology or currency; keep currency symbols like £ intact.
"""


def generate_caption_and_title(filename: str, transcript: Optional[str] = None, seed: Optional[int] = None) -> dict:
    _ensure_configured()
    model = genai.GenerativeModel(settings.gemini_model)

    # Basic keyword extraction from transcript to force grounding
    def _top_terms(text: str, limit: int = 12) -> list[str]:
        import re
        if not text:
            return []
        tokens = re.findall(r"[A-Za-z][A-Za-z\-']+", text.lower())
        stop = set([
            'the','a','an','and','or','but','so','to','of','in','on','for','with','as','at','by','from','is','are','was','were','be','been','being','it','its','that','this','these','those','i','you','he','she','we','they','them','me','my','our','your','his','her','their','not','no','do','did','does','doing','have','has','had','having','about','into','over','after','before','between','up','down','out','again','further','then','once','here','there','when','where','why','how','all','any','both','each','few','more','most','other','some','such','only','own','same','than','too','very','can','will','just','now'
        ])
        counts: dict[str,int] = {}
        for t in tokens:
            if t in stop or len(t) <= 2:
                continue
            counts[t] = counts.get(t, 0) + 1
        sorted_terms = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
        return [k for k, _ in sorted_terms[:limit]]

    key_terms = _top_terms(transcript or "")
    key_terms_str = ", ".join(key_terms) if key_terms else ""

    prompt = f"""
You will be given a raw VIDEO TRANSCRIPT. Generate a Title, a long Caption, and Hashtags that are STRICTLY grounded in the transcript content.

OUTPUT FORMAT (plain text, no labels, no markdown symbols):
1) First line: a 6-10 word Title that clearly reflects the transcript topic.
2) Blank line.
3) One-line Hook that matches the transcript's subject (no clickbait, no business jargon unless present in transcript).
4) Blank line.
5) Long caption body of 900–1400 characters summarizing SPECIFIC details from the transcript (use its vocabulary and concrete moments; do not generalize beyond transcript).
6) Blank line.
7) One-line CTA that fits the transcript context (avoid generic “follow for more” unless transcript suggests it).
8) Blank line.
9) One single line containing 15–25 space-separated hashtags. All hashtags must derive from the transcript vocabulary; avoid generic tags unrelated to the transcript.

TRANSCRIPT (the sole source of truth):
{transcript or 'None provided'}

GROUNDING REQUIREMENTS:
- Use only information present in the transcript. Do NOT invent topics.
- Mirror the transcript’s vocabulary and subject matter.
- Include at least 5 of these key terms verbatim in the caption body (if available): {key_terms_str}
- Avoid business/marketing language unless it appears in the transcript.
- No references to filename, no meta commentary, no labels.
"""
    def _call_llm(p: str) -> str:
        try:
            r = model.generate_content(p)
            t = getattr(r, "text", None)
            if t:
                return t
            try:
                return r.candidates[0].content.parts[0].text  # type: ignore
            except Exception:
                return ""
        except Exception:
            return ""

    txt = _call_llm(prompt)
    # Retry with shorter, even stricter prompt if first attempt is empty
    if not txt:
        retry_prompt = f"""
You will receive a VIDEO TRANSCRIPT. Produce:
1) Title (6-10 words) that clearly matches the transcript topic.
2) Blank line.
3) Long caption (900–1400 chars) summarizing concrete details from the transcript only.
4) Blank line.
5) 15–25 hashtags strictly derived from transcript vocabulary (single line, space-separated).

TRANSCRIPT:
{transcript or ''}

Rules: no labels, no markdown, no generic business language unless in transcript, mirror the transcript vocabulary.
"""
        txt = _call_llm(retry_prompt)
    # Parse plain text output per required layout
    lines = [l.rstrip() for l in (txt or "").splitlines()]
    # Title = first non-empty line
    title = next((l.strip() for l in lines if l.strip()), "").strip()
    # Remaining content after title
    try:
        first_idx = next(i for i, l in enumerate(lines) if l.strip())
        remainder = lines[first_idx + 1:]
    except StopIteration:
        remainder = []

    # Determine hashtags line as the last line containing >=5 # tokens (may be replaced later)
    hashtags_line = ""
    for l in reversed(remainder):
        tokens = [t for t in l.strip().split() if t.startswith('#')]
        if len(tokens) >= 5:
            hashtags_line = l.strip()
            break

    # Build caption by joining remainder without the detected hashtags line
    caption_lines: list[str] = []
    for l in remainder:
        if hashtags_line and l.strip() == hashtags_line:
            continue
        caption_lines.append(l)

    # Trim leading/trailing blank lines in caption
    def _trim_blanks(arr: list[str]) -> list[str]:
        start = 0
        end = len(arr)
        while start < end and not arr[start].strip():
            start += 1
        while end > start and not arr[end - 1].strip():
            end -= 1
        return arr[start:end]

    caption = "\n".join(_trim_blanks(caption_lines)).strip()

    # Data-driven hashtag generation purely from transcript (no hardcoding of topics)
    def _hashtags_from_transcript(text: str, fallback_line: str) -> str:
        import re
        txt = (text or '').lower()
        # Tokenize and filter stopwords
        stop = set([
            'the','a','an','and','or','but','so','to','of','in','on','for','with','as','at','by','from','is','are','was','were','be','been','being','it','its','that','this','these','those','i','you','he','she','we','they','them','me','my','our','your','his','her','their','not','no','do','did','does','doing','have','has','had','having','about','into','over','after','before','between','up','down','out','again','further','then','once','here','there','when','where','why','how','all','any','both','each','few','more','most','other','some','such','only','own','same','than','too','very','can','will','just','now'
        ])
        # General low-signal/adverb/aux/verb-ish and filler nouns to exclude from tags across topics
        low_info = set([
            'around','usually','always','really','nothing','important','followed','during','comes','come','coming','start','starts','starting','feel','feels','felt','quite','often','sometimes','typically','generally','mostly','mainly','just','only','maybe','probably','perhaps',
            'get','gets','getting','got','set','sets','setting','make','makes','making','take','takes','taking','go','goes','going','went','say','says','saying','said','like','likes','liked','try','tries','trying','tried','work','works','working',
            'drink','drinks','drinking','eat','eats','eating','meet','meets','meeting','meetings','think','thinks','thinking',
            'cup','thing','stuff','things','bit','lot'
        ])
        tokens = [t for t in re.findall(r"[a-zA-Z][a-zA-Z\-']+", txt) if t not in stop and t not in low_info and len(t) >= 3]
        if len(tokens) < 2:
            return ''
        # Unigram counts
        uni: dict[str,int] = {}
        for t in tokens:
            uni[t] = uni.get(t, 0) + 1
        N = max(1, len(tokens))
        # Bigram counts only (strict bigram mode)
        bigrams: dict[tuple[str,str], int] = {}
        for i in range(len(tokens)-1):
            a, b = tokens[i], tokens[i+1]
            if a in low_info or b in low_info:
                continue
            bg = (a, b)
            bigrams[bg] = bigrams.get(bg, 0) + 1
        # Score with a simple PMI-like metric; prefer higher freq and higher PMI
        def pmi2(a: str, b: str, f_ab: int) -> float:
            import math
            return math.log((f_ab * N) / max(1, uni.get(a,1) * uni.get(b,1)))
        def score_bigram(bg: tuple[str,str]) -> float:
            f = bigrams[bg]
            return f * (1.0 + pmi2(bg[0], bg[1], f))
        # Rank candidates
        cand_scores: list[tuple[float, tuple[str,str]]] = []
        for bg in bigrams:
            cand_scores.append((score_bigram(bg), bg))
        cand_scores.sort(key=lambda x: (-x[0], x[1]))
        # Render to CamelCase 2 words; avoid duplicates and banned; enforce minimums
        def render(words: tuple[str,str]) -> str:
            a, b = words
            return ''.join([a.capitalize(), b.capitalize()])
        banned_unigrams = set(['video','transcript','apple','area'])
        tags: list[str] = []
        seen: set[str] = set()
        for score, words in cand_scores:
            if any(w in banned_unigrams for w in words):
                continue
            # Basic thresholds: require freq>=1 and PMI>0 to avoid random pairs
            f = bigrams[words]
            if f < 1:
                continue
            if pmi2(words[0], words[1], f) <= 0:
                continue
            # Normalize common endings for readability
            a, b = words
            if b in ('time','times','hour','hours'):
                words = (a,'time')
            t = render(words)
            if len(t) < 6:  # too short after CamelCase
                continue
            if t not in seen:
                seen.add(t)
                tags.append(t)
            if len(tags) >= 10:
                break
        # If still fewer than 8, add strong unigrams that belong to selected phrases
        if len(tags) < 8:
            # Gather unigram counts limited to those that belong to any selected n-gram
            unigram_counts: dict[str,int] = {}
            allowed: set[str] = set()
            for t in tags:
                # Re-split camel-like hashtags back into words boundaries (approximate by lowercase blocks)
                parts = re.findall(r"[a-z]+", t)
                allowed.update(parts)
            for tok in tokens:
                if tok in allowed and tok not in banned_unigrams:
                    unigram_counts[tok] = unigram_counts.get(tok, 0) + 1
            for w,_ in sorted(unigram_counts.items(), key=lambda kv: (-kv[1], kv[0])):
                h = ''.join(p.capitalize() for p in [w])
                if h not in seen:
                    seen.add(h)
                    tags.append(h)
                if len(tags) >= 12:
                    break
        # If transcript is too short, fall back to any provided line filtered by alnum
        if not tags and fallback_line:
            base = [w[1:] for w in fallback_line.strip().split() if w.startswith('#')]
            base = [re.sub(r"[^a-z0-9]+","", b.lower()) for b in base if b.lower() not in banned_unigrams]
            tags = [''.join(p.capitalize() for p in b.split()) for b in base if b]
        # Prefer 5–10 concise tags
        tags = tags[:10]
        return ' '.join('#'+t for t in tags)

    # Prefer niche-mapped + bigram fallback hashtag generator
    hashtags_line = ' '.join(generate_hashtags(transcript or '', max_tags=10))

    # Improve weak titles: if <4 words or mostly low-info, rebuild from top n-grams
    def _improve_title(text: str, current: str) -> str:
        import re
        words = [w for w in re.findall(r"[A-Za-z]+", (current or '')) if len(w) >= 3]
        # We want 8–10 words; if current already fits, keep it
        if 8 <= len(words) <= 10:
            return current
        # Build from transcript n-grams
        txt = (text or '').lower()
        stop = set(['the','a','an','and','or','to','of','in','on','for','with','as','at','by','from','is','are','was','were','be','been','being','it','its','that','this','these','those'])
        toks = [t for t in re.findall(r"[a-zA-Z][a-zA-Z\-']+", txt) if t not in stop and len(t) >= 3]
        def ngrams(n:int):
            return [' '.join(toks[i:i+n]) for i in range(len(toks)-n+1)]
        grams = ngrams(3) + ngrams(2)
        freq: dict[str,int] = {}
        for g in grams:
            freq[g] = freq.get(g, 0) + 1
        ordered = [g for g,_ in sorted(freq.items(), key=lambda kv: (-kv[1], -len(kv[0]), kv[0]))]
        parts: list[str] = []
        for g in ordered:
            # Pick distinct phrases
            if all(w not in ' '.join(parts) for w in g.split()):
                parts.append(g)
            # stop when we have enough words (8–10 approx)
            if len((' '.join(parts)).split()) >= 10:
                break
        # Assemble and trim to 8–10 words
        raw = ' '.join(parts).title().split()
        if len(raw) < 8:
            # pad with remaining top tokens
            extra = [t.title() for t,_ in sorted({w:0 for w in toks}.items()) if t not in raw]
            raw = (raw + extra)[:10]
        if len(raw) > 10:
            raw = raw[:10]
        candidate = ' '.join(raw) if raw else (current or 'Video Title')
        return candidate

    # Improve/standardize title from transcript n-grams
    title = _improve_title(transcript or '', title)

    if not title or not caption or not hashtags_line:
        # Deterministic fallback grounded in transcript
        t = (transcript or "").strip()
        # Title: derive from top terms or first meaningful phrase
        def _fallback_title(text: str) -> str:
            terms = _top_terms(text, limit=6)
            if terms:
                core = ", ".join(w.capitalize() for w in terms[:4])
                return f"{core}: A Daily Routine" if "routine" in text.lower() else core
            first = (text.split(". ")[0] or "Video Overview").strip()
            words = first.split()
            return " ".join(words[:10])
        # Caption: use the transcript summarized by trimming and spacing
        def _fallback_caption(text: str) -> str:
            import re
            sents = re.split(r"(?<=[.!?])\s+", text)
            body = " ".join(sents)[:1300]
            body = body.strip()
            if len(body) < 300:
                body = (text[:1200]).strip()
            return body
        # Hashtags: from key terms
        def _fallback_tags(text: str) -> str:
            terms = _top_terms(text, limit=20)
            if not terms:
                return "#video #transcript"
            tags = ["#" + w.replace(" ", "") for w in terms]
            return " ".join(tags)
        title_fb = _fallback_title(t)
        caption_fb = _fallback_caption(t)
        tags_fb = _hashtags_from_transcript(t, _fallback_tags(t))
        return {"title": _improve_title(t, title_fb), "caption": caption_fb, "hashtags": tags_fb}
    return {"title": title, "caption": caption, "hashtags": hashtags_line}


def _extract_keywords_from_filename(name: str) -> list[str]:
    n = name.lower()
    buckets = {
        "tutorial": ["tutorial","howto","guide","learn","education","teaching"],
        "story": ["story","narrative","journey","experience"],
        "funny": ["funny","humor","comedy","laugh","joke","hilarious"],
        "inspiration": ["inspiration","motivation","success","achievement","goal"],
        "review": ["review","analysis","opinion","thoughts","feedback"],
        "tech": ["tech","technology","gadget","app","software"],
        "business": ["business","entrepreneur","startup","money"],
        "fitness": ["fitness","workout","exercise","health","training"],
    }
    out: list[str] = []
    for label, kws in buckets.items():
        if any(k in n for k in kws):
            out.append(label)
    return out[:5]


