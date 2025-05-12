import express from 'express';
import bodyParser from 'body-parser';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import { formatDate } from 'date-fns'
dotenv.config();

import { subscribeToFeed } from '@utils/pubsub_func';
import { getPublicAndMemberVideosList } from '@utils/youtube_func'
import { getAllYoutuberId } from '@utils/db_func';

const defaultPort = 3000;

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
	
		console.log(req.body); // フィードの内容（ATOM形式）
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
		const reSubscribeFeedList = [] as string[];
		const now = new Date();
		const anHourLater = new Date(now.getTime() + 60 * 60 * 1000); // 一時間後
		// lease_timeが過ぎるチャンネルを取得
		const reSubscribeYoutuberList = getAllYoutuberId({ databaseDir: process.env.DATABASE, where: `lease_time < (datetime(\'${formatDate(anHourLater, 'yyyy-MM-dd HH:mm:ss')}\'))` }) as string[];
		reSubscribeYoutuberList.map((channelId) => {
			reSubscribeFeedList.push(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`)
		})
		// 送信する必要がある場合、購読リクエストを送信
		if (reSubscribeFeedList.length > 0) {
			console.log('📬 Posting subscribe request...') 
			subscribeToFeed({topicUrls: reSubscribeFeedList, callbackUrl: process.env.CALLBACK_URL ?? undefined, hubUrl: 'https://pubsubhubbub.appspot.com/'});
			const database = new Database(process.env.DATABASE ?? undefined);
			reSubscribeYoutuberList?.forEach((id) => {
				database.prepare(`UPDATE youtubers SET lease_time = datetime('now', '+1 day', 'localtime') WHERE channel_id = ?;`).run(id);
			})
			database.close();
		}
	});
}

export default pubsub_startup;