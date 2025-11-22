/**
 * Configuration management
 */
import { Config } from './types';
export declare const GSC_HEADERS: string[];
/**
 * Load configuration from TOML file and .env
 */
export declare const loadConfig: () => Config;
