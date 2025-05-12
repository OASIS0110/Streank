import { ChatInput } from "@akki256/discord-interaction";
import { ApplicationCommandOptionType, MessageFlags } from "discord.js";
import Database from "better-sqlite3";
import { formatDate } from "date-fns";
import dotenv from "dotenv";
dotenv.config();

import { searchYoutuberFromDB } from "@utils/db_func";
import { subscribeToFeed } from "@utils/pubsub_func";
import { getPublicAndMemberVideosList, searchYoutuber } from "@utils/youtube_func";

const debug = false;

const registerYoutuber = new ChatInput(
	{
		name: "register_youtuber",
		description: "YouTuberをBotのデータベースに登録します。",
		options: [
			{
				name: "channel", //ハンドル名[@XXXX]もしくはチャンネルID[UCXXXX]
				description:
					"登録するYouTuberのハンドル名[@ABCD]、チャンネルID[UCXXXX]もしくはチャンネル(チャンネル名検索はBotに登録されているチャンネル名のみ)",
				required: true,
				type: ApplicationCommandOptionType.String,
			},
		]
	},
	async (interaction) => {
		const channel = interaction.options.getString("channel", true) ?? "";
		const searchDBResult = searchYoutuberFromDB({databaseDir: process.env.DATABASE ?? undefined, searchStr: channel, debug: debug});
		// DBに登録されていない場合 -> YouTube APIで検索
		if (!searchDBResult) {
			const searchYoutuberResult = await searchYoutuber({ APIKey: process.env.YOUTUBE_API_KEY, searchStr: channel, maxResult: 1, part: ['contentDetails', 'id', 'snippet'], debug: debug});
			const channelData = searchYoutuberResult?.data.items
			// チャンネルを見つけられなかった場合
			if ((searchYoutuberResult?.data.pageInfo?.totalResults ?? 0) === 0 || channelData == undefined) await interaction.reply({
				content: `チャンネルを見つけることができませんでした。入力した値が合っているか確認してください。`,
				flags: [MessageFlags.Ephemeral],
			})
			// チャンネルを見つけた場合、DBに登録
			else {
				const database = new Database(process.env.DATABASE ?? undefined);
				database.prepare(`INSERT INTO youtubers (name, handle_name, channel_id, lease_time) VALUES (?, ?, ?, ?);`).run(
					channelData[0].snippet?.title,
					channelData[0].snippet?.customUrl,
					channelData[0].id,
					formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss'),
				);
				database.close();
				// 購読リクエストを送信
				subscribeToFeed({
					topicUrls: [`https://www.youtube.com/feeds/videos.xml?channel_id=${channelData[0].id}`],
					callbackUrl: process.env.CALLBACK_URL ?? undefined,
					hubUrl: 'https://pubsubhubbub.appspot.com/',
				});
				await interaction.reply({
					content: `「[${channelData[0].snippet?.title}](https://www.youtube.com/channel/${channelData[0].id})」をBotのデータベースに登録しました。`,
					flags: MessageFlags.Ephemeral,
				});
			}
		}
		// DBにYouTuberが登録されていた場合
		else {
			await interaction.reply({
				content: `「[${searchDBResult.name}](https://www.youtube.com/channel/${searchDBResult.channel_id})」はすでにBotのデータベースに登録されています。`,
				flags: MessageFlags.Ephemeral,
			})
		}
	}
)

export default [registerYoutuber];