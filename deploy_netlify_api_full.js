const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const SITE_ID = 'e7c6bf04-d10d-4298-8d96-8151eb34d25e';
const NETLIFY_TOKEN = 'nfp_8uvwAwVPdaz1L1j2kUoc128VgCoDZc6910cd';

function getSha1(buffer) {
    return crypto.createHash('sha1').update(buffer).digest('hex');
}

function copyDirSync(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDirSync(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

async function deployFull() {
    console.log('===========================================================');
    console.log('   ATOMIC NETLIFY DEPLOYER WITH BUNDLED DEPENDENCIES');
    console.log('===========================================================\n');

    const tempBuildDir = path.join(__dirname, '.temp_bundle_build');
    const tempZipsDir = path.join(__dirname, '.temp_bundle_zips');

    try {
        if (fs.existsSync(tempBuildDir)) fs.rmSync(tempBuildDir, { recursive: true, force: true });
        if (fs.existsSync(tempZipsDir)) fs.rmSync(tempZipsDir, { recursive: true, force: true });
        fs.mkdirSync(tempBuildDir, { recursive: true });
        fs.mkdirSync(tempZipsDir, { recursive: true });

        // 1. Collect static files
        const staticFiles = [
            'index.html',
            'tickets.html',
            'vendor.html',
            'auth-advert.js',
            'style.css',
            'netlify.toml'
        ];

        const filesManifest = {};
        const fileBuffers = {};

        for (const f of staticFiles) {
            const filePath = path.join(__dirname, f);
            if (fs.existsSync(filePath)) {
                const buf = fs.readFileSync(filePath);
                const sha = getSha1(buf);
                const relPath = '/' + f;
                filesManifest[relPath] = sha;
                fileBuffers[sha] = buf;
                console.log(`  📄 Static: ${relPath}`);
            }
        }

        // 2. Package functions with node_modules included
        const functionsDir = path.join(__dirname, 'netlify', 'functions');
        const nodeModulesDir = path.join(__dirname, 'node_modules');
        const functionsManifest = {};
        const functionBuffers = {};

        const funcFiles = fs.readdirSync(functionsDir).filter(f => f.endsWith('.js'));
        for (const f of funcFiles) {
            const funcName = path.basename(f, '.js');
            const funcTargetDir = path.join(tempBuildDir, funcName);
            fs.mkdirSync(funcTargetDir, { recursive: true });

            // Copy function file
            fs.copyFileSync(path.join(functionsDir, f), path.join(funcTargetDir, f));

            // Copy node_modules into function dir
            if (fs.existsSync(nodeModulesDir)) {
                copyDirSync(nodeModulesDir, path.join(funcTargetDir, 'node_modules'));
            }

            // Zip function directory using tar
            const funcZipPath = path.join(tempZipsDir, `${funcName}.zip`);
            execSync(`tar -a -cf "${funcZipPath}" *`, { cwd: funcTargetDir });

            const zipBuf = fs.readFileSync(funcZipPath);
            const sha = getSha1(zipBuf);
            functionsManifest[funcName] = sha;
            functionBuffers[funcName] = zipBuf;
            console.log(`  ⚡ Function: ${funcName} (${(zipBuf.length / 1024).toFixed(1)} KB)`);
        }

        // 3. Create deploy manifest on Netlify API
        console.log('\n📌 Step 1: Creating deploy manifest on Netlify...');
        const createDeployRes = await fetch(`https://api.netlify.com/api/v1/sites/${SITE_ID}/deploys`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NETLIFY_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: filesManifest,
                functions: functionsManifest,
                async: false
            })
        });

        const deployData = await createDeployRes.json();
        if (!createDeployRes.ok) {
            console.error('❌ Failed to create deploy:', deployData);
            return;
        }

        const deployId = deployData.id;
        console.log(`✅ Deploy ID created: ${deployId}`);

        // 4. Upload required static files
        const requiredFiles = deployData.required || [];
        console.log(`\n📌 Step 2: Uploading ${requiredFiles.length} static file(s)...`);
        for (const sha of requiredFiles) {
            const buf = fileBuffers[sha];
            if (buf) {
                const relPath = Object.keys(filesManifest).find(k => filesManifest[k] === sha);
                console.log(`  ⬆️ Uploading file: ${relPath}`);
                await fetch(`https://api.netlify.com/api/v1/deploys/${deployId}/files${relPath}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${NETLIFY_TOKEN}`,
                        'Content-Type': 'application/octet-stream'
                    },
                    body: buf
                });
            }
        }

        // 5. Upload required functions
        const requiredFunctions = deployData.required_functions || Object.keys(functionsManifest);
        console.log(`\n📌 Step 3: Uploading ${requiredFunctions.length} serverless function(s)...`);
        for (const funcName of requiredFunctions) {
            const zipBuf = functionBuffers[funcName];
            if (zipBuf) {
                console.log(`  ⬆️ Uploading function: ${funcName}`);
                const upRes = await fetch(`https://api.netlify.com/api/v1/deploys/${deployId}/functions/${funcName}?runtime=js`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${NETLIFY_TOKEN}`,
                        'Content-Type': 'application/octet-stream'
                    },
                    body: zipBuf
                });
                console.log(`     Response: ${upRes.status}`);
            }
        }

        console.log('\n===========================================================');
        console.log('🎉 ATOMIC NETLIFY DEPLOYMENT SUCCESS 100%!');
        console.log(`   Production URL: https://campuseventghana.site`);
        console.log('===========================================================');

    } catch (err) {
        console.error('❌ Deploy Error:', err);
    } finally {
        try { fs.rmSync(tempBuildDir, { recursive: true, force: true }); } catch(e) {}
        try { fs.rmSync(tempZipsDir, { recursive: true, force: true }); } catch(e) {}
    }
}

deployFull();
