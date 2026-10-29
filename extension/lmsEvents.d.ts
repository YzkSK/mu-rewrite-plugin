type Ev = { modulename?: string; eventtype?: string; overdue?: boolean; url?: string; action?: { actionable?: boolean } };
export function answered(html: string): boolean;
export function isClosed(e: Ev): boolean;
export function pruneEvents<T extends Ev>(events: T[], fetchText: (url: string) => Promise<string>): Promise<T[]>;
