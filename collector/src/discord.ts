import {serve} from "bun";
import open from "open";
import {config} from "./config.ts";

const CLIENT_ID = process.env.DISCORD_CLIENT_ID!
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!
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
    return await fetch(
        "https://discord.com/api/oauth2/token",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                code: code!,
                grant_type: "authorization_code",
                redirect_uri: REDIRECT_URI,
                scope: SCOPES,
            }).toString(),
        },
    )
        .then(res => res.json() as Promise<Token>)
        .then(token => {
            Object.entries(token).forEach(([key, value]) => {
                config.set(`discord.${key}`, value)
            })
            return token
        })
}

const refreshToken = async (refreshToken: string): Promise<Token> => {
    return await fetch(
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
    )
        .then(res => res.json() as Promise<Token>)
        .then(token => {
            Object.entries(token).forEach(([key, value]) => {
                config.set(`discord.${key}`, value)
            })
            return token
        })
}

const revokeToken = async (token: string): Promise<void> => {
    await fetch(
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
    )
        .then(() => config.delete("discord"))
}

const fetchUser = async (token: string): Promise<DiscordUser> => {
    return await fetch(
        "https://discord.com/api/users/@me",
        {
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        },
    ).then(res => res.json() as Promise<DiscordUser>)
}

const login = async () => {
    return new Promise<Token>(async (resolve, reject) => {
        await open(authURL.toString())
        const server = serve({
            port: 3456,
            routes: {
                "/callback": async (req) => {
                    try {
                        const url = new URL(req.url)
                        const code = url.searchParams.get('code')
                        const token = await getToken(code!)

                        resolve(token)
                        return new Response("認証が完了しました。このタブを閉じてください。", {status: 200});
                    } catch (err) {
                        console.error("認証エラー:", err);
                        reject(err)
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

        console.log(`コールバックを待っています: ${server.url}callback`);
    })
}

export const getUser = async (): Promise<DiscordUser> => {
    if (config.has("discord")) {
        const token = config.get("discord") as Token
        try {
            return await fetchUser(token.access_token)
        } catch (e) {
            console.error(e)
            const newToken = await refreshToken(token.refresh_token)
            return await fetchUser(newToken.access_token)
        }
    } else {
        const token = await login()
        return await fetchUser(token.access_token)
    }
}
