import { ResultStatus } from '../constants';
export interface GasConfig {
    openaiKey: string;
    geminiKey: string;
    targetDomain: string;
    userLocation: string;
    language: string;
    countryCode: string;
    modelOpenai: string;
    modelGemini: string;
    batchSize: number;
    rateLimitMs: number;
}
export interface SerpResult {
    rank: number;
    domain: string;
    url: string;
}
export interface ProcessedRow {
    personaPrompt: string;
    status: ResultStatus;
    checkStatus: string;
    gptRank: number | string;
    gptUrl: string;
    gptRankWeb: number | string;
    gptUrlWeb: string;
    gemRank: number | string;
    gemUrl: string;
    gemRankWeb: number | string;
    gemUrlWeb: string;
    gptNoAll: string;
    gptWebAll: string;
    gemNoAll: string;
    gemWebAll: string;
    error?: string;
}
