const log = (level, msg, ctx = {}) =>
  console[level](JSON.stringify({ level, msg, ts: new Date().toISOString(), ...ctx }));

export const logger = {
  info: (m, c) => log('info', m, c),
  warn: (m, c) => log('warn', m, c),
  error: (m, c) => log('error', m, c),
};

export function installGlobalErrorHandler(win) {
  win.addEventListener('error', (e) =>
    logger.error('uncaught', { message: e.message, source: e.filename, line: e.lineno }),
  );
  win.addEventListener('unhandledrejection', (e) =>
    logger.error('unhandled-rejection', { reason: String(e.reason) }),
  );
}
