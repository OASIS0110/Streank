import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';

const app = express();
const PORT = 3001;

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

// 1. 購読要求を送信する関数
async function subscribeToFeed() {
  const topicUrl = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCtC3B1n4XMiJmrDtu1Ni5qw';
  const hubUrl = 'https://pubsubhubbub.appspot.com/';
  const callbackUrl = 'https://1c27-202-240-109-135.ngrok-free.app/callback'; // 公開可能なURL

  try {
    const res = await axios.post(
      hubUrl,
      new URLSearchParams({
        'hub.mode': 'subscribe',
        'hub.topic': topicUrl,
        'hub.callback': callbackUrl,
        'hub.verify': 'async', // または 'sync'
        'hub.lease_seconds': '86400', // 24時間
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    console.log('✅ 購読要求送信完了');
  } catch (error: any) {
    console.error('❌ 購読リクエスト失敗:', error.response?.data || error.message);
  }
}

// 2. Hub からの確認リクエストへの応答（GET）
app.get('/callback', (req, res) => {
  const challenge = req.query['hub.challenge'] as string;
  const mode = req.query['hub.mode'] as string;
  const topic = req.query['hub.topic'] as string;

  console.log(`🔄 Challenge 受信: ${mode} for topic: ${topic}`);

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

// 3. フィード更新通知を受け取る（POST）
app.post('/callback', (req, res) => {
  console.log('📩 フィード通知受信');

  lastNotification = {
    body: req.body,
    timestamp: new Date(),
  };

  console.log(req.body); // フィードの内容（ATOM形式）
  res.sendStatus(200);
});

// 4. 購読状況を確認するエンドポイント
app.get('/status', (req, res) => {
  res.json({
    verification: lastVerification || 'まだ検証リクエストがありません',
    notification: lastNotification || 'まだ通知を受け取っていません',
  });
});

// サーバー起動 & 購読リクエスト
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  subscribeToFeed();
});