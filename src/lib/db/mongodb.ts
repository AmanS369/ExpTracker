import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

let memoryServerInstance: any = null;

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = (async () => {
      let uri = process.env.MONGODB_URI;

      if (!uri) {
        // Fallback to in-memory mongodb for local development and testing
        try {
          const { MongoMemoryServer } = await import("mongodb-memory-server");
          if (!memoryServerInstance) {
            memoryServerInstance = await MongoMemoryServer.create();
          }
          uri = memoryServerInstance.getUri();
          console.log("[MongoDB] Using MongoMemoryServer at:", uri);
        } catch (memErr) {
          console.error("[MongoDB] Failed to start MongoMemoryServer:", memErr);
          throw new Error("MONGODB_URI is not set and MongoMemoryServer could not start.");
        }
      }

      if (!uri) {
        throw new Error("MONGODB_URI could not be determined.");
      }

      const opts: mongoose.ConnectOptions = {
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 8000,
      };

      const conn = await mongoose.connect(uri, opts);
      return conn;
    })();
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
}
