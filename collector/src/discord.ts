import {serve} from "bun";
import open from "open";
import {config} from "./config.ts";
import {getEnv} from "./env.ts";
import {logger} from "./logger.ts";

// Validate environment variables on module load
const env = getEnv();
const CLIENT_ID = env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3456/callback";
const SCOPES = "identify";

const authURL = new URL("https://discord.com/oauth2/authorize")
authURL.searchParams.set("client_id", CLIENT_ID)
authURL.searchParams.set("response_type", "code")
authURL.searchParams.set("redirect_uri", REDIRECT_URI)
authURL.searchParams.set("scope", SCOPES)

type Token = {
    token_type: string,
    access_token: string,
    expires_in: number,
    refresh_token: string,
    scope: string,
}

export type DiscordUser = {
    id: string,
    username: string,
    avatar: string | null,
}

const getToken = async (code: string): Promise<Token> => {
    try {
        logger.info('Requesting Discord access token', { hasCode: !!code });

        const response = await fetch(
            "https://discord.com/api/oauth2/token",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    code: code,
                    grant_type: "authorization_code",
                    redirect_uri: REDIRECT_URI,
                    scope: SCOPES,
                }).toString(),
            },
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Discord token request failed: ${response.status} ${error}`);
        }

        const token = await response.json() as Token;

        // Validate token structure
        if (!token.access_token || !token.token_type) {
            throw new Error('Invalid token response from Discord');
        }

        // Store token securely
        Object.entries(token).forEach(([key, value]) => {
            config.set(`discord.${key}`, value);
        });

        logger.info('Discord access token obtained successfully');
        return token;
    } catch (error) {
        logger.error('Failed to get Discord token', error);
        throw error;
    }
}

const refreshToken = async (refreshToken: string): Promise<Token> => {
    try {
        logger.info('Refreshing Discord access token');

        const response = await fetch(
            "https://discord.com/api/oauth2/token",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    grant_type: "refresh_token",
                    refresh_token: refreshToken,
                }).toString(),
            },
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Discord token refresh failed: ${response.status} ${error}`);
        }

        const token = await response.json() as Token;

        // Validate token structure
        if (!token.access_token || !token.token_type) {
            throw new Error('Invalid refresh token response from Discord');
        }

        // Update stored token
        Object.entries(token).forEach(([key, value]) => {
            config.set(`discord.${key}`, value);
        });

        logger.info('Discord access token refreshed successfully');
        return token;
    } catch (error) {
        logger.error('Failed to refresh Discord token', error);
        // Clear invalid token from config
        config.delete('discord');
        throw error;
    }
}

const revokeToken = async (token: string): Promise<void> => {
    try {
        logger.info('Revoking Discord access token');

        const response = await fetch(
            "https://discord.com/api/oauth2/token/revoke",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    token: token,
                    token_type_hint: "access_token",
                }).toString(),
            },
        );

        if (!response.ok) {
            logger.warn('Failed to revoke Discord token', { status: response.status });
        } else {
            logger.info('Discord token revoked successfully');
        }

        // Always clear local token regardless of revocation result
        config.delete("discord");
    } catch (error) {
        logger.error('Error revoking Discord token', error);
        // Still clear local token
        config.delete("discord");
        throw error;
    }
}

const fetchUser = async (token: string): Promise<DiscordUser> => {
    try {
        logger.debug('Fetching Discord user information');

        const response = await fetch(
            "https://discord.com/api/users/@me",
            {
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            },
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Discord user fetch failed: ${response.status} ${error}`);
        }

        const user = await response.json() as DiscordUser;

        // Validate user structure
        if (!user.id || !user.username) {
            throw new Error('Invalid user response from Discord');
        }

        logger.info('Discord user fetched successfully', {
            userId: user.id,
            username: user.username
        });

        return user;
    } catch (error) {
        logger.error('Failed to fetch Discord user', error);
        throw error;
    }
}

const login = async () => {
    return new Promise<Token>(async (resolve, reject) => {
        await open(authURL.toString())
        const server = serve({
            port: 3456,
            routes: {
                "/callback": async (req) => {
                    try {
                        const url = new URL(req.url);
                        const code = url.searchParams.get('code');

                        if (!code) {
                            throw new Error('No authorization code received from Discord');
                        }

                        const token = await getToken(code);
                        resolve(token);

                        return new Response("認証が完了しました。このタブを閉じてください。", {status: 200});
                    } catch (err) {
                        logger.error("Discord authentication failed", err);
                        reject(err);
                        return new Response("認証中にエラーが発生しました。", {status: 500});
                    } finally {
                        setTimeout(() => server.stop(true), 500)
                    }
                },
            },
            async fetch() {
                return new Response("Not Found", {status: 404});
            },
        });

        logger.info('Waiting for Discord OAuth callback', { callbackUrl: `${server.url}callback` });
    })
}

export const getUser = async (): Promise<DiscordUser> => {
    try {
        if (config.has("discord")) {
            const token = config.get("discord") as Token;

            // Validate stored token structure
            if (!token.access_token || !token.refresh_token) {
                logger.warn('Invalid stored token, clearing and re-authenticating');
                config.delete("discord");
                return getUser(); // Retry without stored token
            }

            try {
                return await fetchUser(token.access_token);
            } catch (error) {
                logger.info('Access token expired, attempting refresh');

                try {
                    const newToken = await refreshToken(token.refresh_token);
                    return await fetchUser(newToken.access_token);
                } catch (refreshError) {
                    logger.warn('Token refresh failed, initiating new login');
                    config.delete("discord");
                    const newToken = await login();
                    return await fetchUser(newToken.access_token);
                }
            }
        } else {
            logger.info('No stored token found, initiating Discord login');
            const token = await login();
            return await fetchUser(token.access_token);
        }
    } catch (error) {
        logger.error('Failed to get Discord user', error);
        throw error;
    }
}
