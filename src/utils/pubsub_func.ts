import axios from "axios"
import { formatDate } from "date-fns";
import { setTimeout } from "timers/promises";

const defaultLeaseTime = 86400; // 24 hours (86400 seconds)

const subscribeToFeed = async ({topicUrls, hubUrl = 'https://pubsubhubbub.appspot.com/', callbackUrl, leaseSeconds = defaultLeaseTime}: {topicUrls: Array<string>, hubUrl?: string, callbackUrl: string | undefined, leaseSeconds?: number}) => {
	if (!callbackUrl) {
		console.error(`[ERROR] ${formatDate(new Date(), 'HH:mm:ss')} ❌ Callback URL was undefined.`);
		return;
	}
	for (const topicUrl of topicUrls) {
		const delay = 1000;
		await setTimeout(delay);
		try {
			const res = await axios.post(
				hubUrl,
				new URLSearchParams({
					'hub.mode': 'subscribe',
					'hub.topic': topicUrl,
					'hub.callback': callbackUrl,
					'hub.lease_seconds': `${leaseSeconds}`,
				}),
				{
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded'
					}
				}
			)
			console.log(`[INFO] ${formatDate(new Date(), 'HH:mm:ss')} ✅ Subscribe request sent. topic url: ${topicUrl}`);
		}
		catch (error: any) {
			console.error(`[ERROR] ${formatDate(new Date(), 'HH:mm:ss')} ❌ Subscribe request failed: ${error}`);
		}
	}
}

export { subscribeToFeed }