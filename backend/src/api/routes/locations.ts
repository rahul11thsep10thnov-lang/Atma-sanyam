import { Router } from "express";
import { INDIA_STATES } from "../../data/indiaLocations";
import { HttpError } from "../../middleware/errorHandler";

export const locationsRouter = Router();

locationsRouter.get("/states", (_req, res) => {
  res.json({
    states: INDIA_STATES.map((s) => ({ name: s.name, isUnionTerritory: s.isUnionTerritory })),
  });
});

locationsRouter.get("/states/:state/districts", (req, res) => {
  const state = INDIA_STATES.find((s) => s.name.toLowerCase() === req.params.state.toLowerCase());
  if (!state) throw new HttpError(404, "State not found");
  res.json({ state: state.name, districts: state.districts });
});
