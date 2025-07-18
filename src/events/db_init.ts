import { DiscordEventBuilder } from "@modules/events";
import { Events } from "discord.js";

const dbInit = new DiscordEventBuilder({
	type: Events.ClientReady,
	once: true,
	execute: async () => {
		
	}
})