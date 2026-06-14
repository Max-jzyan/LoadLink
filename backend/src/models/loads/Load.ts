import { Schema, model, InferSchemaType, Types } from "mongoose";
import { LOAD_STATUSES, TRUCK_TYPES } from "../enums";

const CoordinateSchema = new Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

const RouteSegmentSchema = new Schema(
  {
    polyline: { type: String, required: true }, // encoded polyline
    distanceKm: { type: Number, required: true },
    durationHours: { type: Number, required: true },
  },
  { _id: false }
);

const LoadSchema = new Schema(
  {
    companyId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    assignedDriverId: {
      type: Types.ObjectId,
      ref: "User",
      default: null,
    },

    // -----------------------------
    // ORIGIN / DESTINATION
    // -----------------------------
    originAddress: { type: String, required: true },
    destinationAddress: { type: String, required: true },

    originCoords: { type: CoordinateSchema, required: true },
    destinationCoords: { type: CoordinateSchema, required: true },

    // -----------------------------
    // TIMING
    // -----------------------------
    pickupTime: { type: Date, required: true },
    dropoffTime: { type: Date, required: true },

    // -----------------------------
    // LOAD DETAILS
    // -----------------------------
    weightLbs: { type: Number, required: true },
    commodity: { type: String, required: true },

    truckType: {
      type: String,
      enum: TRUCK_TYPES,
      required: true,
    },

    trailerLengthFt: { type: Number, required: true },
    certifications: [{ type: String }], // e.g., ["Reefer HACCP", "HazMat Class A"]
    driverAssist: { type: Boolean, default: false },

    // -----------------------------
    // ROUTE (for /loads/:loadId/route)
    // -----------------------------
    route: {
      type: RouteSegmentSchema,
      required: false, // generated after geocoding
    },

    // -----------------------------
    // AUCTION LINKAGE
    // -----------------------------
    auctionId: {
      type: Types.ObjectId,
      ref: "Auction",
      default: null,
    },

    // -----------------------------
    // STATUS
    // -----------------------------
    status: {
      type: String,
      enum: LOAD_STATUSES,
      default: "draft",
    },

    // -----------------------------
    // METADATA
    // -----------------------------
    createdBy: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export type Load = InferSchemaType<typeof LoadSchema>;
export const LoadModel = model("Load", LoadSchema);
