import { ChatInput } from "@akki256/discord-interaction";
import Database from "better-sqlite3";
import { ApplicationCommandOptionType } from "discord.js";

const registerNotify = new ChatInput({
	name: 'register_notify',
	description: '通知設定を登録します。',
	options: [
		{
			name: 'youtuber_id',
			description: '登録するYouTuberのID',
			required: true,
			type: ApplicationCommandOptionType.String,
		},
		{
			name: 'members_only',
			description: 'メンバー限定配信を通知するか',
			required: false,
			type: ApplicationCommandOptionType.Boolean,
		},
		{
			name: 'presume',
			description: '他チャンネルに出演する可能性がある場合に通知するか',
			required: false,
			type: ApplicationCommandOptionType.Boolean,
		}
	]
	},
	async (interaction) => {
		const youtuberId = interaction.options.getString('youtuber_id', true);
		const membersOnly = interaction.options.getBoolean('members_only') ?? true;
		const presume = interaction.options.getBoolean('presume') ?? true;
		const clientId = interaction.user.id;

		const db = new Database('./db/streank.db');
		const youtuberCount = db.prepare(`SELECT EXISTS (SELECT 1 FROM youtubers WHERE ? IN (channel_id, user_id));`).get(youtuberId);
		const youtuberCount2 = db.prepare(`SELECT * FROM youtubers WHERE ? IN (channel_id, user_id) LIMIT 1;`).get(youtuberId);
		console.log(youtuberCount2);
		// youtuberCount.run(`${youtuberId}`);
		// console.log(youtuberCount.all());
		// if (db.prepare(`SELECT EXISTS (SELECT 1 FROM youtubers WHERE ? IN (channel_id, user_id));`).get(youtuberId) === 0) {
		// 	console.log('YouTuber not found in DB');
		// }
		db.close();

		await interaction.reply({
			content: `YouTuber ID: ${youtuberId} を登録しました。[Youtube](https://www.youtube.com/channel/${youtuberId})`,
			ephemeral: true,
		})
	}
)
export default [registerNotify];