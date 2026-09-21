# plantist

React/Vite frontend with a small Express development backend.

## GitHub Codespaces

```bash
npm install
npm run dev
```

Use the forwarded Vite port. The Vite dev server proxies nothing in this prototype, so API calls are configured through the browser's `/api` path; for local development run both servers as above. If Vite and Express are on separate ports, add a proxy to `vite.config.js` or use the included simple API proxy below.

Account records are created by the Express server in `server/data/accounts.json`, not by browser JSX. Uploaded images go into `server/uploads/`.

This is intentionally a testing architecture. Passwords are hashed with Node `scrypt`, but the JSON database and default session secret are not production authentication. Replace them with a real database/auth provider later.
