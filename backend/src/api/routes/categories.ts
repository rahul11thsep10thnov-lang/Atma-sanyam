import { Router } from "express";
import { FEED_FILTER_CATEGORIES } from "../../data/categories";

export const categoriesRouter = Router();

categoriesRouter.get("/", (_req, res) => {
  res.json({ categories: FEED_FILTER_CATEGORIES });
});
