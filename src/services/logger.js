const isDevRuntime = () => {
  try {
    return typeof __DEV__ !== 'undefined' && __DEV__;
  } catch (_error) {
    return process.env.NODE_ENV !== 'production';
  }
};

const shouldLogDebug = () => isDevRuntime() || process.env.NODE_ENV !== 'production';

const normalizeMetaValue = (meta) => {
  if (meta instanceof Error) {
    return {
      name: meta.name,
      message: meta.message,
      stack: meta.stack,
    };
  }
  return meta;
};

const normalizeMetaArgs = (metaArgs) => {
  if (!metaArgs || metaArgs.length === 0) {
    return undefined;
  }
  if (metaArgs.length === 1) {
    return normalizeMetaValue(metaArgs[0]);
  }
  return metaArgs.map((item) => normalizeMetaValue(item));
};

const write = (level, message, ...metaArgs) => {
  if (level === 'debug' && !shouldLogDebug()) {
    return;
  }

  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
  };

  const normalizedMeta = normalizeMetaArgs(metaArgs);
  if (normalizedMeta !== undefined) {
    payload.meta = normalizedMeta;
  }

  if (level === 'error') {
    console.error(payload);
    return;
  }

  if (level === 'warn') {
    console.warn(payload);
    return;
  }

  if (level === 'debug') {
    console.debug(payload);
    return;
  }

  console.log(payload);
};

const logger = {
  info: (message, ...metaArgs) => write('info', message, ...metaArgs),
  warn: (message, ...metaArgs) => write('warn', message, ...metaArgs),
  error: (message, ...metaArgs) => write('error', message, ...metaArgs),
  debug: (message, ...metaArgs) => write('debug', message, ...metaArgs),
};

export default logger;
