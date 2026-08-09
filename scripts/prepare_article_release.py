from argparse import ArgumentParser
from pathlib import Path
import json
import shutil
import xml.etree.ElementTree as ET

from bs4 import BeautifulSoup

from build_site import build_article
from validate_articles import validate_articles

ROOT = Path(__file__).resolve().parent.parent
RELEASE_DIR = ROOT / "release"
ARTICLES_JSON = ROOT / "assets" / "data" / "articles.json"
SITEMAP = ROOT / "sitemap.xml"
SITE_URL = "https://diverra.github.io/diverra"
SITEMAP_NS = "https://www.sitemaps.org/schemas/sitemap/0.9"


def find_article(slug):
    articles, errors = validate_articles()
    if errors:
        for error in errors:
            print(f"- {error}")
        raise SystemExit("記事データの検査に失敗しました")
    for article in articles:
        if article["metadata"]["slug"] == slug:
            return article
    raise SystemExit(f"記事が見つかりません: {slug}")


def production_html(article):
    preview_path = build_article(article)
    soup = BeautifulSoup(preview_path.read_text(encoding="utf-8"), "html.parser")
    for attribute in ("src", "href"):
        for tag in soup.find_all(attrs={attribute: True}):
            value = tag.get(attribute, "")
            if value.startswith("../../"):
                tag[attribute] = value[3:]
            elif value.startswith("/assets/"):
                tag[attribute] = ".." + value
    return "<!doctype html>\n" + str(soup)


def released_markdown(article):
    source = article["path"].read_text(encoding="utf-8")
    if "draft: true" not in source:
        raise SystemExit("選択した記事は下書きではありません")
    return source.replace("draft: true", "draft: false", 1)


def update_articles_json(metadata):
    articles = json.loads(ARTICLES_JSON.read_text(encoding="utf-8"))
    slug = metadata["slug"]
    url = f"{slug}/index.html"
    entry = {
        "title": metadata["title"],
        "description": metadata["description"],
        "date": metadata["modified"],
        "dateLabel": metadata["modified"].replace("-", ".") + " 更新",
        "category": metadata["category"],
        "readingTime": f"読了 {metadata['reading_time']}分",
        "thumbnail": metadata["thumbnail"],
        "url": url,
        "alt": metadata["thumbnail_alt"],
    }
    articles = [article for article in articles if article.get("url") != url]
    articles.append(entry)
    articles.sort(key=lambda article: article.get("date", ""), reverse=True)
    output = RELEASE_DIR / "assets" / "data" / "articles.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(articles, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def update_sitemap(metadata):
    ET.register_namespace("", SITEMAP_NS)
    tree = ET.parse(SITEMAP)
    root = tree.getroot()
    article_url = f"{SITE_URL}/{metadata['slug']}/"
    existing = None
    for node in root.findall(f"{{{SITEMAP_NS}}}url"):
        loc = node.find(f"{{{SITEMAP_NS}}}loc")
        if loc is not None and loc.text == article_url:
            existing = node
            break
    if existing is None:
        existing = ET.SubElement(root, f"{{{SITEMAP_NS}}}url")
        ET.SubElement(existing, f"{{{SITEMAP_NS}}}loc").text = article_url
        ET.SubElement(existing, f"{{{SITEMAP_NS}}}lastmod")
        ET.SubElement(existing, f"{{{SITEMAP_NS}}}changefreq").text = "monthly"
        ET.SubElement(existing, f"{{{SITEMAP_NS}}}priority").text = "0.8"
    lastmod = existing.find(f"{{{SITEMAP_NS}}}lastmod")
    if lastmod is not None:
        lastmod.text = metadata["modified"]
    tree.write(RELEASE_DIR / "sitemap.xml", encoding="UTF-8", xml_declaration=True)


def prepare_release(slug):
    article = find_article(slug)
    metadata = article["metadata"]
    if RELEASE_DIR.exists():
        shutil.rmtree(RELEASE_DIR)
    article_output = RELEASE_DIR / slug / "index.html"
    article_output.parent.mkdir(parents=True, exist_ok=True)
    article_output.write_text(production_html(article), encoding="utf-8")
    markdown_output = RELEASE_DIR / "content" / "articles" / article["path"].name
    markdown_output.parent.mkdir(parents=True, exist_ok=True)
    markdown_output.write_text(released_markdown(article), encoding="utf-8")
    thumbnail = ROOT / metadata["thumbnail"]
    thumbnail_output = RELEASE_DIR / metadata["thumbnail"]
    thumbnail_output.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(thumbnail, thumbnail_output)
    update_articles_json(metadata)
    update_sitemap(metadata)
    print("公開前成果物を生成しました")
    print(f"- 記事: release/{slug}/index.html")
    print(f"- 画像: release/{metadata['thumbnail']}")
    print("- 記事一覧: release/assets/data/articles.json")
    print("- サイトマップ: release/sitemap.xml")
    print("- 公開サイトは変更していません")


def main():
    parser = ArgumentParser()
    parser.add_argument("slug")
    arguments = parser.parse_args()
    prepare_release(arguments.slug)


if __name__ == "__main__":
    main()
