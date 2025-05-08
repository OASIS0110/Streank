import axios from "axios"

const subscribeToFeed = async ({topicUrls, hubUrl = 'https://pubsubhubbub.appspot.com/', callbackUrl, leaseSeconds = 86400, verify = 'async'}: {topicUrls: Array<string>, hubUrl?: string, callbackUrl: string | undefined, leaseSeconds?: number, verify?: 'async' | 'sync'}) => {
	if (!callbackUrl) {
		console.error('❌ Callback URL was undefined.');
		return;
	}
	for (const topicUrl of topicUrls) {
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
				{
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded'
					}
				}
			)
			console.log('✅ Subscribe request sent. url:', topicUrl);
		}
		catch (error: any) {
			console.error('❌ Subscribe request failed:', error.response?.data || error.message);
		}
	}
}

export { subscribeToFeed }