export type Logger = Pick<typeof console, 'debug' | 'error' | 'info' | 'log' | 'warn' | 'trace'>;

type LogFunction = (...data: any[]) => void;

function nop(...data: any[]) {}
function MakeSafeLoggerFunction(fn: LogFunction | undefined) {
  if (typeof fn === 'function') return fn;
  return nop;
}

function MakeAnnotatedLoggerFunction(fn: LogFunction, annotation: string) {
  return (...data: any[]) => {
    if (typeof data[0] === 'string') fn(`[${annotation}] ${data[0]}`, ...data.slice(1));
    else fn(`[${annotation}]`, ...data);
  };
}

function MakeLoggerFunction(fn: LogFunction | undefined, annotation?: string) {
  const safeFunction = MakeSafeLoggerFunction(fn);
  if (annotation) return MakeAnnotatedLoggerFunction(safeFunction, annotation);
  else return safeFunction;
}

export function MakeLogger(logger: Partial<Logger>, annotation?: string): Logger {
  return {
    debug: MakeLoggerFunction(logger.debug, annotation),
    error: MakeLoggerFunction(logger.error, annotation),
    info: MakeLoggerFunction(logger.info, annotation),
    log: MakeLoggerFunction(logger.log, annotation),
    trace: MakeLoggerFunction(logger.trace, annotation),
    warn: MakeLoggerFunction(logger.warn, annotation),
  };
}
