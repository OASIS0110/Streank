import axios from "axios"

const subscribeToFeed = async ({topicUrl, hubUrl = 'https://pubsubhubbub.appspot.com/', callbackUrl, leaseSeconds = 86400, verify = 'async'}: {topicUrl: string, hubUrl: string, callbackUrl: string, leaseSeconds: number, verify: 'async' | 'sync'}) => {
	try {
		const res = await axios.post(
			hubUrl,
			new URLSearchParams({
				'hub.mode': 'subscribe',
				'hub.topic': topicUrl,
				'hub.callback': callbackUrl,
				'hub.verify': verify, // default 'async'
				'hub.lease_seconds': `${leaseSeconds}`, // default 86400 (24 hours)	
      }),
		)
	}
	catch (error: any) {
		console.error('❌ 購読リクエスト失敗:', error.response?.data || error.message);
	}
}