# MKMMADI_2026_TYP
2026 Third Year Project

## API deployment environment

The API requires these variables at runtime when `NODE_ENV=production`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
JWT_SECRET=<long-random-secret>
NODE_ENV=production
PORT=4000
ACCESS_TOKEN_EXPIRES=15m
REFRESH_TOKEN_EXPIRES_DAYS=30
```

Set them in the hosting service's environment-variable settings. Do not commit
`API/.env`; it is intentionally ignored. Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The deployment will fail with `JWT_SECRET is required but was not set` until
`JWT_SECRET` is provided to the running API process.
