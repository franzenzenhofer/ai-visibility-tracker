"use strict";
/**
 * Google Gemini API client
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiClient = void 0;
const generative_ai_1 = require("@google/generative-ai");
const logger_1 = require("./logger");
const utils_1 = require("./utils");
const constants_1 = require("./constants");
class GeminiClient {
    constructor(config) {
        this.logger = (0, logger_1.getLogger)();
        this.config = config;
        this.genAI = new generative_ai_1.GoogleGenerativeAI(config.GEMINI_API_KEY);
    }
    /**
     * Query Gemini without grounding (pure model knowledge, no search)
     *
     * @param prompt - User prompt/persona to query
     * @returns Array of SERP results or null if query fails
     */
    async queryWithoutGrounding(prompt) {
        try {
            const textPrompt = (0, utils_1.replacePromptPlaceholders)(this.config.PROMPTS.GEMINI_SEARCH_NO_GROUNDING, this.config.USER_LOCATION, prompt);
            this.logger.logRequest('Gemini NoGrounding', this.config.MODEL_GEMINI, textPrompt);
            const model = this.genAI.getGenerativeModel({
                model: this.config.MODEL_GEMINI,
            });
            const result = await model.generateContent({
                contents: [
                    {
                        role: 'user',
                        parts: [
                            {
                                text: textPrompt,
                            },
                        ],
                    },
                ],
                generationConfig: {
                    temperature: constants_1.MODEL_TEMPERATURE.LOW,
                },
            });
            const response = await result.response;
            // Log RAW API response for transparency
            this.logger.logRawResponse('Gemini NoGrounding', response);
            const text = response.text();
            this.logger.logResponse('Gemini NoGrounding', text ? 'SUCCESS' : 'EMPTY', text);
            return (0, utils_1.parseSerpJson)(text);
        }
        catch (error) {
            this.logger.logError('Gemini No Grounding', error);
            return null;
        }
    }
    /**
     * Query Gemini with grounding (Google Search enabled)
     *
     * @param prompt - User prompt/persona to query
     * @returns Array of SERP results or null if query fails
     */
    async queryWithGrounding(prompt) {
        try {
            const textPrompt = (0, utils_1.replacePromptPlaceholders)(this.config.PROMPTS.GEMINI_SEARCH_WITH_GROUNDING, this.config.USER_LOCATION, prompt);
            this.logger.logRequest('Gemini WithGrounding', this.config.MODEL_GEMINI, textPrompt, { googleSearch: true });
            const model = this.genAI.getGenerativeModel({
                model: this.config.MODEL_GEMINI,
                tools: [
                    {
                        googleSearch: {},
                    },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ], // Google Search grounding for Gemini 2.5 (undocumented type)
            });
            const result = await model.generateContent({
                contents: [
                    {
                        role: 'user',
                        parts: [
                            {
                                text: textPrompt,
                            },
                        ],
                    },
                ],
                generationConfig: {
                    temperature: constants_1.MODEL_TEMPERATURE.LOW,
                },
            });
            const response = await result.response;
            // Log RAW API response for transparency
            this.logger.logRawResponse('Gemini WithGrounding', response);
            const text = response.text();
            this.logger.logResponse('Gemini WithGrounding', text ? 'SUCCESS' : 'EMPTY', text);
            // Try to extract actual URLs from grounding metadata
            const groundingResults = (0, utils_1.extractGeminiGroundingUrls)(response);
            if (groundingResults && groundingResults.length > 0) {
                return groundingResults;
            }
            // Fallback to parsing JSON from text
            return (0, utils_1.parseSerpJson)(text);
        }
        catch (error) {
            this.logger.logError('Gemini With Grounding', error);
            return null;
        }
    }
}
exports.GeminiClient = GeminiClient;
