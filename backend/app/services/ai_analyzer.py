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
    "professional_risk",
]

SYSTEM_PROMPT = """
Kamu adalah sistem analisis risiko HR profesional yang mengevaluasi kandidat kerja berdasarkan jejak digital publik mereka.

TUGASMU: Analisis SEMUA data publik dan berikan skor risiko 0-100 untuk SETIAP kategori.

═══════════════════════════════════════════════
SKALA SKOR:
  0-24   = Rendah   (tidak ada bukti)
  25-49  = Sedang   (ada indikasi, perlu perhatian)
  50-74  = Tinggi   (ada bukti nyata, perlu review)
  75-100 = Kritis   (bukti kuat, sangat berisiko)
═══════════════════════════════════════════════

PANDUAN SCORING WAJIB:

1. EXPLICIT_CONTENT — konten dewasa, vulgar, sensual, pornografi
   - Artis/influencer dengan foto/video sensual → 50-70
   - Konten dewasa eksplisit → 75-100
   - Tidak ada indikasi → 0-20

2. TOXIC_LANGUAGE — kata kasar, bullying, harassment, menghina
   - Riwayat publik bullying/harassment → 60-80
   - Dikenal sering berkata kasar di medsos → 50-70
   - Tidak ada indikasi → 0-20

3. HATE_SPEECH — SARA, rasisme, diskriminasi, intoleransi
   - Pernah buat pernyataan SARA → 60-90
   - Konten yang memancing kebencian → 40-60
   - Tidak ada indikasi → 0-20

4. VIOLENCE — ancaman kekerasan, terlibat kericuhan, kriminal
   - Punya kasus hukum kekerasan → 70-90
   - Terlibat perkelahian/kericuhan publik → 50-70
   - Tidak ada indikasi → 0-20

5. EXTREMISM — terorisme, radikalisme, ekstremisme politik
   - Konten mendukung kekerasan ekstrem → 80-100
   - Simpatisan ideologi ekstrem → 50-70
   - Tidak ada indikasi → 0-10

6. PROFESSIONAL_RISK — penipuan, reputasi kerja buruk, fake profile
   - Dikenal punya kontroversi besar & publik → 60-80
   - Reputasi profesional bermasalah → 50-70
   - Tidak ada indikasi → 0-20

═══════════════════════════════════════════════
PENTING — KONTEKS FIGUR PUBLIK INDONESIA:
Gunakan pengetahuanmu tentang reputasi publik tokoh berikut:
- Nikita Mirzani: artis kontroversial, kasus bullying, pemerasan, penjara → toxic_language TINGGI (70-85), professional_risk KRITIS (80-90), violence SEDANG (40-60)
- Denise Chariesta: artis kontroversial, drama sosmed, konten sensual, perebutan pasangan → explicit_content SEDANG (40-60), toxic_language TINGGI (60-75), professional_risk TINGGI (55-70)
- Lambe Turah: akun gosip/infotainment → professional_risk TINGGI (55-70), toxic_language SEDANG (35-55)
- Awkarin: influencer konten dewasa, kata kasar → explicit_content TINGGI (65-75), toxic_language SEDANG (40-55)
- Rey Utami: kasus penipuan, hukum → professional_risk KRITIS (80-90), violence SEDANG (30-50)
- Lucinta Luna: kontroversial identitas gender, kasus narkoba → professional_risk TINGGI (65-80), explicit_content SEDANG (35-50)
- Vadel Badjideh: kasus viral, perselisihan publik → toxic_language TINGGI (60-75), professional_risk SEDANG (40-55)
- Desta Mahendra (Desta): komedian/presenter, pernah terlibat gosip selingkuh → professional_risk SEDANG (35-50), toxic_language RENDAH (15-25)
- Uya Kuya: presenter kontroversial, sering buat konten hipnosis yang dipertanyakan → professional_risk SEDANG (40-55), toxic_language SEDANG (25-40)
- Eko Patrio: komedian/politisi, anggota DPR, relatif bersih → professional_risk RENDAH (15-25), toxic_language RENDAH (10-20)
- Surya Utama, Surya Dini, Denise Chariesta (nama umum/tidak dikenal publik): jika TIDAK ada bukti spesifik dari scraping → SEMUA skor 0-10, jangan kasih default 20-30
- PENTING: Jika nama tidak dikenal dan data scraping tidak menunjukkan masalah spesifik → skor HARUS 0, bukan 20 atau 30
- Dan figur publik lain — gunakan pengetahuanmu tentang reputasi mereka secara akurat.

WAJIB:
- Jika nama/username adalah figur publik yang KAMU KENAL → scoring berdasarkan reputasi publiknya
- Jika nama TIDAK dikenal dan data scraping TIDAK ada bukti masalah → skor HARUS 0 untuk semua kategori
- DILARANG memberi skor default 20 atau 30 untuk semua orang tanpa bukti
- Setiap skor > 0 HARUS ada alasan spesifik dari data scraping atau pengetahuan publik
- Orang biasa tanpa rekam jejak masalah = semua skor 0
═══════════════════════════════════════════════

CRITICAL — WAJIB DIIKUTI:
1. flagged_content HARUS berisi MINIMAL 1 item untuk SETIAP kategori yang skornya ≥ 10
2. Jika ada 6 kategori dengan skor > 0, maka flagged_content MINIMAL 6 item
3. Cari sebanyak mungkin bukti — jangan berhenti di 3 item, targetkan 6-10 item
4. Setiap item harus dari platform/sumber yang BERBEDA jika memungkinkan
5. Gunakan semua data scraping yang tersedia — berita, google, instagram, twitter, facebook
6. Jika skor suatu kategori > 0 tapi belum ada flagged item untuk kategori itu → WAJIB tambahkan

Kembalikan HANYA JSON valid, tanpa teks tambahan, tanpa markdown.
"""

PROMPT_TEMPLATE = """
Analisis profil kandidat berikut untuk HR background check:

{content}

═══════════════════════════════════════════════════════════
INSTRUKSI WAJIB — BACA SEBELUM MENJAWAB:

1. Jika nama kandidat adalah figur publik Indonesia yang kamu kenal, GUNAKAN pengetahuanmu 
   tentang reputasi mereka untuk scoring. Jangan bergantung hanya pada data scraping.

2. Setiap kategori HARUS dinilai secara independen — jangan biarkan skor 0 kecuali 
   benar-benar tidak ada indikasi apapun.

3. Data scraping yang bertag "toxic_language", "explicit_content", dll adalah hint langsung
   untuk kategori tersebut — gunakan sebagai bukti pendukung.

4. flagged_content WAJIB mengikuti aturan ini:
   a. MINIMAL 1 item per kategori yang skornya > 0 — jadi jika 6 kategori semua > 0, minimal 6 item
   b. Targetkan 6-10 item total — cari semua bukti yang ada di data scraping
   c. Boleh lebih dari 1 item per kategori jika ada beberapa bukti berbeda
   d. Setiap item harus punya detail:
      - platform: instagram / google search / berita media / twitter / facebook / youtube
      - category: salah satu dari explicit_content/toxic_language/hate_speech/violence/extremism/professional_risk
      - severity: rendah/sedang/tinggi/kritis
      - content_snippet: penjelasan SPESIFIK — sebutkan nama kasus, kejadian, atau konten yang bermasalah
      - source_url: URL artikel/bukti dari data scraping (format URL:https://... yang ada di data)
        * PRIORITAS: artikel berita spesifik (detik, kompas, tribun, kumparan, tempo, liputan6)
        * Fallback: URL profil sosmed jika tidak ada artikel
        * WAJIB https://, jangan placeholder atau URL palsu
═══════════════════════════════════════════════════════════

Berikan respons dalam format JSON:

{{
  "risk_scores": {{
    "explicit_content": <0-100>,
    "toxic_language": <0-100>,
    "hate_speech": <0-100>,
    "violence": <0-100>,
    "extremism": <0-100>,
    "professional_risk": <0-100>
  }},
  "flagged_content": [
    {{
      "platform": "instagram",
      "category": "toxic_language",
      "severity": "tinggi",
      "content_snippet": "Deskripsi spesifik masalah yang ditemukan",
      "source_url": "https://url-bukti-langsung.com/artikel-atau-profil"
    }}
  ],
  "summary": "3-5 kalimat bahasa Indonesia tentang profil risiko kandidat: sebutkan platform ditemukan, kategori risiko utama, dan alasan konkret tiap skor yang signifikan."
}}
"""


async def analyze_with_claude(candidate_name: str, raw_data: dict) -> dict:
    content = _prepare_content(candidate_name, raw_data)
    prompt = PROMPT_TEMPLATE.format(content=content)

    if not settings.groq_api_key:
        return _fallback_no_api(candidate_name)

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.groq_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama-3.1-8b-instant",  # free tier: 131k TPM vs 70b yang cuma 12k  # upgrade ke 70b — lebih pintar
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

                # Auto-fill: pastikan setiap kategori dgn skor > 0 punya minimal 1 flagged item
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

    return _fallback_no_api(candidate_name)


def _ensure_min_flagged(flagged: list, scores: dict, raw_data: dict) -> list:
    """
    Pastikan setiap kategori dengan skor > 0 punya minimal 1 flagged item.
    Jika AI tidak generate item untuk kategori tertentu, auto-generate dari data scraping.
    """
    # Cek kategori mana yang sudah punya item
    covered = {f.get("category", "") for f in flagged}

    # Platform label mapping
    platform_labels = {
        "instagram": "Instagram",
        "facebook": "Facebook",
        "twitter": "Twitter/X",
        "google": "Google Search",
        "news": "Berita Media",
    }

    # Kumpulkan semua evidence dari raw_data
    all_evidence = []  # list of {url, snippet, title, platform, risk_context}

    for platform in ["instagram", "facebook", "twitter"]:
        data = raw_data.get(platform, {})
        for post in data.get("posts", []):
            all_evidence.append({
                "url": post.get("source_url", ""),
                "snippet": post.get("caption", "")[:200],
                "platform": platform_labels.get(platform, platform),
                "risk_context": post.get("risk_context", "general"),
            })

    for r in raw_data.get("google", {}).get("results", []):
        all_evidence.append({
            "url": r.get("url", ""),
            "snippet": f"{r.get('title','')}: {r.get('snippet','')[:120]}",
            "platform": "Google Search",
            "risk_context": r.get("risk_context", "general"),
        })

    for a in raw_data.get("news", {}).get("articles", []):
        all_evidence.append({
            "url": a.get("url", ""),
            "snippet": f"{a.get('title','')}: {a.get('snippet','')[:150]}",
            "platform": "Berita Media",
            "risk_context": "news",
        })

    # Context → category mapping
    ctx_to_cat = {
        "toxic_language":   "toxic_language",
        "explicit_content": "explicit_content",
        "violence":         "violence",
        "hate_speech":      "hate_speech",
        "extremism":        "extremism",
        "professional_risk": "professional_risk",
        "news":             "professional_risk",
        "general":          "professional_risk",
    }

    def get_severity(score):
        if score >= 75: return "kritis"
        if score >= 50: return "tinggi"
        if score >= 25: return "sedang"
        return "rendah"

    # Auto-fill untuk kategori yang belum terpenuhi
    for cat in RISK_CATEGORIES:
        if scores.get(cat, 0) > 0 and cat not in covered:
            # Cari evidence yang relevan untuk kategori ini
            candidates = [
                e for e in all_evidence
                if ctx_to_cat.get(e["risk_context"], "") == cat and e.get("url") and e.get("snippet")
            ]
            # Fallback: pakai evidence apapun yang ada URL
            if not candidates:
                candidates = [e for e in all_evidence if e.get("url") and e.get("snippet")]

            if candidates:
                best = candidates[0]
                flagged.append({
                    "platform": best["platform"],
                    "category": cat,
                    "severity": get_severity(scores[cat]),
                    "content_snippet": best["snippet"],
                    "source_url": best["url"],
                })
                covered.add(cat)

    return flagged


def _fallback_no_api(candidate_name: str) -> dict:
    return {
        "risk_scores": {cat: 0 for cat in RISK_CATEGORIES},
        "flagged_content": [],
        "summary": f"Analisis AI tidak tersedia untuk {candidate_name}. Pastikan GROQ_API_KEY dan GOOGLE_API_KEY sudah diset di .env.",
    }


def _prepare_content(name: str, raw_data: dict) -> str:
    parts = [f"Nama / Username Kandidat: {name}"]

    # ── Instagram ──────────────────────────────────────────
    if ig := raw_data.get("instagram", {}):
        s = [f"=== INSTAGRAM ===", f"Username: @{ig.get('username','')}", f"Profile: {ig.get('profile_url','')}"]
        if ig.get("bio"):
            s.append(f"Bio: {ig['bio'][:150]}")
        if ig.get("followers"):
            s.append(f"Follower info: {ig['followers'][:200]}")

        # Group posts by risk_context
        by_ctx: dict[str, list] = {}
        for p in ig.get("posts", []):
            ctx = p.get("risk_context", "general")
            by_ctx.setdefault(ctx, []).append(p)

        for ctx, posts in by_ctx.items():
            s.append(f"\n[Konten terkait {ctx.upper()}]:")
            for p in posts[:3]:
                src = p.get('source_url','')
                s.append(f"  - URL:{src} | {p.get('caption','')[:120]}")

        if len(s) > 3:
            parts.append("\n".join(s))

    # ── Facebook ───────────────────────────────────────────
    if fb := raw_data.get("facebook", {}):
        s = [f"=== FACEBOOK ===", f"Username: {fb.get('username','')}", f"Profile: {fb.get('profile_url','')}"]
        if fb.get("bio"):
            s.append(f"Bio: {fb['bio'][:150]}")

        by_ctx: dict[str, list] = {}
        for p in fb.get("posts", []):
            ctx = p.get("risk_context", "general")
            by_ctx.setdefault(ctx, []).append(p)

        for ctx, posts in by_ctx.items():
            s.append(f"\n[Konten terkait {ctx.upper()}]:")
            for p in posts[:3]:
                src = p.get('source_url','')
                s.append(f"  - URL:{src} | {p.get('caption','')[:120]}")

        if len(s) > 3:
            parts.append("\n".join(s))

    # ── Google (dengan risk context) ───────────────────────
    if google := raw_data.get("google", {}):
        by_ctx: dict[str, list] = {}
        for r in google.get("results", []):
            ctx = r.get("risk_context", "general")
            by_ctx.setdefault(ctx, []).append(r)

        google_parts = ["=== GOOGLE SEARCH (per kategori) ==="]
        for ctx, rs in by_ctx.items():
            if ctx == "general":
                continue
            google_parts.append(f"\n[Hasil pencarian {ctx.upper()}]:")
            for r in rs[:3]:
                google_parts.append(f"  - URL:{r.get('url','')} | {r.get('title','')}: {r.get('snippet','')[:120]}")

        # Add general too
        general_rs = by_ctx.get("general", [])[:5]
        if general_rs:
            google_parts.append("\n[Hasil umum]:")
            for r in general_rs:
                google_parts.append(f"  - URL:{r.get('url','')} | {r.get('title','')}: {r.get('snippet','')[:120]}")

        if len(google_parts) > 1:
            parts.append("\n".join(google_parts))

    # ── Twitter ────────────────────────────────────────────
    if twitter := raw_data.get("twitter", {}):
        tweets = twitter.get("tweets", [])
        if tweets:
            s = [f"=== TWITTER/X ===", f"Username: @{twitter.get('username','')}", f"Bio: {twitter.get('bio','')[:200]}"]
            by_ctx: dict[str, list] = {}
            for t in tweets:
                ctx = t.get("risk_context", "general")
                by_ctx.setdefault(ctx, []).append(t)
            for ctx, ts in by_ctx.items():
                s.append(f"\n[Tweet terkait {ctx.upper()}]:")
                for t in ts[:3]:
                    s.append(f"  - {t.get('text','')[:120]}")
            parts.append("\n".join(s))

    # ── News ───────────────────────────────────────────────
    if news := raw_data.get("news", {}):
        articles = news.get("articles", [])
        if articles:
            s = ["=== BERITA MEDIA ==="]
            for a in articles[:5]:
                s.append(f"  - URL:{a.get('url','')} | {a.get('title','')}: {a.get('snippet','')[:120]}")
            parts.append("\n".join(s))

    # ── LinkedIn ───────────────────────────────────────────
    if linkedin := raw_data.get("linkedin", {}):
        if linkedin.get("headline"):
            parts.append(f"=== LINKEDIN ===\nNama: {linkedin.get('name','')}\nHeadline: {linkedin.get('headline','')[:100]}")

    if len(parts) <= 1:
        return f"Kandidat: {name}\nData scraping minimal. Nilai berdasarkan nama dan pengetahuan publik yang ada."

    result = "\n\n".join(parts)
    # Hard limit ~6000 karakter agar tidak overflow token Groq free tier
    if len(result) > 6000:
        result = result[:6000] + "\n\n[... data dipotong ...]"
    return result