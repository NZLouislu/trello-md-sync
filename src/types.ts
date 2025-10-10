export interface SyncToProjectOptions {
  projectId: string;
  token: string;
  includesNote?: boolean;
  itemMapping?: (item: any) => any;
}

export interface SyncResult {
  success: boolean;
  processedFiles: number;
  syncedItems: number;
  errors: LogEntry[];
}

export interface Story {
  title: string;
  status: string;
  content: string;
  fileName: string;
  storyId: string;
}

export interface TodoItem {
  state: 'OPEN' | 'CLOSED';
  title: string;
  body: string;
  url?: string;
}

export interface Logger {
  log(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

export interface LogEntry {
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: string;
  args: any[];
}

export interface ResultWithLogs<T> {
  result: T;
  logs: LogEntry[];
}

export interface ProjectToMdResult {
    success: boolean;
    outputDir: string;
    files: string[];
    errors: LogEntry[];
}

export interface MdToProjectResult {
    success: boolean;
    processedFiles: number;
    storyCount: number;
    todoCount: number;
    errors: LogEntry[];
}

export const createMemoryLogger = (): { logger: Logger, getLogs: () => LogEntry[] } => {
  const logs: LogEntry[] = [];
  const logger: Logger = {
    log: (message: string, ...args: any[]) => logs.push({ level: 'log', message, args }),
    info: (message: string, ...args: any[]) => logs.push({ level: 'info', message, args }),
    warn: (message: string, ...args: any[]) => logs.push({ level: 'warn', message, args }),
    error: (message: string, ...args: any[]) => logs.push({ level: 'error', message, args }),
    debug: (message: string, ...args: any[]) => logs.push({ level: 'debug', message, args }),
  };
  return { logger, getLogs: () => logs };
};