import type { Plugin } from 'vite';
import { GoogleAuth } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

export function vertexProxy(): Plugin {
    return {
        name: 'vertex-proxy',
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                if (req.url === '/api/imagen' && req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => {
                        body += chunk.toString();
                    });
                    req.on('end', async () => {
                        try {
                            const { prompt, region = 'us-central1' } = JSON.parse(body);

                            let auth;
                            const localKeyPath = path.resolve(process.cwd(), 'project-8835c244-6581-4347-820-f7a1d3360c86.json');

                            // Check if the physical JSON file is here (for local dev)
                            if (fs.existsSync(localKeyPath)) {
                                auth = new GoogleAuth({
                                    keyFile: localKeyPath,
                                    scopes: 'https://www.googleapis.com/auth/cloud-platform',
                                });
                            } else {
                                // Fallback (useful if we deploy exactly like this to Vercel with GOOGLE_APPLICATION_CREDENTIALS)
                                auth = new GoogleAuth({
                                    scopes: 'https://www.googleapis.com/auth/cloud-platform',
                                });
                            }

                            let projectId = await auth.getProjectId().catch(() => null);
                            if (!projectId || projectId === 'lumina-app-488718') {
                                projectId = 'project-8835c244-6581-4347-820';
                            }

                            const client = await auth.getClient();
                            const tokenResponse = await client.getAccessToken();
                            const token = tokenResponse.token;

                            if (!token) throw new Error("Failed to get token from Application Default Credentials");

                            const modelId = 'imagen-3.0-generate-002';
                            const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${modelId}:predict`;

                            const response = await fetch(endpoint, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    instances: [
                                        { prompt }
                                    ],
                                    parameters: {
                                        sampleCount: 1,
                                        aspectRatio: "1:1",
                                        outputOptions: {
                                            mimeType: "image/png"
                                        }
                                    }
                                })
                            });

                            if (!response.ok) {
                                const errText = await response.text();
                                throw new Error(`Vertex AI API Error: ${errText}`);
                            }

                            const data = await response.json();
                            if (data.predictions && data.predictions.length > 0) {
                                const base64Image = data.predictions[0].bytesBase64Encoded;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ imageBase64: base64Image, mimeType: 'image/png' }));
                            } else {
                                throw new Error("No predictions returned from Imagen 3");
                            }
                        } catch (error: any) {
                            console.error('Vertex Proxy Error:', error);
                            res.statusCode = 500;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ error: error.message }));
                        }
                    });
                    return;
                }
                next();
            });
        }
    };
}
