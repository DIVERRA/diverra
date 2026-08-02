from pathlib import Path
from urllib.parse import quote
import json

import markdown
from bs4 import BeautifulSoup

from validate_articles import validate_articles

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / "templates" / "article-source.html"
PREVIEW_DIR = ROOT / "preview"
SITE_URL = "https://diverra.github.io/diverra"

def set_meta(soup, selector, content):
    tag = soup.select_one(selector)

    if tag:
        tag["content"] = content

def update_structured_data(soup, metadata, article_url, image_url):
    for script in list(soup.select('script[type="application/ld+json"]')):
        try:
            data = json.loads(script.string or "")
        except (json.JSONDecodeError, TypeError):
            continue

        data_type = data.get("@type")

        if data_type == "Article":
            data["headline"] = metadata["title"]
            data["description"] = metadata["description"]
            data["image"] = image_url
            data["datePublished"] = metadata["published"]
            data["dateModified"] = metadata["modified"]
            data["mainEntityOfPage"] = {
                "@type": "WebPage",
                "@id": article_url,
            }

        elif data_type == "BreadcrumbList":
            data["itemListElement"] = [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "ホーム",
                    "item": f"{SITE_URL}/",
                },
                {
                    "@type": "ListItem",
                    "position": 2,
                    "name": metadata["category"],
                    "item": f"{SITE_URL}/#article",
                },
                {
                    "@type": "ListItem",
                    "position": 3,
                    "name": metadata["title"],
                    "item": article_url,
                },
            ]

        elif data_type == "FAQPage":
            script.decompose()
            continue

        script.string = json.dumps(
            data,
            ensure_ascii=False,
            indent=2,
        )

def create_body(body_markdown):
    body_html = markdown.markdown(
        body_markdown,
        extensions=[
            "extra",
            "sane_lists",
            "toc",
        ],
    )

    fragment = BeautifulSoup(body_html, "html.parser")

    first_h1 = fragment.find("h1")

    if first_h1:
        first_h1.decompose()

    return fragment

def update_toc(soup, fragment):
    toc = (
        soup.select_one(".toc-box ol")
        or soup.select_one(".editorial-toc ol")
        or soup.select_one("aside ol")
    )

    if not toc:
        return

    toc.clear()

    for heading in fragment.find_all("h2"):
        heading_id = heading.get("id")

        if not heading_id:
            continue

        item = soup.new_tag("li")
        link = soup.new_tag("a", href=f"#{heading_id}")
        link.string = heading.get_text(" ", strip=True)
        item.append(link)
        toc.append(item)

def rewrite_preview_paths(soup):
    for tag in soup.find_all(src=True):
        value = tag.get("src", "")

        if value.startswith("../"):
            tag["src"] = "../" + value

    for tag in soup.find_all(href=True):
        value = tag.get("href", "")

        if value.startswith("../"):
            tag["href"] = "../" + value

def build_article(article):
    metadata = article["metadata"]
    body = article["body"]
    slug = metadata["slug"]

    soup = BeautifulSoup(
        TEMPLATE.read_text(encoding="utf-8"),
        "html.parser",
    )

    article_url = f"{SITE_URL}/{slug}/"
    image_url = f"{SITE_URL}/{metadata['thumbnail']}"

    if soup.title:
        soup.title.string = (
            f"{metadata['title']}｜旅するマネーノート"
        )

    set_meta(
        soup,
        'meta[name="description"]',
        metadata["description"],
    )
    set_meta(soup, 'meta[property="og:title"]', metadata["title"])
    set_meta(
        soup,
        'meta[property="og:description"]',
        metadata["description"],
    )
    set_meta(soup, 'meta[property="og:image"]', image_url)
    set_meta(soup, 'meta[name="twitter:title"]', metadata["title"])
    set_meta(
        soup,
        'meta[name="twitter:description"]',
        metadata["description"],
    )
    set_meta(soup, 'meta[name="twitter:image"]', image_url)

    canonical = soup.select_one('link[rel="canonical"]')

    if canonical:
        canonical["href"] = article_url

    heading = soup.find("h1")

    if heading:
        heading.string = metadata["title"]

    lead = soup.select_one(".lead")

    if lead:
        lead.string = metadata["description"]

    hero = soup.select_one(".article-hero-image")

    if hero:
        hero["src"] = f"../{metadata['thumbnail']}"
        hero["alt"] = metadata["thumbnail_alt"]
        hero.attrs.pop("width", None)
        hero.attrs.pop("height", None)

    tag = soup.select_one(".article-meta .tag")

    if tag:
        tag.string = metadata["country"]

    meta_spans = soup.select(".article-meta span")

    for span in meta_spans:
        if "読了" in span.get_text():
            span.string = f"読了時間 {metadata['reading_time']}分"

    time = soup.select_one(".article-meta time")

    if time:
        time["datetime"] = metadata["modified"]
        time.string = f"更新日 {metadata['modified']}"

    fragment = create_body(body)
    update_toc(soup, fragment)

    editorial_body = soup.select_one(".editorial-body")

    if not editorial_body:
        raise RuntimeError(
            "テンプレート内に.editorial-bodyが見つかりません"
        )

    editorial_body.clear()

    for element in list(fragment.contents):
        editorial_body.append(element)

    update_structured_data(
        soup,
        metadata,
        article_url,
        image_url,
    )

    share_text = quote(metadata["title"])
    x_link = soup.select_one(
        'a[href*="twitter.com/intent/tweet"]'
    )

    if x_link:
        x_link["href"] = (
            f"https://twitter.com/intent/tweet"
            f"?text={share_text}&url={quote(article_url)}"
        )

    rewrite_preview_paths(soup)

    output_dir = PREVIEW_DIR / slug
    output_dir.mkdir(parents=True, exist_ok=True)
    output = output_dir / "index.html"
    output.write_text(
        "<!doctype html>\n" + str(soup),
        encoding="utf-8",
    )

    return output

def main():
    articles, errors = validate_articles()

    if errors:
        print("記事データの検査に失敗しました")

        for error in errors:
            print(f"- {error}")

        raise SystemExit(1)

    generated = []

    for article in articles:
        generated.append(build_article(article))

    print(f"{len(generated)}件のプレビューを生成しました")

    for path in generated:
        print(f"- {path.relative_to(ROOT)}")

    print("公開中のページは変更していません")

if __name__ == "__main__":
    main()
