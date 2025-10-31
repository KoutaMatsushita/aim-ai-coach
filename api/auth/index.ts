import { betterAuth } from "better-auth";
import { type DB, drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer, deviceAuthorization, magicLink } from "better-auth/plugins";
import { passkey } from "better-auth/plugins/passkey";
import { reactStartCookies } from "better-auth/react-start";
import {
	accounts,
	deviceCodes,
	passkeys,
	sessions,
	users,
	verifications,
} from "../db";

export const createAuth = ({
	db,
	baseURL,
	secret,
	trustedOrigins,
	discord,
	sendMail,
}: {
	db: DB;
	baseURL: string;
	secret: string;
	trustedOrigins: string[];
	discord: {
		clientId: string;
		clientSecret: string;
		redirectURI?: string;
	};
	sendMail: (
		data: {
			email: string;
			url: string;
			token: string;
		},
		request?: Request,
	) => Promise<void> | void;
}) =>
	betterAuth({
		secret,
		trustedOrigins,
		database: drizzleAdapter(db, {
			provider: "sqlite",
			usePlural: true,
			schema: {
				users: users,
				sessions: sessions,
				accounts: accounts,
				verifications: verifications,
				deviceCodes: deviceCodes,
				passkeys: passkeys,
			},
		}),
		session: {
			expiresIn: 60 * 60 * 24 * 7,
			updateAge: 60 * 60 * 24,
			cookieCache: {
				enabled: true,
				maxAge: 15 * 60,
			},
		},
		socialProviders: {
			discord,
		},
		baseURL: baseURL!,
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: true,
		},
		emailVerification: {
			sendVerificationEmail: async ({ user, url, token }, request) => {
				await sendMail({ email: user.email, url, token }, request);
			},
			autoSignInAfterVerification: true,
			sendOnSignUp: true,
		},
		plugins: [
			deviceAuthorization({
				expiresIn: "3Months",
				interval: "5s",
			}),
			bearer(),
			passkey(),
			magicLink({
				sendMagicLink: async ({ email, token, url }, request) => {
					await sendMail({ email, token, url }, request);
				},
			}),
			reactStartCookies(),
		],
	});
