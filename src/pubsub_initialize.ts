import express from 'express';
import bodyParser from 'body-parser';
import Database from 'better-sqlite3';
import { formatDate } from 'date-fns'
import cron from 'node-cron';
import dotenv from 'dotenv';
dotenv.config();

import { subscribeToFeed } from '@utils/pubsub_func';
import { getPublicAndMemberVideosList } from '@utils/youtube_func'
import { getAllYoutuberId } from '@utils/db_func';

const defaultPort = 3000;
const daySeconds = 24 * 60 * 60; // 1日の秒数

const checkYoutuberLeaseTime = ({databaseDir, checkTime = new Date(), leaseTimeSeconds = daySeconds}: {databaseDir: string, checkTime?: Date, leaseTimeSeconds?: number}) => {
	const database = new Database(databaseDir);
	// lease_timeが過ぎるチャンネルを取得
	const reSubscribeFeedList = getAllYoutuberId({ databaseDir: process.env.DATABASE, where: `lease_time < (datetime(\'${formatDate(checkTime, 'yyyy-MM-dd HH:mm:ss')}\', localtime))` }) as string[];
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
			database.prepare(`UPDATE youtubers SET lease_time = datetime(now, '+${leaseTimeSeconds} seconds', 'localtime') WHERE channel_id = ?;`).run(channelId);
		})
	}
	database.close();
	console.log(`✅ Checked lease time for ${reSubscribeFeedList.length} channels.`);
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
	
		console.log(`🔄 Challenge receive: ${mode} for topic: ${topic}`);
	
		// 記録
		lastVerification = {
			mode,
			topic,
			challenge,
			timestamp: new Date(),
		};
	
		if (challenge) {
			res.status(200).send(challenge);
		} else {
			res.status(400).send('Missing challenge');
		}
	});
	
	// 2. フィード更新通知を受け取る（POST）
	app.post('/callback', (req, res) => {
		console.log('📩 フィード通知受信');
	
		lastNotification = {
			body: req.body,
			timestamp: new Date(),
		};
	
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
		console.log(`🚀 Express server running at http://localhost:${PORT}`);
		// 現在の時間から一時間後までにlease_timeが過ぎるチャンネルを再購読
		const now = new Date();
		const anHourLater = new Date(now.getTime() + 60 * 60 * 1000); // 一時間後
		checkYoutuberLeaseTime({
			databaseDir: process.env.DATABASE ?? './db/streank.db',
			checkTime: anHourLater,
			leaseTimeSeconds: 7 * 24 * 60 * 60, // 7日間の秒数
		});
	});

	cron.schedule('*/30 * * * *', () => {
		// 毎時0分と30分に実行
		console.log(`${Date.now()}: 🕐 Running cron job to check youtuber lease time...`);
		const now = new Date();
		const anHourLater = new Date(now.getTime() + 60 * 60 * 1000); // 一時間後
		checkYoutuberLeaseTime({
			databaseDir: process.env.DATABASE ?? './db/streank.db',
			checkTime: anHourLater,
			leaseTimeSeconds: 7 * 24 * 60 * 60, // 7日間の秒数
		});
	})
}

export default pubsub_startup;