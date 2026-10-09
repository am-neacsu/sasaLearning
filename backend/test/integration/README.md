# Integration tests

Integration tests intentionally require a separate PostgreSQL database. Set `TEST_DATABASE_URL` in a local test environment, apply migrations to that database, and add `*.test.js` files here. Never point integration tests at the development or production Supabase database.

Example Windows PowerShell setup:

```powershell
$env:DATABASE_URL=$env:TEST_DATABASE_URL
npx prisma migrate deploy
npm run test:integration
```
