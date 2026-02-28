import fs from 'fs';
import path from 'path';

async function testGeneration() {
    try {
        console.log("Loading Test Image.png...");
        const imagePath = path.resolve(process.cwd(), 'Test Image.png');
        const imageBuffer = fs.readFileSync(imagePath);
        const base64 = imageBuffer.toString('base64');

        console.log("Image loaded! Sending to local Vite proxy (http://localhost:5173/api/imagen)...");

        const prompt = `A highly professional, e-commerce studio shot of this product on a pure white background. Ultra sharp focus, perfectly lit.
        
[Original Image Data]: data:image/png;base64,${base64}
        `;

        const response = await fetch('http://localhost:5173/api/imagen', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Server returned ${response.status}: ${err}`);
        }

        const data = await response.json();

        if (data.imageBase64) {
            console.log("✅ SUCCESS! Received Base64 generated image from Imagen 3.");
            console.log(`Base64 String Length: ${data.imageBase64.length}`);

            // Save it so the user can look at it
            const outPath = path.resolve(process.cwd(), 'Test_Image_Result.png');
            fs.writeFileSync(outPath, Buffer.from(data.imageBase64, 'base64'));
            console.log(`Saved output to: ${outPath}`);
        } else {
            console.log("❌ Response succeeded but no imageBase64 was found in payload:", data);
        }

    } catch (e) {
        console.error("❌ TEST FAILED:", e);
    }
}

testGeneration();
