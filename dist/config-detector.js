"use strict";
/**
 * AI-powered configuration detection from sample data
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectConfigFromQueries = detectConfigFromQueries;
const openai_1 = __importDefault(require("openai"));
/**
 * Detect configuration from sample queries using AI
 *
 * @param queries - Sample queries from input file
 * @param apiKey - OpenAI API key
 * @param sampleSize - Number of queries to analyze (default: 20)
 * @returns Detected configuration
 */
async function detectConfigFromQueries(queries, apiKey, sampleSize = 20) {
    const client = new openai_1.default({ apiKey });
    // Take sample of queries
    const sampleQueries = queries
        .slice(0, sampleSize)
        .map(q => q.query)
        .join('\n');
    const prompt = `Analyze these search queries and detect:
1. Language (ISO 639-1 code: en, de, es, fr, etc.)
2. Geographic location/market (city and country)
3. Target domain (if any domain name appears frequently in queries)

Search Queries:
${sampleQueries}

Return ONLY a JSON object in this exact format:
{
  "language": "de",
  "location": "Vienna, Austria",
  "targetDomain": "example.com",
  "confidence": "high"
}

Rules:
- language: 2-letter ISO code
- location: "City, Country" format
- targetDomain: domain without protocol (or null if none detected)
- confidence: "high" if very clear, "medium" if somewhat clear, "low" if guessing

Respond with ONLY the JSON object, no explanations.`;
    const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'system',
                content: 'You are a data analyst expert at detecting language, location, and domain from search queries. Return only valid JSON.',
            },
            {
                role: 'user',
                content: prompt,
            },
        ],
        temperature: 0.1,
    });
    const content = response.choices[0]?.message?.content;
    if (!content) {
        throw new Error('No response from AI config detection');
    }
    // Parse JSON response
    try {
        const detected = JSON.parse(content);
        return detected;
    }
    catch (error) {
        throw new Error(`Failed to parse AI response: ${content}`);
    }
}
