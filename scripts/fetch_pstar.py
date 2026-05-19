#!/usr/bin/env python3
"""
Fetch all PSTAR questions from principalair.ca and write to JSON.

Each question page contains:
- Question text (sometimes preceded by a context table)
- 4 answer choices (either in <ol> or a two-column table)
- The correct answer embedded in a JS onclick: "The Correct Answer is: #N"
- A reference string
"""

import re
import json
import html
import urllib.request
import urllib.error
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

# -------------------------------------------------------------------------
# Section metadata: question count, display topic, URL slug for tags
# -------------------------------------------------------------------------
SECTIONS = {
    1:  {"count": 10, "topic": "PSTAR - Collision Avoidance",                   "slug": "collision-avoidance"},
    2:  {"count": 8,  "topic": "PSTAR - Visual Signals",                        "slug": "visual-signals"},
    3:  {"count": 29, "topic": "PSTAR - Communications",                        "slug": "communications"},
    4:  {"count": 10, "topic": "PSTAR - Aerodromes and Airports",               "slug": "aerodromes-and-airports"},
    5:  {"count": 11, "topic": "PSTAR - Equipment",                             "slug": "equipment"},
    6:  {"count": 23, "topic": "PSTAR - Pilot Responsibilities",                "slug": "pilot-responsibilities"},
    7:  {"count": 15, "topic": "PSTAR - Wake Turbulence",                       "slug": "wake-turbulence"},
    8:  {"count": 13, "topic": "PSTAR - Aero Medical",                          "slug": "aero-medical"},
    9:  {"count": 11, "topic": "PSTAR - Flight Plans and Flight Itineraries",   "slug": "flight-plans-and-flight-itineraries"},
    10: {"count": 6,  "topic": "PSTAR - Clearances and Instructions",           "slug": "clearances-and-instructions"},
    11: {"count": 17, "topic": "PSTAR - Aircraft Operations",                   "slug": "aircraft-operations"},
    12: {"count": 21, "topic": "PSTAR - General Airspace",                      "slug": "general-airspace"},
    13: {"count": 12, "topic": "PSTAR - Controlled Airspace",                   "slug": "controlled-airspace"},
    14: {"count": 6,  "topic": "PSTAR - Aviation Occurrences",                  "slug": "aviation-occurrences"},
}


def fetch_url(url: str, retries: int = 3) -> str:
    """
    Fetch a URL with retries.

    The pages declare UTF-8 but some contain lone Latin-1 bytes (e.g. 0xB0 for °).
    We read the raw bytes and decode with 'latin-1' so every byte is preserved
    faithfully as a Unicode character.  html.unescape() later handles &amp; etc.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    }
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=30) as resp:
                raw = resp.read()
            # Decode as latin-1 to preserve every byte value (no replacement chars)
            return raw.decode("latin-1")
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
            else:
                raise RuntimeError(f"Failed to fetch {url}: {e}")


def clean_text(raw_html: str) -> str:
    """
    Strip HTML tags, decode HTML entities, and normalise whitespace.
    Returns clean plain text.
    """
    # Remove all tags
    text = re.sub(r'<[^>]+>', ' ', raw_html)
    # Decode HTML entities (&nbsp; &amp; &quot; &#N; etc.)
    text = html.unescape(text)
    # Collapse all whitespace (including non-breaking spaces now decoded)
    text = re.sub(r'[\s ]+', ' ', text)
    return text.strip()


def clean_reference(ref: str) -> str:
    """
    Clean up reference strings that have spurious spaces around periods
    caused by <span> tags wrapping individual digits in the source HTML.

    Examples:
      "AIM - RAC 4. 3 .11" -> "AIM - RAC 4.3.11"
      "AIM - RAC 1.14. 1"  -> "AIM - RAC 1.14.1"
    """
    # Remove space before a period when preceded by digit: "3 ." -> "3."
    ref = re.sub(r"(\d) \.", r"\1.", ref)
    # Remove space after a period when followed by digit: ". 3" -> ".3"
    ref = re.sub(r"\.  *(\d)", r".\1", ref)
    # Collapse any remaining double spaces
    ref = re.sub(r"  +", " ", ref)
    return ref.strip()


def parse_question(raw_html: str, section: int, q_num: int) -> dict:
    """
    Parse a single PSTAR question HTML page into a structured dict.

    The site has several HTML layouts, all handled here:
      A) Standard <p> with question number then text, choices in <ol>
      B) Question number + text both inside <div>, choices in <ol>
      C) Section 2 Q1-4: question text in <div/b>, choices in a 3-col table
      D) Section 9 Q9: context data table then <p> with actual question
    """
    section_info = SECTIONS[section]

    # ------------------------------------------------------------------
    # 1. Find the correct answer number (1-based integer)
    # ------------------------------------------------------------------
    # Embedded in onclick: "The Correct Answer is: #2" or "#A" etc.
    correct_num: int | None = None
    ans_m = re.search(r"The Correct Answer is: #?([0-9A-D]+)", raw_html)
    if ans_m:
        val = ans_m.group(1)
        if val.isdigit():
            correct_num = int(val)
        else:
            correct_num = ord(val.upper()) - ord('A') + 1

    # ------------------------------------------------------------------
    # 2. Extract the reference string
    # ------------------------------------------------------------------
    reference = ""
    # The reference lives in a <div> or <font> immediately after the
    # "Reference:</font></td>" table cell.
    ref_m = re.search(
        r'Reference:</font></td>.*?<(?:div|font)[^>]*>(.*?)(?:</div>|</font>)',
        raw_html, re.DOTALL
    )
    if ref_m:
        reference = clean_reference(clean_text(ref_m.group(1)))

    # ------------------------------------------------------------------
    # 3. Extract answer choices
    # ------------------------------------------------------------------
    choices_raw: list[str] = []

    # Layout A / B / D: standard <ol> list
    ol_m = re.search(r'<ol>(.*?)</ol>', raw_html, re.DOTALL)
    if ol_m:
        for item_html in re.findall(r'<li[^>]*>(.*?)</li>', ol_m.group(1), re.DOTALL):
            text = clean_text(item_html)
            if text:
                choices_raw.append(text)

    # Layout C: three-column table with Number | In-flight | On-ground
    # Detected when no <ol> choices were found but numbered table rows exist.
    if len(choices_raw) < 2:
        table_rows = re.findall(
            r'<td[^>]*>\s*(\d)\.\s*</td>\s*<td[^>]*>(.*?)</td>\s*<td[^>]*>(.*?)</td>',
            raw_html, re.DOTALL
        )
        if table_rows:
            choices_raw = []
            for _num, inf_html, gnd_html in table_rows:
                inf = clean_text(inf_html).rstrip(';').strip()
                gnd = clean_text(gnd_html).strip()
                choices_raw.append(f"in flight: {inf}; on the ground: {gnd}")

    # ------------------------------------------------------------------
    # 4. Extract the question text
    # ------------------------------------------------------------------
    q_text = ""

    # ------------------------------------------------------------------
    # Primary strategy: find the question number in the HTML and capture
    # all text from there up to the start of the <ol> answer list.
    # This works for all known page layouts:
    #   - <p> with immediate <ol> (no closing </p>)
    #   - <p> ... </p> followed later by <ol>
    #   - <div> ... </div> followed by <ol>
    #   - context tables followed by a <p> question sentence
    # ------------------------------------------------------------------
    # Build a flexible regex that matches e.g. "4.01" or "4.1"
    q_num_str = rf'{section}\.0*{q_num}'

    q_m = re.search(rf'{q_num_str}(.*?)(?=<ol>)', raw_html, re.DOTALL)
    if q_m:
        raw = q_m.group(1)
        text = clean_text(raw)
        # Remove any leading whitespace / leftover number fragments
        text = re.sub(r'^\d+\.\d*\s*', '', text).strip()
        if text:
            q_text = text

    # ------------------------------------------------------------------
    # Fallback: search inside <p> and <div> blocks for the question number
    # ------------------------------------------------------------------
    if not q_text:
        q_num_pattern = rf'\b{q_num_str}\b'
        for p_html in re.findall(r'<p[^>]*>(.*?)</p>', raw_html, re.DOTALL):
            if re.search(q_num_pattern, p_html):
                text = clean_text(p_html)
                text = re.sub(r'^\d+\.\d+\s*', '', text).strip()
                if text:
                    q_text = text
                    break

    if not q_text:
        q_num_pattern = rf'\b{q_num_str}\b'
        for div_html in re.findall(r'<div[^>]*>(.*?)</div>', raw_html, re.DOTALL):
            if re.search(q_num_pattern, div_html):
                text = clean_text(div_html)
                text = re.sub(r'^\d+\.\d+\s*', '', text).strip()
                if len(text) > 10:
                    q_text = text
                    break

    # ------------------------------------------------------------------
    # 5. Build the output card
    # ------------------------------------------------------------------
    card_id = f"PSTAR-{section}.{q_num:02d}"

    choices_out = []
    for i, choice_text in enumerate(choices_raw[:4]):
        choices_out.append({
            "text": choice_text,
            "correct": (correct_num is not None) and (i + 1 == correct_num)
        })

    answer_text = ""
    if correct_num is not None and 1 <= correct_num <= len(choices_raw):
        answer_text = choices_raw[correct_num - 1]

    return {
        "id": card_id,
        "topic": section_info["topic"],
        "type": "multiple_choice",
        "difficulty": "medium",
        "tags": ["pstar", section_info["slug"]],
        "question": q_text,
        "choices": choices_out,
        "answer": answer_text,
        "explanation": None,
        "reference": reference,
    }


def fetch_question(section: int, q_num: int) -> dict:
    """Fetch and parse a single question page."""
    url = f"https://www.principalair.ca/pstar%20{section}.{q_num}.html"
    raw_html = fetch_url(url)
    return parse_question(raw_html, section, q_num)


def main():
    # Build the full task list
    tasks = [(sec, q) for sec, info in SECTIONS.items() for q in range(1, info["count"] + 1)]
    print(f"Total questions to fetch: {len(tasks)}")

    cards: list[dict] = []
    errors: list[tuple] = []

    # Fetch all pages in parallel
    with ThreadPoolExecutor(max_workers=20) as executor:
        future_to_task = {executor.submit(fetch_question, s, q): (s, q) for s, q in tasks}
        done = 0
        for future in as_completed(future_to_task):
            sec, q = future_to_task[future]
            done += 1
            try:
                card = future.result()
                cards.append(card)
                if done % 20 == 0:
                    print(f"  [{done}/{len(tasks)}] latest: {card['id']}")
            except Exception as e:
                errors.append((sec, q, str(e)))
                print(f"  ERROR {sec}.{q}: {e}")

    # Sort by section then question number
    cards.sort(key=lambda c: tuple(int(x) for x in c["id"].replace("PSTAR-", "").split(".")))

    # ---------- Error report ------------------------------------------
    if errors:
        print(f"\nFETCH ERRORS ({len(errors)}):")
        for s, q, e in errors:
            print(f"  {s}.{q}: {e}")

    # ---------- Data quality audit ------------------------------------
    problems = []
    for card in cards:
        issues = []
        if not card["question"]:
            issues.append("empty_question")
        if "&nbsp;" in card["question"] or "&#" in card["question"]:
            issues.append("unescaped_entities")
        if len(card["choices"]) != 4:
            issues.append(f"choices_count={len(card['choices'])}")
        if not any(ch["correct"] for ch in card["choices"]):
            issues.append("no_correct_answer")
        if not card["reference"]:
            issues.append("no_reference")
        if issues:
            problems.append((card["id"], issues, card["question"][:70]))

    if problems:
        print(f"\nDATA QUALITY ISSUES ({len(problems)}):")
        for cid, iss, q in problems:
            print(f"  {cid}: {iss}")
            print(f"    Q: {repr(q)}")

    # ---------- Per-section count ------------------------------------
    section_counts: dict[int, int] = {}
    for card in cards:
        sec = int(card["id"].split("-")[1].split(".")[0])
        section_counts[sec] = section_counts.get(sec, 0) + 1

    print("\nQuestions per section:")
    total = 0
    for sec in sorted(section_counts):
        n = section_counts[sec]
        total += n
        print(f"  Section {sec:2d} ({SECTIONS[sec]['topic']}): {n}")
    print(f"\nTotal: {total}")

    # ---------- Write output ------------------------------------------
    out_path = "/Users/maetthu/Documents/Development/ppl_study_flashcards/data/questions/pstar.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"subject": "PSTAR", "cards": cards}, f, ensure_ascii=False, indent=2)

    print(f"\nWritten to: {out_path}")


if __name__ == "__main__":
    main()
