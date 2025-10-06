import { createAuthClient } from "better-auth/client";
import { deviceAuthorizationClient } from "better-auth/client/plugins";
import open from "open";
import { config } from "./config.ts";

const clientId = "aim-ai-coach-cli"

export type Session = typeof authClient.$Infer.Session;
export type User = (typeof authClient.$Infer.Session)["user"];

export const authClient = createAuthClient({
	baseURL: "https://aim-ai-coach.mk2481.dev",
	plugins: [deviceAuthorizationClient()],
	fetchOptions: {
		auth: {
			type: "Bearer",
			token: () => config.get("device.access_token") || "",
		},
	},
});

export const login = async (): Promise<Session> => {
	const { data, error } = await authClient.device.code({
		client_id: clientId,
		scope: "test",
	});
    console.log("device: ", { data, error })

	if (error) throw error;

	if (data) {
		await open(data.verification_uri_complete);

		while (true) {
			const token = await authClient.device.token({
				grant_type: "urn:ietf:params:oauth:grant-type:device_code",
				device_code: data.device_code,
				client_id: clientId,
			});
            console.log("token: ", token)

			let interval = data.interval;

			if (token.data?.access_token) {
				Object.entries(token.data).forEach(([key, value]) => {
					config.set(`device.${key}`, value);
				});
				break;
			} else if (token.error) {
				switch (token.error.error) {
					case "authorization_pending": {
						break;
					}
					case "slow_down": {
						interval += 5;
						break;
					}
					case "access_denied": {
						throw token.error;
					}
					case "expired_token": {
						throw token.error;
					}
					default: {
						throw token.error;
					}
				}

				Bun.sleep(interval * 1000);
			}
		}
	}

	const session = await authClient.getSession();
	if (session.error) {
		throw session.error;
	}

	return session.data!;
};

export const getSessionOrLogin = async (): Promise<Session> => {
	const session = await authClient.getSession();
	if (session.data) {
		return session.data;
	}

	return login();
};
