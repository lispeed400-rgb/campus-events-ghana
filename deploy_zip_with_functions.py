import os
import zipfile
import urllib.request
import json

SITE_ID = 'e7c6bf04-d10d-4298-8d96-8151eb34d25e'
NETLIFY_TOKEN = 'nfp_8uvwAwVPdaz1L1j2kUoc128VgCoDZc6910cd'
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ZIP_FILE = os.path.join(BASE_DIR, 'deploy_bundle.zip')

print("[1] Building deployment archive...")
static_files = [
    'index.html', 'tickets.html', 'vendor.html', 'developers.html',
    'gateway.html', 'auth-advert.js', 'style.css', 'netlify.toml', 'package.json'
]

functions_dir = os.path.join(BASE_DIR, 'netlify', 'functions')

with zipfile.ZipFile(ZIP_FILE, 'w', zipfile.ZIP_DEFLATED) as zf:
    for f in static_files:
        fp = os.path.join(BASE_DIR, f)
        if os.path.exists(fp):
            zf.write(fp, f)
            print(f"  + {f}")

    if os.path.exists(functions_dir):
        for f in os.listdir(functions_dir):
            if f.endswith('.js'):
                src = os.path.join(functions_dir, f)
                zf.write(src, f"functions/{f}")
                zf.write(src, f"netlify/functions/{f}")
                print(f"  + functions/{f}")

print(f"\n[2] Uploading ZIP ({os.path.getsize(ZIP_FILE)} bytes) to Netlify...")
with open(ZIP_FILE, 'rb') as fh:
    zip_bytes = fh.read()

req = urllib.request.Request(
    f"https://api.netlify.com/api/v1/sites/{SITE_ID}/deploys",
    data=zip_bytes,
    headers={
        'Authorization': f'Bearer {NETLIFY_TOKEN}',
        'Content-Type': 'application/zip'
    },
    method='POST'
)

with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode('utf-8'))
    print(f"\n[SUCCESS] Deployed! ID: {data.get('id')}, State: {data.get('state')}")
    print(f"Production URL: {data.get('ssl_url') or data.get('url') or 'https://campuseventghana.site'}")

if os.path.exists(ZIP_FILE):
    os.remove(ZIP_FILE)
