import os
import zipfile
import urllib.request
import json

SITE_ID = 'e7c6bf04-d10d-4298-8d96-8151eb34d25e'
NETLIFY_TOKEN = 'nfp_8uvwAwVPdaz1L1j2kUoc128VgCoDZc6910cd'
ZIP_NAME = 'deploy.zip'

print('📌 Step 1: Creating deploy.zip with POSIX forward-slash paths...')

files_to_zip = [
    ('index.html', 'index.html'),
    ('tickets.html', 'tickets.html'),
    ('vendor.html', 'vendor.html'),
    ('auth-advert.js', 'auth-advert.js'),
    ('style.css', 'style.css'),
    ('netlify.toml', 'netlify.toml'),
    ('package.json', 'package.json')
]

# Add all functions inside netlify/functions with forward slashes
functions_dir = os.path.join(os.path.dirname(__file__), 'netlify', 'functions')
for f in os.listdir(functions_dir):
    if f.endswith('.js'):
        src = os.path.join(functions_dir, f)
        arc = f'netlify/functions/{f}'
        files_to_zip.append((src, arc))

with zipfile.ZipFile(ZIP_NAME, 'w', zipfile.ZIP_DEFLATED) as zf:
    for src, arc in files_to_zip:
        zf.write(src, arc)
        print(f'  + {arc}')

print(f'✅ ZIP archive created: {os.path.getsize(ZIP_NAME)} bytes')

print('\n📌 Step 2: Uploading ZIP to Netlify REST API...')
with open(ZIP_NAME, 'rb') as f:
    zip_bytes = f.read()

url = f'https://api.netlify.com/api/v1/sites/{SITE_ID}/deploys'
req = urllib.request.Request(
    url,
    data=zip_bytes,
    headers={
        'Authorization': f'Bearer {NETLIFY_TOKEN}',
        'Content-Type': 'application/zip',
        'User-Agent': 'CampusEventsDeploy/1.0'
    },
    method='POST'
)

try:
    with urllib.request.urlopen(req) as resp:
        body = resp.read().decode('utf-8')
        data = json.loads(body)
        print('\n===========================================================')
        print('🎉 NETLIFY DEPLOY SUCCESSFUL!')
        print(f'Deploy ID: {data.get("id")}')
        print(f'State: {data.get("state")}')
        print(f'URL: {data.get("ssl_url") or data.get("url")}')
        print('===========================================================')
except urllib.error.HTTPError as err:
    print('❌ Netlify HTTP Error:', err.code, err.read().decode('utf-8'))
except Exception as e:
    print('❌ Deploy Error:', e)

if os.path.exists(ZIP_NAME):
    os.remove(ZIP_NAME)
