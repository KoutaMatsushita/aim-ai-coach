import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer, deviceAuthorization } from "better-auth/plugins";
import { db } from "@/lib/db";
import { accounts, deviceCodes, sessions, users, verifications } from "@/lib/db";
import { getRequiredEnv } from "@/lib/env"
import { headers } from "next/headers";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "sqlite",
        usePlural: true,
        // Drizzleでスキーマ管理するため自動テーブル作成を無効化
        schema: {
            users: users,
            sessions: sessions,
            accounts: accounts,
            verifications: verifications,
            deviceCodes: deviceCodes,
        },
    }),
    socialProviders: {
        discord: {
            clientId: getRequiredEnv("DISCORD_CLIENT_ID"),
            clientSecret: getRequiredEnv("DISCORD_CLIENT_SECRET"),
        },
    },
    baseURL: getRequiredEnv("AUTH_BASE_URL"),
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

/**
 * サーバーサイドでセッションを取得
 */
export async function getServerSession() {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });
        return session;
    } catch (error) {
        console.error("Failed to get server session:", error);
        return null;
    }
}

/**
 * セッションが存在するかチェック
 */
export async function isAuthenticated() {
    const session = await getServerSession();
    return !!session?.user;
}

/**
 * 認証が必要なページで使用するヘルパー
 */
export async function requireAuth() {
    const session = await getServerSession();
    if (!session?.user) {
        return null;
    }
    return session;
}
