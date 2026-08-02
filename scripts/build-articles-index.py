from pathlib import Path
from html import unescape
import json
import re

ROOT = Path(__file__).resolve().parent.parent
articles = []

def extract(pattern, text, default=""):
    match = re.search(pattern, text, re.I | re.S)
    return unescape(match.group(1).strip()) if match else default

def clean_text(value):
    return re.sub(r"<[^>]+>", "", value).strip()

def normalize_image(value):
    prefix = "https://diverra.github.io/diverra/"
    if value.startswith(prefix):
        return value[len(prefix):]

    while value.startswith("../"):
        value = value[3:]

    if value.startswith("/diverra/"):
        value = value[len("/diverra/"):]

    return value.lstrip("/")

for page in sorted(ROOT.glob("*/index.html")):
    html = page.read_text(encoding="utf-8")

    og_type = extract(
        r'<meta\s+property=["\']og:type["\']\s+content=["\']([^"\']+)["\']',
        html
    )

    if og_type.lower() != "article":
        continue

    title = clean_text(extract(r"<title>(.*?)</title>", html))
    title = re.sub(r"\s*｜旅するマネーノート.*$", "", title)

    description = extract(
        r'<meta\s+name=["\']description["\']\s+content=["\']([^"\']*)["\']',
        html
    )

    image = extract(
        r'<meta\s+property=["\']og:image["\']\s+content=["\']([^"\']+)["\']',
        html
    )

    date = extract(
        r'"dateModified"\s*:\s*"([^"]+)"',
        html,
        extract(r'"datePublished"\s*:\s*"([^"]+)"', html, "2026-01-01")
    )

    reading_match = re.search(r"読了(?:時間)?\s*(\d+)\s*分", html)
    reading_time = (
        f"読了 {reading_match.group(1)}分"
        if reading_match
        else "読了 8分"
    )

    slug = page.parent.name
    category = "THAILAND" if slug.startswith("thailand") else "TRAVEL"

    articles.append({
        "title": title,
        "description": description,
        "date": date,
        "dateLabel": date.replace("-", ".") + " 更新",
        "category": category,
        "readingTime": reading_time,
        "thumbnail": normalize_image(image),
        "url": f"{slug}/index.html",
        "alt": title
    })

articles.sort(key=lambda article: article["date"], reverse=True)

output = ROOT / "assets/data/articles.json"
output.write_text(
    json.dumps(articles, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8"
)

print(f"{len(articles)}件の記事をarticles.jsonへ登録しました。")
