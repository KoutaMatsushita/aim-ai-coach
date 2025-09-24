"use client";

import { createAuthClient } from "better-auth/react";

// ランタイムで動的にbaseURLを決定
function getAuthBaseURL(): string {
    // ブラウザ環境では現在のオリジンを使用
    if (typeof window !== "undefined") {
        return window.location.origin;
    }

    // サーバーサイドでは環境変数を使用
    return process.env.NEXT_PUBLIC_AUTH_BASE_URL || "http://localhost:3000";
}

export const authClient = createAuthClient({
    baseURL: getAuthBaseURL(),
});
