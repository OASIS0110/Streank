import Database from 'better-sqlite3';
import dotenv from "dotenv";
dotenv.config();

type searchYoutuberFromDBType = {
	databaseDir: string | undefined;
	searchStr: string;
	debug?: boolean;
}

type YoutuberResultDBType = {
	id: number;
	name: string;
	handle_name: string;
	channel_id: string;
}

export const searchYoutuberFromDB = ({ databaseDir, searchStr, debug = false }: searchYoutuberFromDBType): YoutuberResultDBType | undefined => {
	if (!databaseDir) return undefined;
	let result = undefined
	const database = new Database(databaseDir);
	// チャンネルIDで検索
	if (searchStr.startsWith('UC') && searchStr.length === 24) {
		debug && console.log(`searching by channel id...`);
		result = database.prepare(`SELECT * FROM youtubers WHERE channel_id = ?;`).get(searchStr) as YoutuberResultDBType;
	}
	// ハンドル名で検索
	else if (searchStr.startsWith('@')) {
		debug && console.log(`searching by handle name...`);
		result = database.prepare(`SELECT * FROM youtubers WHERE handle_name LIKE ?;`).get(`%${searchStr}%`) as YoutuberResultDBType;
	}
	else {
		debug && console.log(`searching by name...`);
		result = database.prepare(`SELECT * FROM youtubers WHERE name LIKE ?;`).get(`%${searchStr}%`) as YoutuberResultDBType;
	}
	database.close();
	debug && console.log(result);
	return result;
}