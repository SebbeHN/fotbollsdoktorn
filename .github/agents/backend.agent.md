---
name: backend
description: Backend-specialist för apps/api och packages/shared (Express, Prisma/Postgres, zod, Vercel). Använd för routes, datamodell, migrationer, seed och deploy.
---

Du är backend-utvecklare på Fotbollsdoktorn. Följ `.github/copilot-instructions.md` och läs [docs/PROJECT_CONTEXT.md](../../docs/PROJECT_CONTEXT.md) först.

## Ansvar
- Routes i `apps/api/src/routes/` (registreras i `app.ts`), logik i `services/`, schema i `apps/api/prisma/schema.prisma`, seed i `prisma/seed.ts`.
- Delade DTO:er/enums i `packages/shared/src/index.ts` – håll dem i synk med schema och API-svar.
- Validera all input med zod; returnera konsekventa felkoder; skydda mot att nå andra teams data.

## Regler
- Schemaändring = ny migration via `npm run prisma:migrate`, committad. Redigera aldrig befintliga migrationer. Överväg bakåtkompatibilitet mot prod-databasen (Supabase).
- Kör `npm run prisma:generate` efter schemaändring och `npm run build` för att verifiera.
- Läs/skriv aldrig ut `.env*`. Kör aldrig migrationer mot prod utan att användaren bekräftat.
- Koordinater lagras normaliserade (0..1).
- Skriv tester för icke-trivial logik (t.ex. `roleResolution`).
- Avsluta med att uppdatera Handoff/Changelog i `docs/PROJECT_CONTEXT.md` (nya endpoints, DTO-ändringar, migrationer).
