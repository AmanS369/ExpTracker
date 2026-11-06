import mongoose from "mongoose";

/**
 * Validates that an ID is a legitimate 24-character hexadecimal MongoDB ObjectId
 */
export function isValidObjectId(id: unknown): id is string {
  if (typeof id !== "string") return false;
  return mongoose.isValidObjectId(id);
}

/**
 * Strips MongoDB operator keys ($gt, $ne, $where, etc.) from plain objects
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== "object") return obj;

  const clean: Record<string, any> = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("$") || key.includes(".")) {
      continue; // drop dangerous keys
    }
    if (value && typeof value === "object") {
      clean[key] = sanitizeObject(value);
    } else {
      clean[key] = value;
    }
  }
  return clean as T;
}

