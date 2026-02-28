import { GoogleAuth } from 'google-auth-library';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const keyPath = path.resolve(__dirname, 'project-8835c244-6581-4347-820-f7a1d3360c86.json');
const credentials = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));

console.log('Service account:', credentials.client_email);
console.log('Project in key:', credentials.project_id);

const auth = new GoogleAuth({
  credentials,
  scopes: 'https://www.googleapis.com/auth/cloud-platform',
});

const projectId = await auth.getProjectId().catch(() => null);
console.log('getProjectId() returned:', projectId);

// Use same override logic as pipeline.ts
const targetProject = (!projectId || projectId === 'lumina-app-488718')
  ? 'project-8835c244-6581-4347-820'
  : projectId;
console.log('Using project:', targetProject);

const client = await auth.getClient();
const tokenResponse = await client.getAccessToken();
const token = tokenResponse.token;
console.log('Got token:', token ? '✓ (length ' + token.length + ')' : '✗ MISSING');

const region = 'us-central1';
const modelId = 'imagen-3.0-generate-002';
const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${targetProject}/locations/${region}/publishers/google/models/${modelId}:predict`;

console.log('\nCalling:', endpoint);
console.log('Prompt: "a plain white coffee mug on a white background, product photography"');

const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    instances: [{ prompt: 'a plain white coffee mug on a white background, product photography' }],
    parameters: { sampleCount: 1, aspectRatio: '1:1', outputOptions: { mimeType: 'image/png' } },
  }),
});

console.log('\nHTTP status:', response.status, response.statusText);
const data = await response.json();

if (data.predictions?.[0]?.bytesBase64Encoded) {
  console.log('✓ SUCCESS — got image, base64 length:', data.predictions[0].bytesBase64Encoded.length);
} else {
  console.log('✗ FAILED — full response:', JSON.stringify(data, null, 2));
}
