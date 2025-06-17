import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DATABASE;

if (!dbPath) {
  console.error('DATABASE environment variable is not set.');
  process.exit(1);
}

type YoutuberData = {
  id: number;
  name: string;
  handle_name: string;
  channel_id: string;
  lease_time: string;
  callback_url: string;
};

const db = new Database(dbPath, { readonly: true });

const exportYoutubersToCsv = () => {
  try {
    const youtubers = db.prepare('SELECT * FROM youtubers').all() as YoutuberData[];

    if (youtubers.length === 0) {
      console.log('No data found in youtubers table.');
      return;
    }

    const headers = Object.keys(youtubers[0]).join(',');
    const rows = youtubers.map(youtuber =>
      Object.values(youtuber).map(value => {
        // Handle potential commas or quotes in data
        if (typeof value === 'string') {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );

    const csvContent = [headers, ...rows].join('\n');
    const outputPath = path.join(__dirname, 'youtubers_export.csv');

    fs.writeFileSync(outputPath, csvContent, 'utf8');
    console.log(`Successfully exported youtubers data to ${outputPath}`);

  } catch (error) {
    console.error('Error exporting data:', error);
  } finally {
    db.close();
  }
};

exportYoutubersToCsv();
