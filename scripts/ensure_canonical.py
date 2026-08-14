#!/usr/bin/env python3
"""
Scan HTML files and ensure a static <link rel="canonical"> tag is present
and that `meta name="robots"` contains `index, follow`.

This script computes the canonical URL using the site's preferred base:
https://www.shreeharichasmaghar.com

Run: python scripts/ensure_canonical.py
"""
import os
import re

BASE = "https://www.shreeharichasmaghar.com"
ROOT = os.path.join(os.path.dirname(__file__), os.pardir)


def path_to_url(html_path):
    # Convert filesystem path to URL path used in sitemap/canonical
    rel = os.path.relpath(html_path, ROOT).replace("\\", "/")
    # Remove leading './' if any
    if rel.startswith("./"):
        rel = rel[2:]
    # Index page
    if rel == "index.html":
        return "/"
    # For files like foo.html -> /foo
    if rel.endswith(".html"):
        rel = rel[:-5]
    # Ensure leading slash
    if not rel.startswith("/"):
        rel = "/" + rel
    # Remove trailing /index
    if rel.endswith("/index"):
        rel = rel[:-6] + "/"
    return rel


def ensure_canonical_in_html(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        html = f.read()

    head_match = re.search(r"<head[^>]*>", html, flags=re.IGNORECASE)
    if not head_match:
        return False

    url_path = path_to_url(file_path)
    canonical = f'<link rel="canonical" href="{BASE}{url_path}">'

    # Replace existing canonical if any
    if re.search(r'<link[^>]+rel=["\']canonical["\']', html, flags=re.IGNORECASE):
        html_new = re.sub(r'(<link[^>]+rel=["\']canonical["\'][^>]*>)', canonical, html, flags=re.IGNORECASE)
    else:
        # Insert canonical right after <head> tag
        html_new = re.sub(r'(<head[^>]*>)', r"\1\n    " + canonical, html, flags=re.IGNORECASE)

    # Ensure meta robots includes index, follow
    if re.search(r'<meta[^>]+name=["\']robots["\']', html_new, flags=re.IGNORECASE):
        html_new = re.sub(r'(<meta[^>]+name=["\']robots["\'][^>]*content=["\'])([^"\']*)(["\'][^>]*>)',
                          lambda m: m.group(1) + ensure_index_follow(m.group(2)) + m.group(3),
                          html_new, flags=re.IGNORECASE)
    else:
        # insert robots meta after canonical
        html_new = html_new.replace(canonical, canonical + '\n    <meta name="robots" content="index, follow, max-image-preview:large">')

    if html_new != html:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(html_new)
        return True
    return False


def ensure_index_follow(content):
    parts = [p.strip() for p in re.split(r'[,;\s]+', content) if p.strip()]
    if 'index' not in parts:
        parts.insert(0, 'index')
    if 'follow' not in parts:
        parts.insert(1, 'follow')
    return ', '.join(parts)


def main():
    changed = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        # skip node_modules, .git etc
        if any(p in dirpath for p in ['.git', 'node_modules', '__pycache__']):
            continue
        for fn in filenames:
            if fn.lower().endswith('.html'):
                fp = os.path.join(dirpath, fn)
                if ensure_canonical_in_html(fp):
                    changed.append(os.path.relpath(fp, ROOT))

    print('Processed HTML files. Updated:')
    for c in changed:
        print(' -', c)


if __name__ == '__main__':
    main()
