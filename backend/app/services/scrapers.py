"""
Scrapers — Google Custom Search API
Free: 100 queries/hari, 3000/bulan
https://developers.google.com/custom-search/v1/overview
"""

import asyncio
import httpx
import structlog

logger = structlog.get_logger()
GOOGLE_CSE_BASE = "https://www.googleapis.com/customsearch/v1"


async def _google_search(query: str, api_key: str, cx: str, num: int = 10) -> list[dict]:
    """Search via Google Custom Search API."""
    if not api_key or not cx:
        return []
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(
                GOOGLE_CSE_BASE,
                params={
                    "q":   query,
                    "key": api_key,
                    "cx":  cx,
                    "num": min(num, 10),  # max 10 per request
                    "hl":  "id",
                    "gl":  "id",
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                return [
                    {
                        "title":   item.get("title", ""),
                        "url":     item.get("link", ""),
                        "snippet": item.get("snippet", ""),
                    }
                    for item in data.get("items", [])
                ]
            else:
                logger.warning("google_cse_error", status=resp.status_code, body=resp.text[:200])
                return []
    except Exception as e:
        logger.warning("google_cse_exception", error=str(e))
        return []


async def _parallel_search(queries: list[tuple]) -> list[list[dict]]:
    tasks = [_google_search(q, key, cx, num) for q, key, cx, num in queries]
    return await asyncio.gather(*tasks)


def _get_keys():
    from app.core.config import settings
    return settings.google_api_key, settings.google_cx


# ─────────────────────────────────────────────────────────────
# GOOGLE — nama kandidat per kategori risiko
# ─────────────────────────────────────────────────────────────
async def scrape_google(name: str, phone: str | None = None) -> dict:
    api_key, cx = _get_keys()

    queries = [
        # General — tanpa kutip agar lebih banyak hasil
        (f"{name} profil artis Indonesia", api_key, cx, 5),
        (f"{name} kontroversi OR skandal OR kasus OR masalah", api_key, cx, 8),
        # Toxic / bullying
        (f"{name} bully OR harassment OR menghina OR kata kasar OR toxic", api_key, cx, 6),
        # Explicit content
        (f"{name} konten dewasa OR vulgar OR sensual OR foto panas OR video", api_key, cx, 5),
        # Violence / crime
        (f"{name} kekerasan OR kriminal OR ditangkap OR vonis OR penjara OR pengadilan", api_key, cx, 6),
        # Hate speech
        (f"{name} SARA OR rasisme OR diskriminasi OR intoleransi", api_key, cx, 5),
        # Professional risk
        (f"{name} penipuan OR scam OR skandal OR korupsi OR pemerasan", api_key, cx, 6),
        # Extremism
        (f"{name} radikal OR terorisme OR ekstremis OR khilafah OR HTI", api_key, cx, 5),
        # Media besar — tanpa kutip
        (f"{name} site:detik.com OR site:tribunnews.com OR site:kumparan.com OR site:cnnindonesia.com OR site:tempo.co OR site:liputan6.com", api_key, cx, 8),
    ]

    all_results_nested = await _parallel_search(queries)

    risk_contexts = [
        "general", "toxic_language", "explicit_content",
        "violence", "hate_speech", "professional_risk", "extremism", "news", "phone"
    ]

    tagged = []
    for i, results in enumerate(all_results_nested):
        ctx = risk_contexts[i] if i < len(risk_contexts) else "general"
        for r in results:
            tagged.append({**r, "risk_context": ctx})

    seen, unique = set(), []
    for r in tagged:
        if r["url"] not in seen:
            seen.add(r["url"])
            unique.append(r)

    logger.info("google_scraped", name=name, count=len(unique))
    return {"results": unique, "found_urls": [r["url"] for r in unique]}


# ─────────────────────────────────────────────────────────────
# INSTAGRAM
# ─────────────────────────────────────────────────────────────
async def scrape_instagram(instagram_url: str | None) -> dict:
    if not instagram_url:
        return {"error": "URL tidak diberikan", "posts": []}

    username = instagram_url.strip().rstrip("/").split("/")[-1].replace("@", "").lower()
    profile_url = f"https://www.instagram.com/{username}/"
    api_key, cx = _get_keys()

    queries = [
        (f'site:instagram.com "{username}"', api_key, cx, 3),
        (f"{username} bully OR bullying OR harassment OR menghina OR kata kasar", api_key, cx, 6),
        (f"{username} konten dewasa OR vulgar OR sensual OR foto panas", api_key, cx, 5),
        (f"{username} kekerasan OR ancaman OR kasus hukum OR ditangkap OR vonis", api_key, cx, 5),
        (f"{username} skandal OR kontroversi OR masalah OR viral negatif", api_key, cx, 6),
        (f"{username} radikal OR terorisme OR ekstremis OR khilafah", api_key, cx, 4),
        (f"{username} instagram kontroversial OR postingan bermasalah", api_key, cx, 5),
        (f"{username} site:detik.com OR site:tribunnews.com OR site:kumparan.com OR site:cnnindonesia.com OR site:tempo.co", api_key, cx, 8),
    ]

    results = await _parallel_search(queries)
    r_profile, r_toxic, r_explicit, r_violence, r_legal, r_extremism, r_ig_controversy, r_news = results

    bio = next((r.get("snippet", "") for r in r_profile if "instagram.com" in r.get("url", "")), "")
    followers = bio if bio and ("followers" in bio.lower() or "pengikut" in bio.lower()) else ""

    risk_map = [
        ("toxic_language",    r_toxic),
        ("explicit_content",  r_explicit),
        ("violence",          r_violence),
        ("professional_risk", r_legal),
        ("extremism",         r_extremism),
        ("general",           r_ig_controversy),
        ("news",              r_news),
    ]
    web_context = []
    seen_urls = set()
    for ctx, rs in risk_map:
        for r in rs:
            if r.get("snippet") and r.get("url") not in seen_urls:
                seen_urls.add(r["url"])
                web_context.append({
                    "caption":      f"[{r['title']}] {r['snippet']}",
                    "source_url":   r["url"],
                    "risk_context": ctx,
                    "title":        r["title"],
                })

    all_results = r_profile + r_toxic + r_explicit + r_violence + r_legal + r_extremism + r_ig_controversy + r_news
    logger.info("instagram_scraped", username=username, context_count=len(web_context))

    return {
        "username":    username,
        "profile_url": profile_url,
        "bio":         bio,
        "followers":   followers,
        "posts":       web_context,
        "web_results": all_results,
    }


# ─────────────────────────────────────────────────────────────
# FACEBOOK
# ─────────────────────────────────────────────────────────────
async def scrape_facebook(facebook_url: str | None) -> dict:
    if not facebook_url:
        return {"error": "URL tidak diberikan", "posts": []}

    username = facebook_url.strip().rstrip("/").split("/")[-1].replace("@", "").lower()
    profile_url = facebook_url if facebook_url.startswith("http") else f"https://www.facebook.com/{username}"
    api_key, cx = _get_keys()

    queries = [
        (f'site:facebook.com "{username}"', api_key, cx, 5),
        (f'facebook "{username}" kontroversial OR skandal OR viral OR masalah', api_key, cx, 6),
        (f'facebook "{username}" bully OR kasar OR menghina OR toxic', api_key, cx, 5),
    ]

    results = await _parallel_search(queries)
    r_profile, r_general, r_toxic = results

    bio = next((r.get("snippet", "") for r in r_profile if r.get("snippet")), "")
    web_context = []
    for ctx, rs in [("general", r_general), ("toxic_language", r_toxic)]:
        for r in rs:
            if r.get("snippet"):
                web_context.append({
                    "caption":      f"[{r['title']}] {r['snippet']}",
                    "source_url":   r["url"],
                    "risk_context": ctx,
                })

    logger.info("facebook_scraped", username=username, context_count=len(web_context))
    return {
        "username":    username,
        "profile_url": profile_url,
        "bio":         bio,
        "posts":       web_context,
        "web_results": r_profile + r_general + r_toxic,
    }


# ─────────────────────────────────────────────────────────────
# TWITTER / X
# ─────────────────────────────────────────────────────────────
async def scrape_twitter(twitter_url: str | None) -> dict:
    if not twitter_url:
        return {"error": "URL tidak diberikan", "tweets": []}

    username = twitter_url.strip().rstrip("/").split("/")[-1].replace("@", "").lower()
    api_key, cx = _get_keys()

    queries = [
        (f'site:x.com OR site:twitter.com "{username}"', api_key, cx, 5),
        (f'twitter @{username} kontroversi OR masalah OR viral OR skandal OR bully', api_key, cx, 6),
        (f'twitter @{username} toxic OR kasar OR menghina OR SARA', api_key, cx, 5),
    ]

    results = await _parallel_search(queries)
    r1, r2, r3 = results

    bio = next((r.get("snippet", "") for r in r1 if r.get("snippet")), "")
    tweets = [
        {"text": f"[{r['title']}] {r['snippet']}", "source": r["url"], "risk_context": ctx}
        for ctx, rs in [("general", r1), ("toxic_language", r2 + r3)]
        for r in rs if r.get("snippet")
    ]

    logger.info("twitter_scraped", username=username, tweets_count=len(tweets))
    return {"username": username, "bio": bio, "tweets": tweets}


# ─────────────────────────────────────────────────────────────
# LINKEDIN
# ─────────────────────────────────────────────────────────────
async def scrape_linkedin(linkedin_url: str | None) -> dict:
    if not linkedin_url:
        return {"error": "URL tidak diberikan"}

    api_key, cx = _get_keys()
    results = await _google_search(f'site:linkedin.com "{linkedin_url}"', api_key, cx, num=3)
    name     = results[0].get("title", "") if results else ""
    headline = results[0].get("snippet", "") if results else ""
    return {"profile_url": linkedin_url, "name": name, "headline": headline, "about": ""}


# ─────────────────────────────────────────────────────────────
# NEWS
# ─────────────────────────────────────────────────────────────
async def scrape_news(name: str) -> dict:
    api_key, cx = _get_keys()

    queries = [
        (f"{name} site:detik.com OR site:tribunnews.com OR site:kumparan.com OR site:cnnindonesia.com OR site:tempo.co OR site:liputan6.com", api_key, cx, 8),
        (f"{name} kasus OR masalah OR kontroversial OR skandal OR ditangkap OR hukum", api_key, cx, 6),
        (f"{name} terbaru 2024 OR 2025", api_key, cx, 5),
    ]
    results = await _parallel_search(queries)
    articles = [
        {"title": r["title"], "url": r["url"], "snippet": r["snippet"]}
        for rs in results for r in rs if r.get("snippet")
    ]

    seen, unique = set(), []
    for a in articles:
        if a["url"] not in seen:
            seen.add(a["url"])
            unique.append(a)

    logger.info("news_scraped", name=name, count=len(unique))
    return {"article_count": len(unique), "articles": unique}