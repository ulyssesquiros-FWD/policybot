const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  jwt: {
    secret: process.env.JWT_SECRET || 'policybot_hr_dev_secret_key_costa_rica_2026_secure',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h'
  },
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 900000),
    max: Number(process.env.RATE_LIMIT_MAX || 500)
  },
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'policybot_rrhh'
  },
  deepseek: {
    apiKey: (process.env.DEEPSEEK_API_KEY || '').trim(),
    secondaryApiKey: (process.env.DEEPSEEK_SECONDARY_API_KEY || '').trim(),
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
    timeoutMs: Number(process.env.DEEPSEEK_TIMEOUT_MS || 15000),
    maxTokens: Number(process.env.DEEPSEEK_MAX_TOKENS || 1200),
    temperature: Number(process.env.DEEPSEEK_TEMPERATURE || 0.2)
  },
  rag: {
    qdrantUrl: process.env.QDRANT_URL || 'http://127.0.0.1:6333',
    qdrantApiKey: (process.env.QDRANT_API_KEY || '').trim(),
    qdrantCollection: process.env.QDRANT_COLLECTION || 'policybot_hr_docs',
    vectorSize: Number(process.env.QDRANT_VECTOR_SIZE || 1024),
    distance: process.env.QDRANT_DISTANCE || 'Cosine',
    allowLocalVectorFallback: process.env.RAG_ALLOW_LOCAL_VECTOR_FALLBACK === 'true',
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    ollamaEmbeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || 'bge-m3',
    similarityThreshold: Number(process.env.RAG_SIMILARITY_THRESHOLD || 0.35),
    topK: Number(process.env.RAG_TOP_K || 5)
  },
  googleDrive: {
    clientId: (process.env.GOOGLE_CLIENT_ID || '').trim(),
    clientSecret: (process.env.GOOGLE_CLIENT_SECRET || '').trim(),
    redirectUri: (process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/documents/drive/callback').trim(),
    tokenEncryptionKey: (process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || '').trim(),
    folderId: (process.env.GOOGLE_DRIVE_FOLDER_ID || '').trim(),
    serviceAccountEmail: (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim(),
    privateKey: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim(),
    credentialsPath: (process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim()
  },
  cron: {
    schedule: process.env.CRON_SCHEDULE || '0 7 * * *',
    timezone: process.env.CRON_TIMEZONE || 'America/Costa_Rica'
  },
  paths: {
    root: path.resolve(__dirname, '../../..'),
    policiesDir: path.resolve(__dirname, '../../../database/policies'),
    dataDir: path.resolve(__dirname, '../../data')
  }
};
