// Enable Email/Password auth provider in Firebase project via REST API
const https = require('https');

const PROJECT_ID = 'taskmate-somil-81c1b';
const API_KEY = 'AIzaSyBXk2Ejmkjg_MNmw2wG5HvP6645PCnPIWM';

// Use gcloud access token from firebase CLI auth
const { execSync } = require('child_process');

let token;
try {
  token = execSync('npx firebase-tools login:print-token 2>nul', { encoding: 'utf8' }).trim();
} catch (e) {
  // Try getting gcloud token
  try {
    token = execSync('gcloud auth print-access-token 2>nul', { encoding: 'utf8' }).trim();
  } catch (e2) {
    console.error('Could not get access token');
    process.exit(1);
  }
}

console.log('Got token:', token ? '✅ yes' : '❌ no');

function httpsRequest(method, hostname, path, data, authToken) {
  return new Promise((resolve, reject) => {
    const body = data ? JSON.stringify(data) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    if (body) headers['Content-Length'] = Buffer.byteLength(body);

    const options = { hostname, path, method, headers };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  // Enable Email/Password sign-in provider
  const res = await httpsRequest(
    'PATCH',
    'identitytoolkit.googleapis.com',
    `/admin/v2/projects/${PROJECT_ID}/config?updateMask=signIn`,
    {
      signIn: {
        email: { enabled: true, passwordRequired: true }
      }
    },
    token
  );

  console.log('Enable email/password result:', res.status, JSON.stringify(res.body).slice(0, 300));
}

main().catch(console.error);
