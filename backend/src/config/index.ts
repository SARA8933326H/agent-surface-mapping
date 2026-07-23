export const Config = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/surface?schema=public',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  SCREENSHOT_DIR: process.env.SCREENSHOT_DIR || './screenshots',
  REPORT_DIR: process.env.REPORT_DIR || './reports-output',
  OLLAMA_HOST: process.env.OLLAMA_HOST,
  OLLAMA_MODEL: process.env.OLLAMA_MODEL,
  DISABLE_LLM: process.env.DISABLE_LLM === 'true',
};
