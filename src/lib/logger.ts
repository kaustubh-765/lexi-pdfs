type LogMeta = Record<string, unknown>;
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function currentLevel(): number {
  const configured = (process.env.LOG_LEVEL ?? 'info').toLowerCase() as LogLevel;
  return LEVELS[configured] ?? LEVELS.info;
}

function serializeMeta(meta?: LogMeta): LogMeta | undefined {
  if (!meta) return undefined;
  const { err, ...rest } = meta;
  if (err instanceof Error) {
    return { ...rest, err: { name: err.name, message: err.message, stack: err.stack } };
  }
  return meta;
}

function write(level: LogLevel, module: string, bindings: LogMeta, msg: string, meta?: LogMeta) {
  if (LEVELS[level] < currentLevel()) return;

  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    module,
    msg,
    ...bindings,
    ...serializeMeta(meta),
  });

  if (level === 'warn' || level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}

export interface Logger {
  debug(msg: string, meta?: LogMeta): void;
  info(msg: string, meta?: LogMeta): void;
  warn(msg: string, meta?: LogMeta): void;
  error(msg: string, meta?: LogMeta): void;
  child(bindings: LogMeta): Logger;
}

export function createLogger(module: string, bindings: LogMeta = {}): Logger {
  return {
    debug: (msg, meta) => write('debug', module, bindings, msg, meta),
    info: (msg, meta) => write('info', module, bindings, msg, meta),
    warn: (msg, meta) => write('warn', module, bindings, msg, meta),
    error: (msg, meta) => write('error', module, bindings, msg, meta),
    child: (childBindings) => createLogger(module, { ...bindings, ...childBindings }),
  };
}
