import os
import zipfile
import hashlib
import urllib.request
import json
import io

SITE_ID = 'e7c6bf04-d10d-4298-8d96-8151eb34d25e'
NETLIFY_TOKEN = 'nfp_8uvwAwVPdaz1L1j2kUoc128VgCoDZc6910cd'
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def get_sha1(data_bytes):
    return hashlib.sha1(data_bytes).hexdigest()

print("[1] Collecting static files...")
static_files = ['index.html', 'tickets.html', 'vendor.html', 'auth-advert.js', 'style.css', 'netlify.toml']
files_manifest = {}
file_buffers = {}

for f in static_files:
    fp = os.path.join(BASE_DIR, f)
    if os.path.exists(fp):
        with open(fp, 'rb') as fh:
            buf = fh.read()
        sha = get_sha1(buf)
        rel = '/' + f
        files_manifest[rel] = sha
        file_buffers[sha] = buf

print("[2] Packaging serverless functions...")
functions_dir = os.path.join(BASE_DIR, 'netlify', 'functions')
node_modules_dir = os.path.join(BASE_DIR, 'node_modules')
functions_manifest = {}
function_buffers = {}

for f in os.listdir(functions_dir):
    if f.endswith('.js'):
        func_name = f[:-3]
        func_path = os.path.join(functions_dir, f)
        
        # Build in-memory zip containing function and node_modules
        zip_io = io.BytesIO()
        with zipfile.ZipFile(zip_io, 'w', zipfile.ZIP_DEFLATED) as zf:
            zf.write(func_path, f)
            if os.path.exists(node_modules_dir):
                for root, dirs, files in os.walk(node_modules_dir):
                    for file in files:
                        full_p = os.path.join(root, file)
                        arc_p = os.path.relpath(full_p, BASE_DIR).replace('\\', '/')
                        zf.write(full_p, arc_p)
                        
        zip_bytes = zip_io.getvalue()
        sha = get_sha1(zip_bytes)
        functions_manifest[func_name] = sha
        function_buffers[func_name] = zip_bytes
        print(f"  Function: {func_name} ({len(zip_bytes)} bytes)")

print("\n[3] Creating Netlify Deploy...")
req_data = json.dumps({
    'files': files_manifest,
    'functions': functions_manifest,
    'async': False
}).encode('utf-8')

req = urllib.request.Request(
    f"https://api.netlify.com/api/v1/sites/{SITE_ID}/deploys",
    data=req_data,
    headers={
        'Authorization': f'Bearer {NETLIFY_TOKEN}',
        'Content-Type': 'application/json'
    },
    method='POST'
)

with urllib.request.urlopen(req) as resp:
    deploy_data = json.loads(resp.read().decode('utf-8'))

deploy_id = deploy_data['id']
print(f"  Deploy created: {deploy_id} (State: {deploy_data.get('state')})")

print("\n[4] Uploading required files...")
for sha in deploy_data.get('required', []):
    buf = file_buffers.get(sha)
    if buf:
        rel = [k for k, v in files_manifest.items() if v == sha][0]
        print(f"  Uploading file: {rel}")
        up_req = urllib.request.Request(
            f"https://api.netlify.com/api/v1/deploys/{deploy_id}/files{rel}",
            data=buf,
            headers={
                'Authorization': f'Bearer {NETLIFY_TOKEN}',
                'Content-Type': 'application/octet-stream'
            },
            method='PUT'
        )
        urllib.request.urlopen(up_req)

print("\n[5] Uploading serverless functions with ?runtime=js...")
for fn, buf in function_buffers.items():
    print(f"  Uploading function: {fn} ({len(buf)} bytes)")
    try:
        up_req = urllib.request.Request(
            f"https://api.netlify.com/api/v1/deploys/{deploy_id}/functions/{fn}?runtime=js",
            data=buf,
            headers={
                'Authorization': f'Bearer {NETLIFY_TOKEN}',
                'Content-Type': 'application/zip'
            },
            method='PUT'
        )
        with urllib.request.urlopen(up_req) as fn_resp:
            print(f"    Status: {fn_resp.status}")
    except Exception as e:
        print(f"    Error: {e}")

print("\n[SUCCESS] Deployment complete!")
print(f"Production URL: https://campuseventghana.site")
