declare module 'node:process' {
	global {
		namespace NodeJS {
			interface ProcessEnv {
				readonly DISCORD_TOKEN: string;
				readonly CLIENT_ID: string;
				readonly YOUTUBE_API_KEY: string;
				readonly GUILD_ID: string;
				readonly DATABASE: string;
				readonly EXPRESS_PORT: string;
				readonly CALLBACK_URL: string;
			}
		}
	}
}