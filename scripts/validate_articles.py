from datetime import date
from pathlib import Path
import re
import sys
import yaml

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "content" / "articles"

REQUIRED = [
    "title",
    "description",
    "slug",
    "published",
    "modified",
    "category",
    "country",
    "reading_time",
    "thumbnail",
    "thumbnail_alt",
    "keywords",
    "draft",
]

def read_article(path):
    text = path.read_text(encoding="utf-8")

    if not text.startswith("---\n"):
        raise ValueError("記事先頭にフロントマターがありません")

    parts = text.split("---", 2)

    if len(parts) != 3:
        raise ValueError("フロントマターの区切りが不正です")

    metadata = yaml.safe_load(parts[1]) or {}
    body = parts[2].strip()

    return metadata, body

def validate_articles():
    articles = []
    errors = []
    slugs = {}

    for path in sorted(CONTENT_DIR.glob("*.md")):
        try:
            metadata, body = read_article(path)
        except Exception as error:
            errors.append(f"{path.name}: {error}")
            continue

        for field in REQUIRED:
            if field not in metadata or metadata[field] in ("", None, []):
                errors.append(f"{path.name}: {field} が未入力です")

        slug = str(metadata.get("slug", ""))

        if slug and not re.fullmatch(
            r"[a-z0-9]+(?:-[a-z0-9]+)*",
            slug
        ):
            errors.append(
                f"{path.name}: slugの形式が正しくありません"
            )

        if slug in slugs:
            errors.append(
                f"{path.name}: slugが{slugs[slug]}と重複しています"
            )
        elif slug:
            slugs[slug] = path.name

        for field in ("published", "modified"):
            value = metadata.get(field)

            if isinstance(value, date):
                metadata[field] = value.isoformat()
            else:
                try:
                    date.fromisoformat(str(value))
                except ValueError:
                    errors.append(
                        f"{path.name}: {field}はYYYY-MM-DD形式にしてください"
                    )

        thumbnail = metadata.get("thumbnail")

        if thumbnail and not (ROOT / str(thumbnail)).is_file():
            errors.append(
                f"{path.name}: 画像が見つかりません: {thumbnail}"
            )

        if not body:
            errors.append(f"{path.name}: 本文がありません")

        articles.append({
            "path": path,
            "metadata": metadata,
            "body": body,
        })

    if not articles:
        errors.append("記事データがありません")

    return articles, errors

if __name__ == "__main__":
    articles, errors = validate_articles()

    if errors:
        print("記事データの検査に失敗しました")

        for error in errors:
            print(f"- {error}")

        sys.exit(1)

    print(f"{len(articles)}件の記事データを検査しました")
    print("入力エラーはありません")
