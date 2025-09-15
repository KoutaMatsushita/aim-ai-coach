/**
 * PKCE (Proof Key for Code Exchange) utility functions
 * RFC 7636: https://tools.ietf.org/html/rfc7636
 */

import { createHash, randomBytes } from "node:crypto";

/**
 * Generate a cryptographically secure random string for PKCE code verifier
 * @param length Length of the string (43-128 characters for PKCE)
 * @returns Random string using [A-Z] [a-z] [0-9] and unreserved characters
 */
function generateSecureRandomString(length: number): string {
	// PKCE unreserved characters: A-Z a-z 0-9 - . _ ~
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
	const buffer = randomBytes(length);
	let result = "";

	for (let i = 0; i < length; i++) {
		const byte = buffer[i];
		if (byte !== undefined) {
			result += charset[byte % charset.length];
		}
	}

	return result;
}

/**
 * Base64URL encode a buffer (URL-safe base64 without padding)
 * @param buffer Buffer to encode
 * @returns Base64URL encoded string
 */
function base64urlEncode(buffer: Buffer): string {
	return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Generate PKCE code verifier
 * A cryptographically random string using [A-Z] [a-z] [0-9] and "-", ".", "_", "~"
 * with a minimum length of 43 characters and a maximum length of 128 characters
 *
 * @returns Code verifier string (128 characters)
 */
export function generateCodeVerifier(): string {
	// Use maximum length (128) for better security
	return generateSecureRandomString(128);
}

/**
 * Generate PKCE code challenge from code verifier
 * SHA256 hash of the code verifier, base64url encoded
 *
 * @param codeVerifier The code verifier string
 * @returns Code challenge string
 */
export function generateCodeChallenge(codeVerifier: string): string {
	const hash = createHash("sha256");
	hash.update(codeVerifier);
	const digest = hash.digest();

	return base64urlEncode(digest);
}

/**
 * Validate code verifier format according to PKCE specification
 * @param codeVerifier Code verifier to validate
 * @returns True if valid, false otherwise
 */
export function validateCodeVerifier(codeVerifier: string): boolean {
	// PKCE code verifier requirements:
	// - Length: 43-128 characters
	// - Characters: [A-Z] [a-z] [0-9] "-" "." "_" "~"

	if (codeVerifier.length < 43 || codeVerifier.length > 128) {
		return false;
	}

	const validCharPattern = /^[A-Za-z0-9\-._~]+$/;
	return validCharPattern.test(codeVerifier);
}

/**
 * Generate a complete PKCE parameter set
 * @returns Object containing code verifier and code challenge
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
