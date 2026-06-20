import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!.trim());
    try {
        console.log('Fetching available models for this API key...');
        const request = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY!.trim()}`);
        const response = await request.json();
        
        if (response.models) {
            console.log('Available Models:');
            response.models.forEach((model: any) => {
                console.log(`- ${model.name} (supports: ${model.supportedGenerationMethods.join(', ')})`);
            });
        } else {
            console.log('Unexpected response:', response);
        }
    } catch (e) {
        console.error('Error listing models:', e);
    }
}

listModels();
