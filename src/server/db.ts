import "server-only";
import { MongoClient, type Db } from "mongodb";

// Reuse the client across hot-reloads in development.
declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined;
}

let _db: Db | undefined;

export async function getDb(): Promise<Db> {
  if (_db) return _db;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set. Add it to your .env file.");

  const client =
    process.env.NODE_ENV === "development"
      ? (global._mongoClient ??= new MongoClient(uri))
      : new MongoClient(uri);

  await client.connect();
  _db = client.db("order-rescue");
  return _db;
}
