/**
 * PKCE (Proof Key for Code Exchange) ユーティリティ関数
 * RFC 7636: https://tools.ietf.org/html/rfc7636
 */

import { createHash, randomBytes } from "node:crypto";

/**
 * PKCE コードベリファイア用の暗号学的に安全なランダム文字列を生成
 * @param length 文字列の長さ（PKCE では43-128文字）
 * @returns [A-Z] [a-z] [0-9] と予約されていない文字を使用したランダム文字列
 */
function generateSecureRandomString(length: number): string {
	// PKCE で使用可能な文字: A-Z a-z 0-9 - . _ ~
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
	const buffer = randomBytes(length);
	let result = "";

	for (let i = 0; i < length; i++) {
		result += charset[buffer[i]! % charset.length];
	}

	return result;
}

/**
 * バッファをBase64URLエンコード（パディング無しのURL安全なbase64）
 * @param buffer エンコードするバッファ
 * @returns Base64URLエンコード文字列
 */
function base64urlEncode(buffer: Buffer): string {
	return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * PKCEコードベリファイアを生成
 * [A-Z] [a-z] [0-9] と "-", ".", "_", "~" を使用した暗号学的ランダム文字列
 * 最小43文字、最大128文字
 *
 * @returns コードベリファイア文字列（128文字）
 */
export function generateCodeVerifier(): string {
	// セキュリティ向上のため最大長（128文字）を使用
	return generateSecureRandomString(128);
}

/**
 * コードベリファイアからPKCEコードチャレンジを生成
 * コードベリファイアのSHA256ハッシュをbase64urlエンコード
 *
 * @param codeVerifier コードベリファイア文字列
 * @returns コードチャレンジ文字列
 */
export function generateCodeChallenge(codeVerifier: string): string {
	const hash = createHash("sha256");
	hash.update(codeVerifier);
	const digest = hash.digest();

	return base64urlEncode(digest);
}

/**
 * 完全なPKCEパラメータセットを生成
 * @returns コードベリファイアとコードチャレンジを含むオブジェクト
 */
export function generatePkceParams(): {
	codeVerifier: string;
	codeChallenge: string;
	codeChallengeMethod: "S256";
} {
	const codeVerifier = generateCodeVerifier();
	const codeChallenge = generateCodeChallenge(codeVerifier);

	return {
		codeVerifier,
		codeChallenge,
		codeChallengeMethod: "S256" as const,
	};
}
