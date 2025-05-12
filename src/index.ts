import dotenv from 'dotenv';
import path from 'node:path';
dotenv.config();
import Database from "better-sqlite3"
import pubsub_startup from './pubsub_initialize';

import { Client, Events, GatewayIntentBits } from 'discord.js';
import { DiscordInteractions, ErrorCodes, InteractionsError, } from '@akki256/discord-interaction';
import { DiscordEvents } from './modules/events';

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.DirectMessageReactions
	],
});

// DB Check
const db = new Database(process.env.DATABASE ?? './db/streank.db');
db.prepare(`CREATE TABLE IF NOT EXISTS youtubers (
	id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	name TEXT NOT NULL,
	handle_name TEXT NOT NULL CHECK (handle_name GLOB '@*'),
	channel_id TEXT NOT NULL,
	lease_time TEXT DEFAULT (datetime('now', 'localtime')));`).run();
db.prepare(`CREATE TABLE IF NOT EXISTS register_list (
	id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	client_id TEXT NOT NULL,
	youtuber INTEGER NOT NULL,
	members_only INTEGER NOT NULL DEFAULT 0 CHECK (members_only IN (0, 1)),
	presume INTEGER NOT NULL DEFAULT 0 CHECK (presume IN (0, 1)),
	FOREIGN KEY (youtuber) REFERENCES youtubers(id));`).run();
db.close();

const interactions = new DiscordInteractions(client);
interactions.loadRegistries(path.resolve(__dirname, './commands'));

const events = new DiscordEvents(client);
events.register(path.resolve(__dirname, './events'));

pubsub_startup();

client.once(Events.ClientReady, (): void => {
  console.log('[INFO] BOT ready!');
  interactions.registerCommands({ guildId: process.env.GUILD_ID ?? undefined });
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