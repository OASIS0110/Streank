import express from 'express';
import bodyParser from 'body-parser';
import { subscribeToFeed } from '@utils/pubsub_func';
import { getPublicAndMemberVideosList } from '@utils/youtube_func'
import dotenv from 'dotenv';
dotenv.config();

const pubsub_startup = () => {
	const app = express();
	const PORT = process.env.EXPRESS_PORT || 3000;
	
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
		console.log('📬 購読リクエスト送信中...')
		const subscribeFeedList = [];
		subscribeFeedList.push(...getPublicAndMemberVideosList({channelId: 'UCtC3B1n4XMiJmrDtu1Ni5qw'}));
		subscribeToFeed({topicUrls: subscribeFeedList, callbackUrl: process.env.CALLBACK_URL ?? undefined, hubUrl: 'https://pubsubhubbub.appspot.com/'});
	});
}

export default pubsub_startup;