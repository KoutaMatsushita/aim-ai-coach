import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { basename } from "path";
import { localCompleteKovaaksScore } from "api/db";
import type { User } from "./auth";
import type { ClientType } from "./index";
import { getDB } from "./local-db.ts";
import { logger } from "./logger.ts";
import { chunkArray, hashFile } from "./util.ts";

const FILENAME_RE =
	/^(?<scenario>.+?) - (?<mode>.+?) - (?<dt>\d{4}\.\d{2}\.\d{2}-\d{2}\.\d{2}\.\d{2}) Stats\.csv$/u;

type MetaData = {
	scenarioName: string;
	mode: string;
	runDatetimeText: string;
	runEpochSec: number;
	sourceFilename: string;
};

export const uploadKovaaks = async (
	path: string,
	client: ClientType,
	user: User,
) => {
	try {
		logger.info("Starting Kovaaks data upload", { path, userId: user.id });

		const db = await getDB();
		const all = (await readdir(path)).filter((f) => f.endsWith(".csv"));
		const patches: string[] = [];

		logger.info("Checking for new files", { totalFiles: all.length });

		// 処理されていない新しいファイルをチェック
		for (const file of all) {
			try {
				const fileHash = await hashFile(join(path, file));
				const history = await db.query.localCompleteKovaaksScore.findFirst({
					where: (t, { eq, and }) =>
						and(eq(t.fileName, file), eq(t.fileHash, fileHash)),
				});

				if (history) {
					logger.debug("File already processed, skipping", { file });
				} else {
					patches.push(file);
				}
			} catch (error) {
				logger.warn("Failed to check file history", { file, error });
			}
		}

		logger.info("Files to process", { newFiles: patches.length });

		if (patches.length === 0) {
			logger.info("No new files to process");
			return;
		}

		const allData: [] = [];
		let processedFiles = 0;

		// エラー処理つきでファイルを処理
		for (const file of patches) {
			try {
				logger.debug("Processing file", {
					file,
					progress: `${processedFiles + 1}/${patches.length}`,
				});

				const parsed = await parseKovaaks(path, file, user);
				if (parsed && parsed.length > 0) {
					allData.push(...parsed);
					logger.debug("File processed successfully", {
						file,
						recordCount: parsed.length,
					});
				} else {
					logger.warn("File parsing returned no data", { file });
				}

				processedFiles++;
			} catch (error) {
				logger.error("Failed to process file", { file, error });
			}
		}

		if (allData.length === 0) {
			logger.warn("No data extracted from files");
			return;
		}

		logger.info("Uploading data to API", { totalRecords: allData.length });

		// エラー処理つきでデータをチャンク単位でアップロード
		const chunks = chunkArray(allData, 100);
		let uploadedChunks = 0;

		for (const chunk of chunks) {
			try {
				const response = await client.api.kovaaks.$post(chunk);
                if (response.ok) {
                    uploadedChunks++;
                    logger.debug("Chunk uploaded successfully", {
                        progress: `${uploadedChunks}/${chunks.length}`,
                        recordCount: chunk.length,
                    });
                } else {
                    throw await response.json()
                }

			} catch (error) {
				logger.error("Failed to upload chunk", {
					chunkIndex: uploadedChunks,
					error,
				});
				throw error; // Stop processing if upload fails
			}
		}

		// アップロード成功後のみファイルを処理済みとしてマーク
		logger.info("Marking files as processed");
		const processedFileHashes = await Promise.all(
			patches.map(async (file) => ({
				fileName: file,
				fileHash: await hashFile(join(path, file)),
			})),
		);

		await db
			.insert(localCompleteKovaaksScore)
			.values(processedFileHashes)
			.onConflictDoNothing();

		logger.info("Kovaaks upload completed successfully", {
			filesProcessed: processedFiles,
			recordsUploaded: allData.length,
			chunksUploaded: uploadedChunks,
		});
	} catch (error) {
		logger.error("Kovaaks upload failed", error);
		throw error;
	}
};

const parseKovaaks = async (path: string, file: string, user: User) => {
	try {
		const filePath = join(path, file);
		const text = await Bun.file(filePath).text();

		if (!text || text.trim().length === 0) {
			logger.warn("File is empty", { file });
			return null;
		}

		const lines = text
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.length > 0);

		if (lines.length < 2) {
			logger.warn(
				"File has insufficient data (needs header + at least 1 data row)",
				{
					file,
					lineCount: lines.length,
				},
			);
			return null;
		}

		const header = lines.shift()!.split(",");

		if (header.length === 0) {
			logger.warn("File has no header columns", { file });
			return null;
		}

		const rows = lines
			.map((line) => line.split(","))
			.filter((row) => {
				if (row.length !== header.length) {
					logger.debug("Skipping malformed row", {
						file,
						expectedColumns: header.length,
						actualColumns: row.length,
					});
					return false;
				}
				return true;
			});

		if (rows.length === 0) {
			logger.warn("No valid data rows found in file", { file });
			return null;
		}

		const objects = rows.map((row) =>
			Object.fromEntries(header.map((key, i) => [key, row[i] ?? ""])),
		);

		const meta = parseFilename(file);
		if (!meta) {
			logger.warn("Could not parse filename metadata", { file });
			return null;
		}

		const mappedData = mapKovaaksRow(objects, meta, user);
		logger.debug("File parsed successfully", {
			file,
			recordCount: mappedData.length,
		});

		return mappedData;
	} catch (error) {
		logger.error("Failed to parse Kovaaks file", { file, error });
		throw error;
	}
};

const parseFilename = (path: string): MetaData | null => {
	const name = basename(path).trim();
	const m = name.match(FILENAME_RE);
	if (!m || !m.groups) return null;

	const scenarioName = m.groups["scenario"];
	const mode = m.groups["mode"];
	const runDatetimeText = m.groups["dt"]; // "YYYY.MM.DD-HH.MM.SS"

	if (!scenarioName || !mode || !runDatetimeText) return null;

	const dateMatch = runDatetimeText.match(
		/^(\d{4})\.(\d{2})\.(\d{2})-(\d{2})\.(\d{2})\.(\d{2})$/,
	);
	if (!dateMatch) {
		logger.warn("Invalid datetime format in filename", {
			filename: path,
			datetime: runDatetimeText,
		});
		return null;
	}

	const [, y, mo, d, h, mi, s] = dateMatch;

	const date = new Date(
		Number(y),
		Number(mo) - 1, // JavaScript uses 0-based months
		Number(d),
		Number(h),
		Number(mi),
		Number(s),
		0,
	);

	// パースした日付を検証
	if (isNaN(date.getTime())) {
		logger.warn("Invalid date parsed from filename", {
			filename: path,
			datetime: runDatetimeText,
		});
		return null;
	}

	const runEpochSec = Math.floor(date.getTime() / 1000);

	return {
		scenarioName,
		mode,
		runDatetimeText,
		runEpochSec,
		sourceFilename: path,
	};
};

const mapKovaaksRow = (
	raws: { [p: string]: any }[],
	meta: MetaData,
	user: User,
) => {
	return raws.map((raw) => {
		try {
			return {
				userId: user.id,

				// メタ情報
				scenarioName: meta.scenarioName,
				mode: meta.mode,
				runDatetimeText: meta.runDatetimeText,
				runEpochSec: meta.runEpochSec,
				sourceFilename: meta.sourceFilename,

				// 安全なパーシングでスコア情報
				accuracy: safeParseFloat(raw["Accuracy"]),
				bot: raw["Bot"] || "",
				cheated: safeParseInt(raw["Cheated"]),
				damageDone: safeParseFloat(raw["Damage Done"]),
				damagePossible: safeParseFloat(raw["Damage Possible"]),
				efficiency: safeParseFloat(raw["Efficiency"]),
				hits: safeParseInt(raw["Hits"]),
				killNumber: safeParseInt(raw["Kill #"]),
				overShots: safeParseInt(raw["OverShots"]),
				shots: safeParseInt(raw["Shots"]),
				ttk: raw["TTK"] || "",
				timestamp: raw["Timestamp"] || "",
				weapon: raw["Weapon"] || "",
			} as const;
		} catch (error) {
			logger.error("Failed to map Kovaaks row", { raw, error });
			throw error;
		}
	});
};

// 安全なパーシング用ヘルパー関数
const safeParseFloat = (value: string | undefined): number => {
	if (!value || value.trim() === "") return 0;
	const parsed = Number.parseFloat(value.trim());
	return isNaN(parsed) ? 0 : parsed;
};

const safeParseInt = (value: string | undefined): number => {
	if (!value || value.trim() === "") return 0;
	const parsed = Number.parseInt(value.trim(), 10);
	return isNaN(parsed) ? 0 : parsed;
};
