import { ChatInput } from "@akki256/discord-interaction";

const ping = new ChatInput({ name: 'ping', description: 'pong!' }, async (interaction) => {
	await interaction.reply(`WebSocket Ping: ${interaction.client.ws.ping}ms\nAPI Endpoint Ping: ...`);
	let msg = await interaction.fetchReply();
	await interaction.editReply(`WebSocket Ping: ${interaction.client.ws.ping}ms\nAPI Endpoint Ping: ${msg.createdTimestamp - interaction.createdTimestamp}ms`);
});

export default [ping];