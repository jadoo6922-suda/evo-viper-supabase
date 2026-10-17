# Server architecture

```
src/server/
├── createApp.ts           Express app factory
├── config/                env, CORS origins, security headers, Supabase admin client
├── middleware/            auth, rate-limit, cors
├── services/              hmac, pin, admin-gate, ocr
├── routes/                API registration (index.ts) + domain modules
└── lib/                   validators, errors, crypto helpers
```

Root `server.ts` only boots the process.
