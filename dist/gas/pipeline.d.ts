import { GasConfig, ProcessedRow } from './models';
export declare const buildRowValues: (query: string, state: ProcessedRow) => (string | number)[];
export declare const processBatch: (cfg: GasConfig, shouldCancel: () => boolean) => {
    done: number;
    errors: number;
};
export declare const processRow: (query: string, cfg: GasConfig, rowIndex: number, prompts: Record<string, string>, onPartial?: (state: ProcessedRow) => void) => ProcessedRow;
