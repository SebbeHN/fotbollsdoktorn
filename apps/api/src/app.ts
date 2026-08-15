import express from "express";
import cors from "cors";
import { teamsRouter } from "./routes/teams";
import { playersRouter, teamPlayersRouter } from "./routes/players";
import { positionsRouter } from "./routes/positions";
import { tacticalRolesRouter, teamTacticalRolesRouter } from "./routes/tacticalRoles";
import { lineupsRouter, teamLineupsRouter } from "./routes/lineups";
import { setPieceCategoriesRouter, teamSetPieceCategoriesRouter } from "./routes/setPieceCategories";
import { setPiecesRouter, categorySetPiecesRouter } from "./routes/setPieces";
import {
  setPieceVariantsRouter,
  setPieceVariantsForSetPieceRouter,
  setPieceRolesRouter,
  variantRolesRouter,
} from "./routes/setPieceVariants";
import { variantStagesRouter, stagesRouter, movementsRouter } from "./routes/stages";
import { variantZonesRouter, zonesRouter } from "./routes/zones";

export const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Teams & nested resources
app.use("/api/teams/:teamId/players", teamPlayersRouter);
app.use("/api/teams/:teamId/tactical-roles", teamTacticalRolesRouter);
app.use("/api/teams/:teamId/lineups", teamLineupsRouter);
app.use("/api/teams/:teamId/set-piece-categories", teamSetPieceCategoriesRouter);
app.use("/api/teams", teamsRouter);

// Flat resources
app.use("/api/players", playersRouter);
app.use("/api/positions", positionsRouter);
app.use("/api/tactical-roles", tacticalRolesRouter);
app.use("/api/lineups", lineupsRouter);
app.use("/api/set-piece-categories/:categoryId/set-pieces", categorySetPiecesRouter);
app.use("/api/set-piece-categories", setPieceCategoriesRouter);
app.use("/api/set-pieces/:setPieceId/variants", setPieceVariantsForSetPieceRouter);
app.use("/api/set-pieces", setPiecesRouter);
app.use("/api/variants/:variantId/roles", variantRolesRouter);
app.use("/api/variants/:variantId/stages", variantStagesRouter);
app.use("/api/variants/:variantId/zones", variantZonesRouter);
app.use("/api/variants", setPieceVariantsRouter);
app.use("/api/roles", setPieceRolesRouter);
app.use("/api/stages", stagesRouter);
app.use("/api/movements", movementsRouter);
app.use("/api/zones", zonesRouter);

// Not found + error handling
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});
