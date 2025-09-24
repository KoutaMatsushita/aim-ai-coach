/**
 * Lightweight caching layer for expensive tool operations
 *
 * Implements in-memory caching with file-based fallback for persistence
 * Optimized for personal development with simple operation and maintenance
 */

import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import { logToolEvent, ToolExecutionContext } from './tool-utils';
import { logger } from '../../logger';

// Cache configuration
const CACHE_CONFIG = {
	// Cache directory (relative to project root)
	CACHE_DIR: '.cache/mastra-tools',

	// In-memory cache size limits
	MAX_MEMORY_ENTRIES: 1000,
	MAX_MEMORY_SIZE_MB: 50,

	// Default TTL policies (in milliseconds)
	DEFAULT_TTL: {
		USER_TOOLS: 10 * 60 * 1000,        // 10 minutes - frequent updates
		RAG_TOOLS: 30 * 60 * 1000,         // 30 minutes - personalized content
		ASSESSMENT_TOOLS: 24 * 60 * 60 * 1000, // 24 hours - daily analysis
		KNOWLEDGE_TOOLS: 60 * 60 * 1000,    // 1 hour - knowledge queries
	},

	// File persistence settings
	PERSIST_THRESHOLD_MINUTES: 60,  // Persist items that will live longer than 1 hour
	CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // Clean up expired entries every 5 minutes

	// Cache key prefixes for different tool types
	KEY_PREFIXES: {
		USER_DATA: 'ud',
		RAG_SEARCH: 'rs',
		RAG_RECOMMENDATIONS: 'rr',
		SKILL_ASSESSMENT: 'sa',
		KNOWLEDGE_QUERY: 'kq',
	} as const,
} as const;

// Cache entry structure
interface CacheEntry<T = any> {
	key: string;
	value: T;
	timestamp: number;
	ttl: number;
	hits: number;
	size: number; // Approximate size in bytes
	persistent: boolean; // Whether to persist to disk
}

// Cache metrics for monitoring
interface CacheMetrics {
	totalEntries: number;
	memoryUsageMB: number;
	hitRate: number;
	totalHits: number;
	totalMisses: number;
	totalEvictions: number;
	oldestEntry: number;
	newestEntry: number;
}

class ToolCache {
	private memoryCache = new Map<string, CacheEntry>();
	private metrics = {
		hits: 0,
		misses: 0,
		evictions: 0,
	};

	private cleanupTimer?: NodeJS.Timeout;

	constructor() {
		this.startCleanupTimer();
	}

	/**
	 * Generates a cache key for tool operations
	 */
	generateKey(
		prefix: keyof typeof CACHE_CONFIG.KEY_PREFIXES,
		userId: string | null,
		operation: string,
		params?: Record<string, any>
	): string {
		const keyPrefix = CACHE_CONFIG.KEY_PREFIXES[prefix];

		// Handle anonymous users with special prefix to avoid data mixing
		const safeUserId = userId || 'anon';
		const baseKey = `${keyPrefix}:${safeUserId}:${operation}`;

		if (!params || Object.keys(params).length === 0) {
			return baseKey;
		}

		// Create deterministic hash of parameters
		const paramString = JSON.stringify(params, Object.keys(params).sort());
		const hash = createHash('md5').update(paramString).digest('hex').substring(0, 8);

		return `${baseKey}:${hash}`;
	}

	/**
	 * Gets value from cache (memory first, then file fallback)
	 */
	async get<T>(key: string, ctx?: ToolExecutionContext): Promise<T | null> {
		// Check memory cache first
		const memoryEntry = this.memoryCache.get(key);
		if (memoryEntry && !this.isExpired(memoryEntry)) {
			memoryEntry.hits++;
			this.metrics.hits++;

			if (ctx) {
				logToolEvent('debug', ctx, 'Cache hit (memory)', {
					cacheKey: key,
					age: Date.now() - memoryEntry.timestamp,
					hits: memoryEntry.hits
				});
			}

			return memoryEntry.value as T;
		}

		// Remove expired memory entry
		if (memoryEntry) {
			this.memoryCache.delete(key);
		}

		// Check file cache if entry was persistent
		if (memoryEntry?.persistent) {
			try {
				const fileEntry = await this.getFromFile<T>(key);
				if (fileEntry && !this.isExpired(fileEntry)) {
					// Restore to memory cache if there's space
					if (this.hasMemorySpace(fileEntry)) {
						this.memoryCache.set(key, fileEntry);
					}

					fileEntry.hits++;
					this.metrics.hits++;

					if (ctx) {
						logToolEvent('debug', ctx, 'Cache hit (file)', {
							cacheKey: key,
							age: Date.now() - fileEntry.timestamp,
							hits: fileEntry.hits
						});
					}

					return fileEntry.value as T;
				}
			} catch (error) {
				// File cache failed, continue to cache miss
				if (ctx) {
					logToolEvent('warn', ctx, 'File cache read failed', {
						cacheKey: key,
						error: (error as Error).message
					});
				}
			}
		}

		// Cache miss
		this.metrics.misses++;
		if (ctx) {
			logToolEvent('debug', ctx, 'Cache miss', { cacheKey: key });
		}

		return null;
	}

	/**
	 * Sets value in cache with appropriate TTL and persistence
	 */
	async set<T>(
		key: string,
		value: T,
		ttl: number,
		ctx?: ToolExecutionContext
	): Promise<void> {
		const size = this.estimateSize(value);
		const persistent = ttl >= CACHE_CONFIG.PERSIST_THRESHOLD_MINUTES * 60 * 1000;

		const entry: CacheEntry<T> = {
			key,
			value,
			timestamp: Date.now(),
			ttl,
			hits: 0,
			size,
			persistent,
		};

		// Always try to store in memory cache
		if (this.hasMemorySpace(entry)) {
			this.memoryCache.set(key, entry);
		} else {
			// Evict least recently used entries
			await this.evictLRU();
			this.memoryCache.set(key, entry);
		}

		// Store in file cache if persistent
		if (persistent) {
			try {
				await this.setToFile(entry);
				if (ctx) {
					logToolEvent('debug', ctx, 'Cache entry persisted to file', {
						cacheKey: key,
						ttl,
						size
					});
				}
			} catch (error) {
				if (ctx) {
					logToolEvent('warn', ctx, 'File cache write failed', {
						cacheKey: key,
						error: (error as Error).message
					});
				}
			}
		}

		if (ctx) {
			logToolEvent('debug', ctx, 'Cache entry stored', {
				cacheKey: key,
				ttl,
				size,
				persistent,
				memoryEntries: this.memoryCache.size
			});
		}
	}

	/**
	 * Removes entry from cache
	 */
	async invalidate(key: string, ctx?: ToolExecutionContext): Promise<void> {
		this.memoryCache.delete(key);

		try {
			const filePath = this.getFilePath(key);
			await fs.unlink(filePath);
		} catch {
			// File may not exist, ignore error
		}

		if (ctx) {
			logToolEvent('debug', ctx, 'Cache entry invalidated', { cacheKey: key });
		}
	}

	/**
	 * Removes entries from cache that match a key prefix
	 */
	async invalidateByPrefix(prefix: string, ctx?: ToolExecutionContext): Promise<void> {
		const matchingKeys: string[] = [];

		// Find matching keys in memory cache
		for (const key of this.memoryCache.keys()) {
			if (key.startsWith(prefix)) {
				matchingKeys.push(key);
				this.memoryCache.delete(key);
			}
		}

		// Try to remove matching files (this is a simplified approach)
		try {
			const cacheDir = CACHE_CONFIG.CACHE_DIR;
			const files = await fs.readdir(cacheDir);

			for (const file of files) {
				const filePath = join(cacheDir, file);
				try {
					const data = await fs.readFile(filePath, 'utf-8');
					const entry = JSON.parse(data);
					if (entry.key && entry.key.startsWith(prefix)) {
						await fs.unlink(filePath);
						matchingKeys.push(entry.key);
					}
				} catch {
					// Ignore individual file errors
				}
			}
		} catch {
			// Directory may not exist, ignore error
		}

		if (ctx && matchingKeys.length > 0) {
			logToolEvent('debug', ctx, 'Cache entries invalidated by prefix', {
				prefix,
				invalidatedCount: matchingKeys.length,
				matchingKeys: matchingKeys.slice(0, 5) // Log first 5 keys only
			});
		}
	}

	/**
	 * Clears all cache entries
	 */
	async clear(): Promise<void> {
		this.memoryCache.clear();

		try {
			const cacheDir = CACHE_CONFIG.CACHE_DIR;
			await fs.rmdir(cacheDir, { recursive: true });
		} catch {
			// Directory may not exist, ignore error
		}
	}

	/**
	 * Gets current cache metrics
	 */
	getMetrics(): CacheMetrics {
		const entries = Array.from(this.memoryCache.values());
		const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
		const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);
		const timestamps = entries.map(e => e.timestamp);

		return {
			totalEntries: this.memoryCache.size,
			memoryUsageMB: totalSize / (1024 * 1024),
			hitRate: this.metrics.hits / (this.metrics.hits + this.metrics.misses) || 0,
			totalHits: this.metrics.hits,
			totalMisses: this.metrics.misses,
			totalEvictions: this.metrics.evictions,
			oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
			newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0,
		};
	}

	// Private helper methods

	private isExpired(entry: CacheEntry): boolean {
		return Date.now() - entry.timestamp > entry.ttl;
	}

	private hasMemorySpace(entry: CacheEntry): boolean {
		if (this.memoryCache.size >= CACHE_CONFIG.MAX_MEMORY_ENTRIES) {
			return false;
		}

		const currentSize = Array.from(this.memoryCache.values())
			.reduce((sum, e) => sum + e.size, 0);
		const maxSize = CACHE_CONFIG.MAX_MEMORY_SIZE_MB * 1024 * 1024;

		return currentSize + entry.size <= maxSize;
	}

	private async evictLRU(): Promise<void> {
		const entries = Array.from(this.memoryCache.entries())
			.map(([key, entry]) => ({ key, entry }))
			.sort((a, b) => a.entry.timestamp - b.entry.timestamp);

		// Evict oldest 10% of entries
		const evictCount = Math.max(1, Math.floor(entries.length * 0.1));

		for (let i = 0; i < evictCount; i++) {
			this.memoryCache.delete(entries[i].key);
			this.metrics.evictions++;
		}
	}

	private estimateSize(value: any): number {
		const jsonString = JSON.stringify(value);
		return Buffer.byteLength(jsonString, 'utf8');
	}

	private getFilePath(key: string): string {
		const hash = createHash('md5').update(key).digest('hex');
		return join(CACHE_CONFIG.CACHE_DIR, `${hash}.json`);
	}

	private async ensureCacheDir(): Promise<void> {
		try {
			await fs.mkdir(CACHE_CONFIG.CACHE_DIR, { recursive: true });
		} catch {
			// Directory already exists or creation failed
		}
	}

	private async getFromFile<T>(key: string): Promise<CacheEntry<T> | null> {
		try {
			const filePath = this.getFilePath(key);
			const data = await fs.readFile(filePath, 'utf-8');
			return JSON.parse(data) as CacheEntry<T>;
		} catch {
			return null;
		}
	}

	private async setToFile<T>(entry: CacheEntry<T>): Promise<void> {
		await this.ensureCacheDir();
		const filePath = this.getFilePath(entry.key);
		const data = JSON.stringify(entry);
		await fs.writeFile(filePath, data, 'utf-8');
	}

	private startCleanupTimer(): void {
		this.cleanupTimer = setInterval(() => {
			this.cleanupExpired();
		}, CACHE_CONFIG.CLEANUP_INTERVAL_MS);
	}

	private cleanupExpired(): void {
		const now = Date.now();
		const expiredKeys: string[] = [];

		for (const [key, entry] of this.memoryCache.entries()) {
			if (this.isExpired(entry)) {
				expiredKeys.push(key);
			}
		}

		for (const key of expiredKeys) {
			this.memoryCache.delete(key);
		}

		if (expiredKeys.length > 0) {
			// Note: File cleanup is handled lazily during reads
			logger.debug({ expiredCount: expiredKeys.length }, '[Cache-Cleanup] Removed expired entries');
		}
	}

	/**
	 * Cleanup timer and resources
	 */
	destroy(): void {
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
		}
	}
}

// Singleton cache instance
const toolCache = new ToolCache();

// Public cache interface functions

/**
 * Wrapper for cached tool execution
 */
export async function withCache<T>(
	ctx: ToolExecutionContext,
	operation: string,
	keyPrefix: keyof typeof CACHE_CONFIG.KEY_PREFIXES,
	params: Record<string, any>,
	ttl: number,
	executor: () => Promise<T>
): Promise<T> {
	const cacheKey = toolCache.generateKey(keyPrefix, ctx.userId || 'anonymous', operation, params);

	// Try to get from cache first
	const cached = await toolCache.get<T>(cacheKey, ctx);
	if (cached !== null) {
		return cached;
	}

	// Execute operation and cache result
	const result = await executor();
	await toolCache.set(cacheKey, result, ttl, ctx);

	return result;
}

/**
 * Cache invalidation for specific user/operation patterns
 */
export async function invalidateCache(
	userId: string,
	patterns: string[],
	ctx?: ToolExecutionContext
): Promise<void> {
	for (const pattern of patterns) {
		const keys = ['USER_DATA', 'RAG_SEARCH', 'RAG_RECOMMENDATIONS', 'SKILL_ASSESSMENT', 'KNOWLEDGE_QUERY'] as const;

		for (const keyPrefix of keys) {
			// Handle both exact matches and prefix-based matches
			if (pattern.endsWith('*')) {
				// Pattern matching - invalidate all keys with this prefix
				const basePattern = pattern.slice(0, -1);
				const keyPrefix_str = CACHE_CONFIG.KEY_PREFIXES[keyPrefix];
				const searchPrefix = `${keyPrefix_str}:${userId}:${basePattern}`;

				await toolCache.invalidateByPrefix(searchPrefix, ctx);
			} else {
				// Exact match
				const cacheKey = toolCache.generateKey(keyPrefix, userId, pattern);
				await toolCache.invalidate(cacheKey, ctx);
			}
		}
	}
}

/**
 * Get cache metrics for monitoring
 */
export function getCacheMetrics(): CacheMetrics {
	return toolCache.getMetrics();
}

/**
 * Clear all cache (useful for development/testing)
 */
export async function clearAllCache(): Promise<void> {
	await toolCache.clear();
}

/**
 * Cache TTL presets for different operation types
 */
export const CACHE_TTL = CACHE_CONFIG.DEFAULT_TTL;

/**
 * Export configuration for testing
 */
export const CACHE_LAYER_CONFIG = CACHE_CONFIG;