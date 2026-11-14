/* tslint:disable */
/* eslint-disable */

export class SparkleEngine {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Full analytics suite from Excel binary slice
     */
    analyzeExcel(file_bytes: Uint8Array | number[], top_categories?: number | null): any;
    /**
     * Strategic RICE prioritization ranking
     */
    calculateRicePrioritization(initiatives_json: string): any;
    /**
     * Risk matrix calculation and categorization
     */
    calculateRiskMatrix(risks_json: string): any;
    /**
     * Price elasticity scatter points
     */
    computeElasticity(file_bytes: Uint8Array | number[], year?: number | null): any;
    /**
     * Margin vs Sales scatter map
     */
    computeMargMap(file_bytes: Uint8Array | number[], year?: number | null): any;
    /**
     * Category profit dynamics over multiple years
     */
    computeProfitBars(file_bytes: Uint8Array | number[], top_number?: number | null): any;
    /**
     * Volume & price seasonality matrices (12 months)
     */
    computeSeasonality(file_bytes: Uint8Array | number[]): any;
    /**
     * Monthly sales & margin time-series
     */
    computeTimeSeries(file_bytes: Uint8Array | number[]): any;
    /**
     * VMPC-INO Waterfall factor analysis
     */
    computeVmpcIno(file_bytes: Uint8Array | number[]): any;
    /**
     * Fast client-side attribute extraction from receipt strings
     */
    extractAttributes(text_input: string): any;
    constructor();
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_sparkleengine_free: (a: number, b: number) => void;
    readonly sparkleengine_analyzeExcel: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly sparkleengine_calculateRicePrioritization: (a: number, b: number, c: number) => [number, number, number];
    readonly sparkleengine_calculateRiskMatrix: (a: number, b: number, c: number) => [number, number, number];
    readonly sparkleengine_computeElasticity: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly sparkleengine_computeMargMap: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly sparkleengine_computeProfitBars: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly sparkleengine_computeSeasonality: (a: number, b: number, c: number) => [number, number, number];
    readonly sparkleengine_computeTimeSeries: (a: number, b: number, c: number) => [number, number, number];
    readonly sparkleengine_computeVmpcIno: (a: number, b: number, c: number) => [number, number, number];
    readonly sparkleengine_extractAttributes: (a: number, b: number, c: number) => [number, number, number];
    readonly sparkleengine_new: () => number;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
