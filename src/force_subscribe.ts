import { subscribeToFeed } from '@utils/pubsub_func';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
dotenv.config();

const database = new Database(process.env.DATABASE ?? undefined);
const subscribeFeedList = [] as string[];
const youtuberList = database.prepare(`SELECT channel_id FROM youtubers;`).all() as {channel_id: string}[];
youtuberList.map((channelId) => {
	subscribeFeedList.push(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId.channel_id}`)
})
subscribeToFeed({
	topicUrls: subscribeFeedList,
	callbackUrl: process.env.CALLBACK_URL ?? undefined,
	hubUrl: 'https://pubsubhubbub.appspot.com/',
})
youtuberList.map((channel) => {
	database.prepare(`UPDATE youtubers SET lease_time = datetime('now', '+1 day', 'localtime') WHERE channel_id = ?;`).run(channel.channel_id);
})
database.close();