import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
    console.error("No VITE_GEMINI_API_KEY found in .env");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function testImagen() {
    try {
        console.log("Testing Imagen 3 via Google AI Studio API...");
        const response = await ai.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: 'A professional studio shot of a toaster',
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
                aspectRatio: "1:1"
            }
        });

        const base64Image = response.generatedImages[0].image.imageBytes;
        console.log(`✅ SUCCESS! Received Base64 generated image. Length: ${base64Image.length}`);
    } catch (error) {
        console.error("❌ FAILED with imagen-3.0-generate-002:", error.message);

        try {
            console.log("\nRetrying with imagen-3.0-generate-001...");
            const response2 = await ai.models.generateImages({
                model: 'imagen-3.0-generate-001',
                prompt: 'A professional studio shot of a toaster',
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/png',
                    aspectRatio: "1:1"
                }
            });
            const base64Image2 = response2.generatedImages[0].image.imageBytes;
            console.log(`✅ SUCCESS! Received Base64 generated image. Length: ${base64Image2.length}`);
        } catch (error2) {
            console.error("❌ FAILED with imagen-3.0-generate-001:", error2.message);
        }
    }
}

testImagen();
