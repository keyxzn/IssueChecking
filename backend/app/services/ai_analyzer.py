"""
AI Analyzer — Groq, prompt per-category forced scoring
"""

import json
import httpx
import structlog
from app.core.config import settings

logger = structlog.get_logger()

RISK_CATEGORIES = [
    "explicit_content",
    "toxic_language",
    "hate_speech",
    "violence",
    "extremism",
    "misinformation",
]

SYSTEM_PROMPT = """
Kamu adalah sistem analisis media intelligence yang memantau isu, topik, dan keyword di berbagai platform media (Instagram, Twitter/X, Facebook, TikTok, YouTube, berita online, Google).

TUGASMU: Analisis SEMUA data yang tersedia tentang keyword/isu ini dan berikan skor risiko 0-100 untuk SETIAP kategori konten berbahaya.

═══════════════════════════════════════════════
SKALA SKOR:
  0-24   = Rendah   (tidak ada bukti)
  25-49  = Sedang   (ada indikasi, perlu perhatian)
  50-74  = Tinggi   (ada bukti nyata, perlu review)
  75-100 = Kritis   (bukti kuat, sangat berisiko)
═══════════════════════════════════════════════

PANDUAN SCORING:

1. EXPLICIT_CONTENT — konten dewasa, vulgar, sensual, pornografi yang tersebar terkait isu ini
   - Banyak konten sensual/dewasa beredar → 50-70
   - Konten pornografi eksplisit → 75-100
   - Tidak ada indikasi → 0-20

2. TOXIC_LANGUAGE — bahasa kasar, bullying, harassment dalam pemberitaan/diskusi isu ini
   - Banyak ujaran kasar/bullying di platform terkait isu → 60-80
   - Isu memicu harassment massal → 50-70
   - Tidak ada indikasi → 0-20

3. HATE_SPEECH — konten SARA, rasisme, diskriminasi, intoleransi dalam isu ini
   - Isu memicu pernyataan SARA/diskriminasi → 60-90
   - Ada konten yang memancing kebencian → 40-60
   - Tidak ada indikasi → 0-20

4. VIOLENCE — ancaman kekerasan, kericuhan, kriminalitas terkait isu ini
   - Isu terkait kasus kekerasan/kriminal → 70-90
   - Isu memicu ancaman atau kericuhan → 50-70
   - Tidak ada indikasi → 0-20

5. EXTREMISM — konten terorisme, radikalisme, ekstremisme terkait isu ini
   - Isu digunakan untuk propaganda ekstrem → 80-100
   - Ada indikasi simpati ideologi ekstrem → 50-70
   - Tidak ada indikasi → 0-10

6. MISINFORMATION — hoaks, disinformasi, berita palsu terkait isu ini
   - Banyak hoaks/disinformasi beredar → 60-80
   - Ada konten menyesatkan yang viral → 50-70
   - Tidak ada indikasi → 0-20

═══════════════════════════════════════════════
PANDUAN KONTEKS ISU INDONESIA:
- Isu politik (pilkada, pemilu, kebijakan pemerintah) → waspadai misinformation & hate_speech tinggi
- Isu bencana alam → waspadai misinformation (hoaks korban/bantuan)
- Isu kriminal viral → waspadai violence & toxic_language tinggi
- Isu agama/SARA → waspadai hate_speech & extremism
- Isu ekonomi (harga, PHK) → waspadai misinformation & toxic_language
- Isu selebriti/publik figur → sesuai konteks kontroversi yang beredar
- Keyword tidak dikenal / tidak ada data scraping → SEMUA skor 0, jangan beri default

WAJIB:
- Setiap skor > 0 HARUS ada alasan spesifik dari data scraping
- Keyword tanpa data dan tidak dikenal → semua skor 0
- DILARANG memberi skor default tanpa bukti nyata
═══════════════════════════════════════════════

CRITICAL:
1. flagged_content MINIMAL 1 item untuk SETIAP kategori yang skornya ≥ 10
2. Targetkan 6-10 item total dari berbagai platform
3. Gunakan semua data scraping — berita, google, instagram, twitter, facebook

Kembalikan HANYA JSON valid, tanpa teks tambahan, tanpa markdown.
"""

PROMPT_TEMPLATE = """
Analisis isu/keyword berikut untuk media intelligence monitoring:

{content}

═══════════════════════════════════════════════════════════
INSTRUKSI WAJIB:

1. Fokus pada KONTEN YANG BEREDAR terkait keyword ini di media sosial dan berita — bukan menilai orangnya, tapi isu/topiknya.

2. Setiap kategori dinilai berdasarkan: seberapa banyak konten berbahaya terkait keyword ini beredar di publik.

3. Data scraping yang bertag "toxic_language", "misinformation", dll → gunakan sebagai bukti langsung.

4. flagged_content wajib:
   - MINIMAL 1 item per kategori yang skornya > 0
   - Targetkan 6-10 item total
   - Setiap item harus punya:
      - platform: instagram / google search / berita media / twitter / facebook / youtube / tiktok
      - category: explicit_content / toxic_language / hate_speech / violence / extremism / misinformation
      - severity: rendah / sedang / tinggi / kritis
      - content_snippet: deskripsi SPESIFIK konten yang ditemukan
      - source_url: URL artikel/bukti (https://, bukan placeholder)
═══════════════════════════════════════════════════════════

Berikan respons dalam format JSON:

{{
  "risk_scores": {{
    "explicit_content": <0-100>,
    "toxic_language": <0-100>,
    "hate_speech": <0-100>,
    "violence": <0-100>,
    "extremism": <0-100>,
    "misinformation": <0-100>
  }},
  "flagged_content": [
    {{
      "platform": "berita media",
      "category": "misinformation",
      "severity": "tinggi",
      "content_snippet": "Deskripsi spesifik konten berbahaya yang beredar terkait isu ini",
      "source_url": "https://url-bukti-langsung.com/artikel"
    }}
  ],
  "summary": "3-5 kalimat bahasa Indonesia tentang profil risiko isu/keyword ini: sebutkan platform mana yang paling banyak konten berbahaya, kategori risiko utama, dan alasan konkret tiap skor yang signifikan."
}}
"""


async def analyze_with_claude(keyword: str, raw_data: dict) -> dict:
    content = _prepare_content(keyword, raw_data)
    prompt = PROMPT_TEMPLATE.format(content=content)

    if not settings.groq_api_key:
        return _fallback_no_api(keyword)

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.groq_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama-3.1-8b-instant",
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user",   "content": prompt},
                    ],
                    "temperature": 0.15,
                    "max_tokens": 1500,
                },
            )

            if resp.status_code == 200:
                raw_text = resp.json()["choices"][0]["message"]["content"]
                raw_text = raw_text.replace("```json", "").replace("```", "").strip()

                try:
                    parsed = json.loads(raw_text)
                except Exception:
                    start = raw_text.find("{")
                    end   = raw_text.rfind("}") + 1
                    parsed = json.loads(raw_text[start:end])

                for cat in RISK_CATEGORIES:
                    parsed.setdefault("risk_scores", {})[cat] = parsed.get("risk_scores", {}).get(cat, 0)

                parsed.setdefault("flagged_content", [])
                parsed.setdefault("summary", "Analisis selesai.")

                parsed["flagged_content"] = _ensure_min_flagged(
                    parsed["flagged_content"],
                    parsed["risk_scores"],
                    raw_data,
                )
                return parsed

            else:
                logger.error("groq_error", status=resp.status_code, body=resp.text[:300])

    except Exception as e:
        logger.error("groq_exception", error=str(e))

    return _fallback_no_api(keyword)


def _ensure_min_flagged(flagged: list, scores: dict, raw_data: dict) -> list:
    covered = {f.get("category", "") for f in flagged}

    platform_labels = {
        "instagram": "Instagram",
        "facebook":  "Facebook",
        "twitter":   "Twitter/X",
        "google":    "Google Search",
        "news":      "Berita Media",
    }

    all_evidence = []

    for platform in ["instagram", "facebook", "twitter"]:
        data = raw_data.get(platform, {})
        for post in data.get("posts", []):
            all_evidence.append({
                "url":          post.get("source_url", ""),
                "snippet":      post.get("caption", "")[:200],
                "platform":     platform_labels.get(platform, platform),
                "risk_context": post.get("risk_context", "general"),
            })

    for r in raw_data.get("google", {}).get("results", []):
        all_evidence.append({
            "url":          r.get("url", ""),
            "snippet":      f"{r.get('title','')}: {r.get('snippet','')[:120]}",
            "platform":     "Google Search",
            "risk_context": r.get("risk_context", "general"),
        })

    for a in raw_data.get("news", {}).get("articles", []):
        all_evidence.append({
            "url":          a.get("url", ""),
            "snippet":      f"{a.get('title','')}: {a.get('snippet','')[:150]}",
            "platform":     "Berita Media",
            "risk_context": "news",
        })

    ctx_to_cat = {
        "toxic_language":   "toxic_language",
        "explicit_content": "explicit_content",
        "violence":         "violence",
        "hate_speech":      "hate_speech",
        "extremism":        "extremism",
        "misinformation":   "misinformation",
        "news":             "misinformation",
        "general":          "misinformation",
    }

    def get_severity(score):
        if score >= 75: return "kritis"
        if score >= 50: return "tinggi"
        if score >= 25: return "sedang"
        return "rendah"

    for cat in RISK_CATEGORIES:
        if scores.get(cat, 0) > 0 and cat not in covered:
            issues = [
                e for e in all_evidence
                if ctx_to_cat.get(e["risk_context"], "") == cat and e.get("url") and e.get("snippet")
            ]
            if not issues:
                issues = [e for e in all_evidence if e.get("url") and e.get("snippet")]

            if issues:
                best = issues[0]
                flagged.append({
                    "platform":        best["platform"],
                    "category":        cat,
                    "severity":        get_severity(scores[cat]),
                    "content_snippet": best["snippet"],
                    "source_url":      best["url"],
                })
                covered.add(cat)

    return flagged


def _fallback_no_api(keyword: str) -> dict:
    return {
        "risk_scores":    {cat: 0 for cat in RISK_CATEGORIES},
        "flagged_content": [],
        "summary": f"Analisis AI tidak tersedia untuk keyword '{keyword}'. Pastikan GROQ_API_KEY dan GOOGLE_API_KEY sudah diset di .env.",
    }


def _prepare_content(keyword: str, raw_data: dict) -> str:
    parts = [f"Keyword / Issue yang dimonitor: {keyword}"]

    if ig := raw_data.get("instagram", {}):
        s = ["=== INSTAGRAM ===", f"Username: @{ig.get('username','')}", f"Profile: {ig.get('profile_url','')}"]
        if ig.get("bio"):
            s.append(f"Bio: {ig['bio'][:150]}")

        by_ctx: dict[str, list] = {}
        for p in ig.get("posts", []):
            by_ctx.setdefault(p.get("risk_context", "general"), []).append(p)

        for ctx, posts in by_ctx.items():
            s.append(f"\n[Konten terkait {ctx.upper()}]:")
            for p in posts[:3]:
                s.append(f"  - URL:{p.get('source_url','')} | {p.get('caption','')[:120]}")

        if len(s) > 3:
            parts.append("\n".join(s))

    if fb := raw_data.get("facebook", {}):
        s = ["=== FACEBOOK ===", f"Username: {fb.get('username','')}", f"Profile: {fb.get('profile_url','')}"]
        if fb.get("bio"):
            s.append(f"Bio: {fb['bio'][:150]}")

        by_ctx: dict[str, list] = {}
        for p in fb.get("posts", []):
            by_ctx.setdefault(p.get("risk_context", "general"), []).append(p)

        for ctx, posts in by_ctx.items():
            s.append(f"\n[Konten terkait {ctx.upper()}]:")
            for p in posts[:3]:
                s.append(f"  - URL:{p.get('source_url','')} | {p.get('caption','')[:120]}")

        if len(s) > 3:
            parts.append("\n".join(s))

    if google := raw_data.get("google", {}):
        by_ctx: dict[str, list] = {}
        for r in google.get("results", []):
            by_ctx.setdefault(r.get("risk_context", "general"), []).append(r)

        google_parts = ["=== GOOGLE SEARCH (per kategori) ==="]
        for ctx, rs in by_ctx.items():
            if ctx == "general":
                continue
            google_parts.append(f"\n[Hasil pencarian {ctx.upper()}]:")
            for r in rs[:3]:
                google_parts.append(f"  - URL:{r.get('url','')} | {r.get('title','')}: {r.get('snippet','')[:120]}")

        general_rs = by_ctx.get("general", [])[:5]
        if general_rs:
            google_parts.append("\n[Hasil umum]:")
            for r in general_rs:
                google_parts.append(f"  - URL:{r.get('url','')} | {r.get('title','')}: {r.get('snippet','')[:120]}")

        if len(google_parts) > 1:
            parts.append("\n".join(google_parts))

    if twitter := raw_data.get("twitter", {}):
        tweets = twitter.get("tweets", [])
        if tweets:
            s = ["=== TWITTER/X ===", f"Username: @{twitter.get('username','')}", f"Bio: {twitter.get('bio','')[:200]}"]
            by_ctx: dict[str, list] = {}
            for t in tweets:
                by_ctx.setdefault(t.get("risk_context", "general"), []).append(t)
            for ctx, ts in by_ctx.items():
                s.append(f"\n[Tweet terkait {ctx.upper()}]:")
                for t in ts[:3]:
                    s.append(f"  - {t.get('text','')[:120]}")
            parts.append("\n".join(s))

    if news := raw_data.get("news", {}):
        articles = news.get("articles", [])
        if articles:
            s = ["=== BERITA MEDIA ==="]
            for a in articles[:5]:
                s.append(f"  - URL:{a.get('url','')} | {a.get('title','')}: {a.get('snippet','')[:120]}")
            parts.append("\n".join(s))

    if len(parts) <= 1:
        return f"Keyword / Issue: {keyword}\nTidak ada data scraping tersedia. Nilai berdasarkan keyword dan konteks isu yang diketahui."

    result = "\n\n".join(parts)
    if len(result) > 6000:
        result = result[:6000] + "\n\n[... data dipotong ...]"
    return result