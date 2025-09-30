import Conf from "conf";

export const appName = "aim-ai-coach-score-collector";

export const config = new Conf<{
	device: {
		access_token: string;
		token_type: string;
		expires_in: number;
		scope: string;
	};
}>({ projectName: appName });
