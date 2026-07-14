import { MongoClient, Db } from "mongodb";
export declare function connectToDatabase(): Promise<{
    client: MongoClient;
    db: Db;
}>;
export declare function getDb(): Db;
export declare function closeDatabaseConnection(): Promise<void>;
//# sourceMappingURL=db.d.ts.map