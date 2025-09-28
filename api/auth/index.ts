import {betterAuth} from "better-auth";
import {type DB, drizzleAdapter} from "better-auth/adapters/drizzle";
import {accounts, deviceCodes, sessions, users, verifications} from "../db";
import {bearer, deviceAuthorization} from "better-auth/plugins";

export const createAuth = (
    {db, baseURL, secret, trustedOrigins, discord}: {
        db: DB,
        baseURL: string,
        secret: string,
        trustedOrigins: string[],
        discord: {
            clientId: string,
            clientSecret: string,
        },
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
            },
        }),
        advanced: {
            crossSubDomainCookies: {
                enabled: true
            }
        },
        socialProviders: {
            discord,
        },
        baseURL: baseURL!,
        emailAndPassword: {
            enabled: false,
        },
        plugins: [
            deviceAuthorization({
                expiresIn: "3Months",
                interval: "5s",
            }),
            bearer(),
        ],
    });
