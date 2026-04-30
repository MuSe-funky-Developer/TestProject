const log = (level, msg, ctx = {}) =>
  console[level](JSON.stringify({ level, msg, ts: new Date().toISOString(), ...ctx }));

export const logger = {
  info: (msg, ctx) => log('info', msg, ctx),
  warn: (msg, ctx) => log('warn', msg, ctx),
  error: (msg, ctx) => log('error', msg, ctx),
};

export function installGlobalErrorHandler(win) {
  win.addEventListener('error', (e) =>
    logger.error('uncaught', { message: e.message, source: e.filename, line: e.lineno }),
  );
  win.addEventListener('unhandledrejection', (e) =>
    logger.error('unhandled-rejection', { reason: String(e.reason) }),
  );
}
