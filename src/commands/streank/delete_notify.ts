import { ChatInput } from "@akki256/discord-interaction";
import { ApplicationCommandOptionType, MessageFlags } from "discord.js";
import { searchYoutuberFromDB } from "../../utils/db_func";
import Database from "better-sqlite3";
import dotenv from "dotenv";
dotenv.config();

const debug = false;

const deleteNotify = new ChatInput(
  {
    name: "delete_notify",
    description: "通知設定を削除します。",
    options: [
      {
        name: "channel", //ハンドル名[@XXXX]もしくはチャンネルID[UCXXXX]
        description:
          "削除するYouTuberのハンドル名[@ABCD]、チャンネルID[UCXXXX]もしくはチャンネル(チャンネル名検索はBotに登録されているチャンネル名のみ)",
        required: true,
        type: ApplicationCommandOptionType.String,
      },
    ],
  },
  async (interaction) => {
		const channel = interaction.options.getString("channel", true);
		const searchDBResult = searchYoutuberFromDB({ databaseDir: process.env.DATABASE ?? undefined, searchStr: channel, debug: debug });
		if (!searchDBResult) {
			await interaction.reply({
				content: `チャンネルを見つけることができませんでした。入力したチャンネルが合っているか確認してください。\nチャンネル名を入力していた場合は、チャンネルIDかハンドル名を入力して再実行してみてください。`,
				flags: [MessageFlags.Ephemeral],
			});
			return;
		}
		else {
			const database = new Database(process.env.DATABASE ?? undefined);
			database.prepare(`DELETE FROM register_list WHERE client_id = ? AND youtuber = ?;`).run(
				interaction.user.id,
				searchDBResult.id
			);
			await interaction.reply({
				content: `チャンネル「${searchDBResult.name}」の通知設定を削除しました。`,
				flags: [MessageFlags.Ephemeral],
			});
			return;
		}
	}
);

export default [deleteNotify];