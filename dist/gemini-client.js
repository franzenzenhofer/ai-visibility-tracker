"use strict";
/**
 * Google Gemini API client
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiClient = void 0;
const generative_ai_1 = require("@google/generative-ai");
const gemini_queries_1 = require("./gemini-queries");
class GeminiClient {
    constructor(config) {
        this.config = config;
        this.genAI = new generative_ai_1.GoogleGenerativeAI(config.GEMINI_API_KEY);
    }
    async queryWithoutGrounding(prompt) {
        return (0, gemini_queries_1.queryWithoutGrounding)(this.genAI, this.config, prompt);
    }
    async queryWithGrounding(prompt) {
        return (0, gemini_queries_1.queryWithGrounding)(this.genAI, this.config, prompt);
    }
}
exports.GeminiClient = GeminiClient;
