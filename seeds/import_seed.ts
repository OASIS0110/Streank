import Database from 'better-sqlite3';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';

dotenv.config();

const dbPath = process.env.DATABASE;

if (!dbPath) {
  console.error('DATABASE environment variable is not set.');
  process.exit(1);
}

const db = new Database(dbPath);

const csvFilePath = './seeds/csv/youtubers.csv';

try {
  const csvData = fs.readFileSync(csvFilePath, 'utf8');
  const records = parse(csvData, {
    columns: true,
    skip_empty_lines: true,
  });

  const insertStmt = db.prepare('INSERT INTO youtubers (id, name, handle_name, channel_id) VALUES (?, ?, ?, ?)');

  db.transaction(() => {
    for (const record of records) {
      insertStmt.run(
        parseInt(record.id, 10),
        record.name,
        record.handle_name,
        record.channel_id
      );

    }
  })();

  console.log(`Successfully imported ${records.length} records into the youtubers table.`);

} catch (error) {
  console.error('Error importing data:', error);
} finally {
  db.close();
}
