import dotenv from 'dotenv';
import path from 'node:path';
dotenv.config();
import Database from "better-sqlite3"

import { Client, Events, GatewayIntentBits } from 'discord.js';
import {
  DiscordInteractions,
  ErrorCodes,
  InteractionsError,
} from '@akki256/discord-interaction';
import { DiscordEvents } from './modules/events';
import { Player } from 'discord-player';
import { DefaultExtractors } from '@discord-player/extractor';

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMessages
	],
});

// DB Check
const autoJoinDb = new Database(process.env.JOIN_CHANNEL_DB ?? "");
autoJoinDb.prepare(`CREATE TABLE IF NOT EXISTS auto_join_channels (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, guild_id TEXT NOT NULL, voice_channel_id TEXT NOT NULL, read_channel_id TEXT NOT NULL, auto_join INTEGER NOT NULL DEFAULT 0 CHECK (auto_join IN (0, 1)))`).run();
autoJoinDb.close();

const ttsInfoDb = new Database(process.env.TTS_INFO_DB ?? "");
ttsInfoDb.prepare(`CREATE TABLE IF NOT EXISTS tts_info (id INTEGER PRIMARY KEY, guild_id TEXT NOT NULL, voice_channel_id TEXT NOT NULL, message_channel_id TEXT NOT NULL)`).run();
// 起動時初期化
ttsInfoDb.prepare(`DELETE FROM tts_info`).run();
ttsInfoDb.close();

const player = new Player(client);

player.extractors.loadMulti(DefaultExtractors);

const interactions = new DiscordInteractions(client);
interactions.loadRegistries(path.resolve(__dirname, './commands'));

const events = new DiscordEvents(client);
events.register(path.resolve(__dirname, './events'));

client.once(Events.ClientReady, (): void => {
  console.log('[INFO] BOT ready!');
  interactions.registerCommands({ guildId: process.env.GUILD_ID ?? undefined });
});

player.events.on("playerFinish", async (queue, track) => {
	console.log(`Track ended: ${track.title}`);
	console.log(track);
}); 

client.on(Events.InteractionCreate, (interaction): void => {
  if (!interaction.isRepliable()) return;

  interactions.run(interaction).catch((err) => {
    if (
      err instanceof InteractionsError &&
      err.code === ErrorCodes.CommandHasCoolTime
    ) {
      interaction.reply({
        content: '`⌛` コマンドはクールダウン中です',
        ephemeral: true,
      });
      return;
    }
    console.log(err);
  });
});

client.login();