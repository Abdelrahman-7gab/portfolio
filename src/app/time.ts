/** Year-month pairs for the career trace. Months are 1-12. */
export type YM = readonly [number, number];

const now = new Date();
export const NOW: YM = [now.getFullYear(), now.getMonth() + 1];

/** A year-month as a decimal year, for placing it on the trace axis. */
export const year = ([y, m]: YM) => y + (m - 1) / 12;
/** Months between two year-months, counting both ends, like LinkedIn. */
export const months = (a: YM, b: YM) => b[0] * 12 + b[1] - (a[0] * 12 + a[1]) + 1;
/** "2Y 9M", "1Y", "11M". */
export const duration = (n: number) => (n >= 12 ? `${Math.floor(n / 12)}Y ` : '') + (n % 12 ? `${n % 12}M` : '');
