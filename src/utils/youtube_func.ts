import { youtube } from '@googleapis/youtube'

type part = 'auditDetails' | 'brandingSettings' | 'contentDetails' | 'contentOwnerDetails' | 'id' | 'localizations' | 'snippet' | 'statistics' | 'status' | 'topicDetails'

const youtubeClient = youtube({
	version: 'v3',
	auth: process.env.YOUTUBE_API_KEY,
});

type searchYoutuberType = {
	searchStr: string;
	maxResult?: number;
	part?: part[];
	debug?: boolean;
	searchType?: 'handleName' | 'channelId';
}

/**
 * 入力された文字列からYoutuberを検索する
 * @param searchStr 検索する文字列
 * @param maxResult 検索結果の最大数
 * @param part 取得する情報の種類
 * @param searchType なんの形式で検索するか
 * @param debug デバッグモード
 * @returns object
 */

const searchYoutuber = async ({ searchStr, maxResult = 50, part = ['snippet'], searchType, debug = false }: searchYoutuberType) => {
	// search by channel id
	if (searchStr.startsWith('UC') && searchStr.length === 24 || searchType === 'channelId') {
		debug && console.log('searching Youtuber by channel id...');
		const res = await youtubeClient.channels.list({
			part: part,
			id: [searchStr],
			maxResults: maxResult,
		})
		debug && console.log(res.data.items);
		return res;
	}
	// search by handle name
	else {
		debug && console.log('searching Youtuber by handle name...');
		const res = await youtubeClient.channels.list({
			part: part,
			forHandle: searchStr,
			maxResults: maxResult,
		})
		debug && console.log(res.data.items);
		return res;
	}
}

const getPublicAndMemberVideosList = ({channelId}: {channelId: string}) => {
	return [`https://www.youtube.com/feeds/videos.xml?playlist_id=UU${channelId.slice(2)}`, `https://www.youtube.com/feeds/videos.xml?playlist_id=UUMO${channelId.slice(2)}`]
}

export { searchYoutuber, getPublicAndMemberVideosList };