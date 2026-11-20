"""Download free-licence photos listed in tools/photos.json into assets/photos/.
Runs in GitHub Actions (the build machine has internet). Stdlib only.
Each entry: {"k": key, "cap": caption, "file": Commons file | "titles": [Wikipedia titles], "w": width, "alias": [...]}.
Only files hosted on Wikimedia Commons with a free licence (PD, CC0, CC BY, CC BY-SA) are kept."""
import json, os, re, time, urllib.parse, urllib.request
UA = {'User-Agent': 'usa-geography-student-site/1.0 (https://github.com/beltrangsml/usa-geography)'}
OUT = 'assets/photos'
os.makedirs(OUT, exist_ok=True)
def get(url):
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return r.read()
        except Exception as e:
            time.sleep(3 * (i + 1)); err = e
    raise err
def api(host, params):
    params.update(format='json', formatversion='2')
    return json.loads(get('https://%s/w/api.php?%s' % (host, urllib.parse.urlencode(params))))
E = json.load(open('tools/photos.json'))
# 1. resolve Wikipedia titles to their lead image
need = sorted({t for e in E if 'file' not in e for t in e['titles']})
lead = {}
for i in range(0, len(need), 40):
    r = api('en.wikipedia.org', {'action': 'query', 'prop': 'pageimages', 'piprop': 'name', 'redirects': '1', 'titles': '|'.join(need[i:i+40])})['query']
    back = {}
    for n in r.get('normalized', []) + r.get('redirects', []):
        back[n['to']] = back.get(n['from'], n['from'])
    for p in r['pages']:
        if p.get('pageimage'):
            t = p['title']; lead[back.get(t, t)] = p['pageimage']; lead[t] = p['pageimage']
for e in E:
    if 'file' not in e:
        e['file'] = next((lead[t] for t in e['titles'] if t in lead), None)
# 2. licence + thumbnail from Commons
files = sorted({e['file'] for e in E if e.get('file')})
info = {}
for w in (960, 1600):
    for i in range(0, len(files), 40):
        r = api('commons.wikimedia.org', {'action': 'query', 'prop': 'imageinfo', 'iiprop': 'url|extmetadata', 'iiurlwidth': str(w),
                'iiextmetadatafilter': 'LicenseShortName|Artist', 'titles': '|'.join('File:' + f for f in files[i:i+40])})['query']
        back = {n['to']: n['from'] for n in r.get('normalized', [])}
        for p in r['pages']:
            if 'imageinfo' not in p: continue
            ii = p['imageinfo'][0]; m = ii.get('extmetadata', {})
            f = back.get(p['title'], p['title'])[5:]
            d = info.setdefault(f, {'lic': m.get('LicenseShortName', {}).get('value', ''),
                 'by': re.sub(r'\s+', ' ', re.sub('<[^>]+>', '', m.get('Artist', {}).get('value', 'Wikimedia Commons'))).strip()[:90]})
            d[w] = ii.get('thumburl') or ii['url']
FREE = re.compile(r'public domain|^pd|cc0|cc[ -]by|attribution|no restrictions', re.I)
man, report = {}, []
for e in E:
    k, f = e['k'], e.get('file')
    d = info.get(f) if f else None
    if not d: report.append('NOT FOUND  %s  %s' % (k, f or e.get('titles'))); continue
    if not FREE.search(d['lic']) or re.search(r'\bN[CD]\b', d['lic']): report.append('NOT FREE   %s  %s  %s' % (k, f, d['lic'])); continue
    url = d[1600 if e.get('w', 960) > 960 else 960]
    ext = os.path.splitext(urllib.parse.urlparse(url).path)[1].lower()
    ext = '.png' if ext == '.png' else '.jpg'
    path = '%s/%s%s' % (OUT, re.sub(r'[^a-z0-9]+', '-', k.lower()).strip('-'), ext)
    old = json.load(open(OUT + '/manifest.json')).get(k, {}) if os.path.exists(OUT + '/manifest.json') else {}
    if not (os.path.exists(path) and old.get('file') == f):
        open(path, 'wb').write(get(url)); time.sleep(0.3)
    man[k] = {'src': path, 'file': f, 'cap': e['cap'], 'by': d['by'] or 'Wikimedia Commons', 'lic': d['lic'], 'alias': e.get('alias', [])}
json.dump(man, open(OUT + '/manifest.json', 'w'), ensure_ascii=False, indent=0)
open(OUT + '/photos.js', 'w').write('window.PHM=' + json.dumps({k: [v['src'], v['cap'], v['by'], v['lic'], v['file'], v['alias']] for k, v in man.items()}, ensure_ascii=False) + ';\n')
open(OUT + '/report.txt', 'w').write('\n'.join(report) + '\n%d photos saved\n' % len(man))
print('\n'.join(report)); print(len(man), 'photos')
