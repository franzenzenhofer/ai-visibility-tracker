"use strict";
/**
 * Configuration management
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = exports.GSC_HEADERS = void 0;
const dotenv = __importStar(require("dotenv"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const toml = __importStar(require("@iarna/toml"));
dotenv.config();
exports.GSC_HEADERS = [
    'Top queries',
    'Query',
    'Suchanfrage',
    'Keyword',
    'Search term',
];
/**
 * Load configuration from TOML file and .env
 */
const loadConfig = () => {
    // Load API keys from .env
    const apiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not set in .env file');
    }
    if (!geminiKey) {
        throw new Error('GEMINI_API_KEY is not set in .env file');
    }
    // Load other settings from TOML config file
    const configPath = path.join(process.cwd(), 'geo-visibility-config.toml');
    if (!fs.existsSync(configPath)) {
        throw new Error(`Config file not found: ${configPath}\nPlease create geo-visibility-config.toml in the project root.`);
    }
    const configFile = fs.readFileSync(configPath, 'utf-8');
    const tomlConfig = toml.parse(configFile);
    // Extract prompts
    const prompts = tomlConfig.prompts || {};
    // For target_domain and user_location: preserve empty strings from config
    // (they trigger auto-detection in CLI)
    // For language: default to 'en' if empty or undefined
    const targetDomain = tomlConfig.target_domain !== undefined
        ? tomlConfig.target_domain.toLowerCase()
        : '';
    const userLocation = tomlConfig.user_location !== undefined
        ? tomlConfig.user_location
        : '';
    const language = tomlConfig.language || 'en';
    return {
        OPENAI_API_KEY: apiKey,
        GEMINI_API_KEY: geminiKey,
        TARGET_DOMAIN: targetDomain,
        USER_LOCATION: userLocation,
        LANGUAGE: language,
        MODEL_OPENAI: tomlConfig.model_openai || 'gpt-5-mini',
        MODEL_GEMINI: tomlConfig.model_gemini || 'gemini-2.5-flash',
        PROMPTS: {
            OPENAI_PERSONA_SYSTEM: prompts.persona_system || '',
            OPENAI_SEARCH_NO_TOOLS_SYSTEM: prompts.search_openai_no_tools_system || '',
            OPENAI_SEARCH_NO_TOOLS_USER: prompts.search_openai_no_tools_user || '',
            OPENAI_SEARCH_WITH_TOOLS_SYSTEM: prompts.search_openai_with_tools_system || '',
            OPENAI_SEARCH_WITH_TOOLS_USER: prompts.search_openai_with_tools_user || '',
            GEMINI_SEARCH_NO_GROUNDING: prompts.search_gemini_no_grounding || '',
            GEMINI_SEARCH_WITH_GROUNDING: prompts.search_gemini_with_grounding || '',
        },
    };
};
exports.loadConfig = loadConfig;
