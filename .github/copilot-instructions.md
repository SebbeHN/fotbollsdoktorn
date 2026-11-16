# Fotbollsdoktorn – Copilot-instruktioner

Verktyg för fotbollstränare: trupp, laguppställningar, taktiska roller och **fasta situationer** (hörnor, frisparkar, inkast) som ritas upp på en plan, spelas upp i steg och presenteras/exporteras till PDF. Språk i UI och domänbegrepp: **svenska**. Kod, identifierare och commit-meddelanden: engelska.

## Obligatoriskt arbetssätt: bevara kontext

Agenter har inget minne mellan sessioner. Allt som ska överleva står i repot.

1. **Börja alltid** med att läsa [docs/PROJECT_CONTEXT.md](../docs/PROJECT_CONTEXT.md) (status, beslut, backlog, öppna frågor).
2. **Avsluta alltid** uppgiften med att uppdatera den filen: flytta klara punkter, lägg till nya beslut (med *varför*), nya öppna frågor och nästa steg. Håll den kort – ta bort föråldrat istället för att låta den växa.
3. Vid överlämning mellan agenter: skriv en kort handoff (mål, vad som är gjort, filer som berörts, vad som återstår) under "Handoff" i kontextfilen.
4. Gissa inte om något är oklart eller motsäger kontextfilen – fråga användaren.
5. Referensbilderna i `facit fasta/` visar hur fasta situationer ska se ut och bete sig. Läs dem vid arbete på editor/presentation.

## Team

Använd rätt specialist (se `.github/agents/`). `lead` koordinerar och delegerar.

| Agent | Ansvar |
|---|---|
| `lead` | Produktägare/tech lead: bryter ner mål, prioriterar backlog, delegerar, håller kontextfilen aktuell |
| `frontend` | React-sidor, komponenter, React Query-hooks, Zustand, Tailwind, UX |
| `backend` | Express-routes, Prisma-schema/migrationer, zod-validering, seed, deploy |
| `set-piece-editor` | Planeditorn (Konva), steg/rörelser/zoner, presentation, PDF-export |
| `qa-reviewer` | Granskar ändringar, kör build/lint, hittar buggar och regressioner (skriver ej kod) |

## Arkitektur

npm workspaces-monorepo (Node >= 20):

- `apps/api` – Express 4 + Prisma 5 (PostgreSQL/Supabase). Routes i `src/routes/`, domänlogik i `src/services/`. Valideras med zod.
- `apps/web` – React 19 + Vite + TypeScript + Tailwind 3, React Query (server state), Zustand (UI state i `state/appStore.ts`), React Router 6, Konva/react-konva (plan), jsPDF (export). Lint: oxlint.
- `packages/shared` – delade enums/DTO:er för api och web. Inga Express/React/Prisma-importer här.
- `api/index.ts` – Vercel serverless-entry som återanvänder Express-appen. `vercel.json` skickar `/api/*` dit.

Flöde för en ny datafunktion: Prisma-modell + migration → route + zod → DTO i `shared` → typer/hook i `apps/web/src/api/` → UI.

## Kommandon (kör från repo-roten)

- `npm run dev:api` / `npm run dev:web` – utvecklingsservrar
- `npm run build` – bygger shared, api och web i ordning (**måste passera före färdig**)
- `npm run lint --workspace=@fotbollsdoktorn/web`
- `npm run prisma:generate` · `npm run prisma:migrate` (lokalt, skapar migration) · `npm run prisma:deploy` (prod) · `npm run seed`

Det finns inga automatiska tester ännu. Verifiera med build + lint och manuellt i webbläsaren; lägg till tester när logik är icke-trivial (t.ex. `services/roleResolution.ts`).

## Konventioner

- Koordinater på planen är **normaliserade 0..1** (`NormalizedPoint`), aldrig pixlar, i databas och API.
- Ändra aldrig en DTO/enum på ett ställe – uppdatera `packages/shared` så api och web följer med.
- Schemaändringar kräver alltid en Prisma-migration (committad). Redigera aldrig gamla migrationer.
- Runtime använder `DATABASE_URL` (pooler), migrationer `DIRECT_URL`.
- Server state via React Query-hooks i `api/hooks.ts`; lägg inte fetch direkt i komponenter.
- Single-team MVP: första teamet och dess standardlineup väljs i `App.tsx` (ingen inloggning ännu).
- Små, fokuserade ändringar; följ befintlig stil. Inga kommentarer utom där koden behöver förklaras.
- UI-texter på svenska; routes är svenska (`/trupp`, `/fasta-situationer`, …).

## Säkerhet

- Läs, skriv ut eller committa aldrig `.env*`-filer eller hemligheter (de är gitignorerade). Referera bara till variabelnamn.
- Validera all inkommande data i API:t med zod.
