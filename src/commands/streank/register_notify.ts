import { ChatInput } from '@akki256/discord-interaction';
import { ApplicationCommandOptionType, MessageFlags } from 'discord.js';
import { searchYoutuber } from '../../utils/youtube_func';
import { searchYoutuberFromDB } from '../../utils/db_func';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
dotenv.config();

const debug = false;

const registerNotify = new ChatInput({
	name: 'register_notify',
	description: '通知設定を登録します。',
	options: [
		{
			name: 'channel', //ハンドル名[@XXXX]もしくはチャンネルID[UCXXXX]
			description: '登録するYouTuberのハンドル名[@ABCD]、チャンネルID[UCXXXX]もしくはチャンネル(チャンネル名検索はBotに登録されているチャンネル名のみ)',
			required: true,
			type: ApplicationCommandOptionType.String,
		},
		{
			name: 'members_only',
			description: 'メンバー限定配信を通知するか(デフォルト：有効)',
			required: false,
			type: ApplicationCommandOptionType.Boolean,
		},
		{
			name: 'presume',
			description: '他チャンネルに出演する可能性がある場合に通知するか(デフォルト：有効)',
			required: false,
			type: ApplicationCommandOptionType.Boolean,
		}
	]
	},
	async (interaction) => {
		const channel = interaction.options.getString('channel', true) ?? '';
		const membersOnly = interaction.options.getBoolean('members_only') ?? true;
		const presume = interaction.options.getBoolean('presume') ?? true;
		const clientId = interaction.user.id;

		const searchDBResult = searchYoutuberFromDB({databaseDir: process.env.DATABASE ?? undefined, searchStr: channel, debug: debug});
		// DBに登録されていない場合 -> YouTube APIで検索
		if (!searchDBResult) {
			const searchYoutuberResult = await searchYoutuber({searchStr: channel, maxResult: 1, part: ['contentDetails', 'id', 'snippet'], debug: debug});
			const channelData = searchYoutuberResult.data.items
			// チャンネルを見つけられなかった場合
			if ((searchYoutuberResult.data.pageInfo?.totalResults ?? 0) === 0 || channelData == undefined) await interaction.reply({
				content: `チャンネルを見つけることができませんでした。入力したチャンネルが合っているか確認してください。\nチャンネル名を入力した場合はBotに登録されていない可能性があります。チャンネルIDかハンドル名を入力して再実行してください。`,
				flags: [MessageFlags.Ephemeral],
			})
			// チャンネルを見つけた場合、DBに登録
			else {
				const database = new Database(process.env.DATABASE ?? undefined);
				database.prepare(`INSERT INTO youtubers (name, handle_name, channel_id) VALUES (?, ?, ?);`).run(
					channelData[0].snippet?.title,
					channelData[0].snippet?.customUrl,
					channelData[0].id
				);
				database.prepare('INSERT INTO register_list (client_id, youtuber, members_only, presume) VALUES (?, ?, ?, ?);').run(
					clientId,
					channelData[0].id,
					membersOnly ? 1 : 0,
					presume ? 1 : 0
				);
				database.close();
				await interaction.reply({
				content: `[${channelData[0].snippet?.title}](https://www.youtube.com/channel/${channelData[0].id})を登録しました。`,
				flags: MessageFlags.Ephemeral,
			})}
		}
		// DBに登録されている場合
		else {
			// 通知がすでに登録されているか確認
			const database = new Database(process.env.DATABASE ?? undefined);
			const checkAlreadyRegistered = database.prepare(`SELECT 
				register_list.client_id,
				register_list.members_only,
				register_list.presume,
				youtubers.name,
				youtubers.handle_name,
				youtubers.channel_id
				FROM
				register_list JOIN youtubers ON register_list.youtuber = youtubers.id
				WHERE register_list.client_id = ? AND register_list.youtuber = ?`).get(clientId, searchDBResult.id) as {client_id: string, members_only: number, presume: number, name: string, handle_name: string, channel_id: string} | undefined;
			if (checkAlreadyRegistered) {
				await interaction.reply({
					content: `すでに通知の登録がされています。登録されている設定は以下の通りです。\n- チャンネル名: [${checkAlreadyRegistered.name}](https://www.youtube.com/channel/${checkAlreadyRegistered.channel_id})\n- メンバー限定配信を通知するか: ${checkAlreadyRegistered.members_only ? '有効' : '無効'}\n- 他チャンネルに出演する可能性がある場合に通知: ${checkAlreadyRegistered.presume ? '有効' : '無効'}\n設定を変更する場合は、\`/notify_setting\`コマンドを使用してください。`,
					flags: MessageFlags.Ephemeral,
				})
				return;
			}
			const youtuberId = searchDBResult.id;
			database.prepare('INSERT INTO register_list (client_id, youtuber, members_only, presume) VALUES (?, ?, ?, ?);').run(
				clientId,
				youtuberId,
				membersOnly ? 1 : 0,
				presume ? 1 : 0
			);
			database.close();
			await interaction.reply({
				content: `[${searchDBResult.name}](https://www.youtube.com/channel/${searchDBResult.channel_id})を登録しました。`,
				flags: MessageFlags.Ephemeral,
			})
		}
	}
)
export default [registerNotify];