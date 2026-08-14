#!/usr/bin/env python3
"""
Check sitemap.xml <loc> URLs map to local files in the workspace.

Usage: python scripts/check_sitemap_files.py
"""
import os
import re
from urllib.parse import urlparse

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
SITEMAP = os.path.join(ROOT, 'sitemap.xml')
BASE_HOST = 'www.shreeharichasmaghar.com'


def parse_locs(sitemap_path):
    text = open(sitemap_path, 'r', encoding='utf-8').read()
    locs = re.findall(r'<loc>(.*?)</loc>', text)
    return locs


def url_to_candidates(loc):
    u = urlparse(loc)
    path = u.path
    if path == '' or path == '/':
        return [os.path.join(ROOT, 'index.html')]
    # remove leading slash
    if path.startswith('/'):
        path = path[1:]
    candidates = []
    # exact file if has extension
    if os.path.splitext(path)[1]:
        candidates.append(os.path.join(ROOT, path))
    # try add .html
    candidates.append(os.path.join(ROOT, path + '.html'))
    # try index.html inside folder
    candidates.append(os.path.join(ROOT, path, 'index.html'))
    return candidates


def main():
    if not os.path.exists(SITEMAP):
        print('sitemap.xml not found at', SITEMAP)
        return 2

    locs = parse_locs(SITEMAP)
    missing = []
    for loc in locs:
        # only care about same-host URLs
        p = urlparse(loc)
        if p.netloc and BASE_HOST not in p.netloc:
            continue
        candidates = url_to_candidates(loc)
        found = False
        for c in candidates:
            if os.path.exists(c):
                found = True
                break
        if not found:
            missing.append((loc, candidates))

    print('\nSitemap check complete. Entries checked:', len(locs))
    if not missing:
        print('All sitemap URLs map to local files. Good.')
        return 0

    print('\nMissing files for the following sitemap URLs:')
    for loc, cand in missing:
        print('- URL:', loc)
        print('  tried:')
        for c in cand:
            print('   -', os.path.relpath(c, ROOT))
        print('')

    print('Total missing:', len(missing))
    return 1


if __name__ == '__main__':
    raise SystemExit(main())
