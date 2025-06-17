import express from 'express';
import bodyParser from 'body-parser';
import Database from 'better-sqlite3';
import { formatDate } from 'date-fns';
import cron from 'node-cron';
import { parseStringPromise } from 'xml2js';
import dotenv from 'dotenv';
dotenv.config();

import { subscribeToFeed } from '@utils/pubsub_func';
import { getPublicAndMemberVideosList } from '@utils/youtube_func'
import { getAllYoutuberId } from '@utils/db_func';

const defaultPort = 3000;
const daySeconds = 24 * 60 * 60; // 1日の秒数
const leaseTimeSeconds = 7 * daySeconds; // 7日間の秒数

const checkYoutuberLeaseTime = ({databaseDir, checkTime = new Date(), leaseTimeSeconds = daySeconds}: {databaseDir: string, checkTime?: Date, leaseTimeSeconds?: number}) => {
	const database = new Database(databaseDir);
	// lease_timeが過ぎるチャンネルを取得
	const reSubscribeFeedList = getAllYoutuberId({ databaseDir: process.env.DATABASE, where: `lease_time < (datetime(\'${formatDate(checkTime, 'yyyy-MM-dd HH:mm:ss')}\'))` }) as string[];
	// 送信する必要がある場合、購読リクエストを送信
	if (reSubscribeFeedList.length > 0) {
		console.log('📬 Posting subscribe request...')
		reSubscribeFeedList.map((channelId) => {
			console.log(`Re subscribing to channel: ${channelId}`);
			subscribeToFeed({
				topicUrls: [`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`],
				callbackUrl: process.env.CALLBACK_URL ?? undefined,
				hubUrl: 'https://pubsubhubbub.appspot.com/',
				leaseSeconds: leaseTimeSeconds,
			})
		})
	}
	database.close();
	console.log(`[INFO] ${formatDate(new Date(), 'HH:mm:ss')} ✅ Checked youtuber lease time and re-subscribed ${reSubscribeFeedList.length} channels.`);
}

const pubsub_startup = () => {
	const app = express();
	const PORT = process.env.EXPRESS_PORT || defaultPort;
	
	// Middleware
	app.use(bodyParser.urlencoded({ extended: true }));
	app.use(bodyParser.text({ type: 'application/atom+xml' }));
	
	// 購読状態を記録するためのメモリ変数
	let lastVerification: {
		mode?: string;
		topic?: string;
		challenge?: string;
		timestamp?: Date;
	} | null = null;
	
	let lastNotification: {
		body: string;
		timestamp: Date;
	} | null = null;
	
	// 1. Hub からの確認リクエストへの応答（GET）
	app.get('/callback', (req, res) => {
		const challenge = req.query['hub.challenge'] as string;
		const mode = req.query['hub.mode'] as string;
		const topic = req.query['hub.topic'] as string;
	
		console.log(`[INFO] ${formatDate(new Date(), 'HH:mm:ss')} 🔄 Challenge receive: ${mode} for topic: ${topic}`);
	
		// 記録
		lastVerification = {
			mode,
			topic,
			challenge,
			timestamp: new Date(),
		};
		const database= new Database(process.env.DATABASE ?? './db/streank.db');
		database.prepare('UPDATE youtubers SET lease_time = ? WHERE channel_id = ?;').run(formatDate(new Date(Date.now() + leaseTimeSeconds * 1000), 'yyyy-MM-dd HH:mm:ss'), topic.split('?channel_id=')[1]);
		database.close();
	
		if (challenge) {
			res.status(200).send(challenge);
		}
		else {
			res.status(400).send('Missing challenge');
		}
	});
	
	// 2. フィード更新通知を受け取る（POST）
	app.post('/callback', async (req, res) => {
		console.log(`[INFO] ${formatDate(new Date(), 'HH:mm:ss')} 📩 フィード通知受信`);
		const feedData = req.body;
		const parsedFeed = await parseStringPromise(feedData)
	
		lastNotification = {
			body: parsedFeed,
			timestamp: new Date(),
		};
		
		// 取得したフィードの情報を取得
		const channelId = parsedFeed.feed['yt:channelId']?.[0];
		const channelName = parsedFeed.feed.title;
		console.log(`チャンネル名: ${channelName}, チャンネルID: ${channelId}`);
		// 取得された動画の情報を取得
		for (const entry of parsedFeed.feed.entry) {
			const videoId = entry['yt:videoId']?.[0];
			const videoTitle = entry.title?.[0];
			const videoPublished = entry.published?.[0];
			const description = entry['media:group']?.[0]['media:description']?.[0];
			console.log(`[INFO] ${formatDate(new Date(), 'HH:mm:ss')} 📹 New video detected: ${videoTitle} (ID: ${videoId}) at ${videoPublished}`);
		}
		// console.log(`${formatDate(Date.now(), 'yyyy-MM-dd hh:mm:ss')} 📬 Received feed: ${JSON.stringify(parsedFeed, null, 2)}`);
		res.sendStatus(200);
	});

	// 3. 購読状況を確認するエンドポイント
	app.get('/status', (req, res) => {
		res.json({
			verification: lastVerification || 'まだ検証リクエストがありません',
			notification: lastNotification || 'まだ通知を受け取っていません',
		});
	});
	
	// サーバー起動 & 購読リクエスト
	app.listen(PORT, () => {
		console.log(`[INFO] ${formatDate(new Date(), 'HH:mm:ss')} 🚀 Express server running at http://localhost:${PORT}`);
		// 現在の時間から一時間後までにlease_timeが過ぎるチャンネルを再購読
		const now = new Date();
		const anHourLater = new Date(now.getTime() + 60 * 60 * 1000); // 一時間後
		checkYoutuberLeaseTime({
			databaseDir: process.env.DATABASE ?? './db/streank.db',
			checkTime: anHourLater,
			leaseTimeSeconds: leaseTimeSeconds, // 7日間の秒数
		});
	});

	cron.schedule('*/30 * * * *', () => {
		// 毎時0分と30分に実行
		console.log(`[INFO] ${formatDate(new Date(), 'HH:mm:ss')} 🕐 Running cron job to check youtuber lease time...`);
		const now = new Date();
		const anHourLater = new Date(now.getTime() + 60 * 60 * 1000); // 一時間後
		checkYoutuberLeaseTime({
			databaseDir: process.env.DATABASE ?? './db/streank.db',
			checkTime: anHourLater,
			leaseTimeSeconds: leaseTimeSeconds, // 7日間の秒数
		});
	})
}

export default pubsub_startup;