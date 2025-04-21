declare module 'node:process' {
	global {
		namespace NodeJS {
			interface ProcessEnv {
				readonly DISCORD_TOKEN: string;
				readonly YOUTUBE_API_KEY: string;
				readonly GUILD_ID: string;
				readonly Database: string;
			}
		}
	}
}