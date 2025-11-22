"use strict";
/**
 * OpenAI API client
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIClient = void 0;
const openai_1 = __importDefault(require("openai"));
const openai_persona_1 = require("./openai-persona");
const openai_queries_1 = require("./openai-queries");
class OpenAIClient {
    constructor(config) {
        this.config = config;
        this.client = new openai_1.default({
            apiKey: config.OPENAI_API_KEY,
        });
    }
    async generatePersona(keyword) {
        return (0, openai_persona_1.generatePersona)(this.client, this.config, keyword);
    }
    async queryWithoutTools(prompt) {
        return (0, openai_queries_1.queryWithoutTools)(this.client, this.config, prompt);
    }
    async queryWithTools(prompt) {
        return (0, openai_queries_1.queryWithTools)(this.client, this.config, prompt);
    }
}
exports.OpenAIClient = OpenAIClient;
