import { Schema, Types } from "mongoose";

/** Per‑category ratings */
export const RatingCategoriesSchema = new Schema(
  {
    timeliness: { type: Number, default: 0, min: 0, max: 5 },
    communication: { type: Number, default: 0, min: 0, max: 5 },
    reliability: { type: Number, default: 0, min: 0, max: 5 },
    professionalism: { type: Number, default: 0, min: 0, max: 5 },
    documentationAccuracy: { type: Number, default: 0, min: 0, max: 5 },
  },
  { _id: false }
);

/** Aggregated rating summary */
export const RatingSummarySchema = new Schema(
  {
    average: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },
    categories: { type: RatingCategoriesSchema, default: () => ({}) },
    lastUpdatedAt: { type: Date, default: null },
  },
  { _id: false }
);

/** TypeScript types */
export type RatingCategories = {
  timeliness: number;
  communication: number;
  reliability: number;
  professionalism: number;
  documentationAccuracy: number;
};

export type RatingSummary = {
  average: number;
  totalReviews: number;
  categories: RatingCategories;
  lastUpdatedAt: Date | null;
};
