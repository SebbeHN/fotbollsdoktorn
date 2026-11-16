# Projektkontext (levande dokument)

> Alla agenter: läs först, uppdatera sist. Håll kort och aktuellt. Datum i format ÅÅÅÅ-MM-DD.

## Vision
En app där tränare bygger upp sin trupp och laguppställning, definierar roller och skapar/presenterar fasta situationer visuellt, så att spelare förstår sina uppgifter.

## Nuläge (2026-11-16)
- Fungerar/finns: Dashboard, Trupp, Laguppställningar, Roller, Bibliotek för fasta situationer, Editor (Konva-plan, steg, rörelser, zoner, roller), Presentation, PDF-export, deploy på Vercel + Supabase.
- Stub: `Matches` (10 rader). Schemat har `Match`, `MatchSquad`, `MatchSetPiece`, `Opponent`, `OpponentPlayer`, `SetPieceOverride`, `Tag`, `SetPieceVariantVersion` men API-routes/UI saknas för flera av dem.
- Ingen inloggning (single-team MVP). Inga automatiska tester.

## Backlog (prioriterad, högst först)
1. Jämför app mot referensbilderna i `facit fasta/` och lista avvikelser (UX/utseende/beteende) – *lead + set-piece-editor*
2. Bygg ut Matcher: skapa match, välj trupp, koppla fasta situationer, motståndare – *backend + frontend*
3. Overrides (match/spelare/lineup) och versionshistorik för varianter – *backend + set-piece-editor*
4. Taggar/sök/filter i biblioteket – *frontend*
5. Inloggning och roller (HEAD_COACH, ASSISTANT_COACH, SET_PIECE_COACH, PLAYER) – *backend + frontend*
6. Tester för `roleResolution` och kritiska routes – *qa-reviewer + backend*

## Beslut (med motivering)
- 2026-08: Monorepo med npm workspaces och delad `shared` så API och UI delar typer.
- 2026-08: Normaliserade koordinater (0..1) så uppställningar är oberoende av skärmstorlek och PDF-format.
- 2026-08: Express återanvänds som Vercel serverless function (`api/index.ts`) istället för separat server.
- 2026-08: Supabase Postgres via pooler (runtime) och direkt anslutning (migrationer).

## Öppna frågor till användaren
- Vilka funktioner är viktigast härnäst och vem är primär användare (huvudtränare, fasta-situationstränare, spelare)?
- Ska spelare ha egen läs-vy/inloggning?
- Är `facit fasta/` exakt målbild eller inspiration?

## Handoff (senaste överlämning)
_Tom. Skriv: mål · gjort · berörda filer · kvar att göra._

## Changelog (kort, senaste överst)
- 2026-11-16: Satte upp Copilot-instruktioner, agentteam och detta kontextdokument.
