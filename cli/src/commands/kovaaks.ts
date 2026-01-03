import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { localCompleteKovaaksScore } from "api/db";
import { basename } from "path";
import type { User } from "../auth";
import type { ClientType } from "../index";
import { getDB } from "../local-db.ts";
import { logger } from "../logger.ts";
import { chunkArray, hashFile } from "../util.ts";

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
	force = false,
) => {
	try {
		logger.info("Starting Kovaaks data upload", {
			path,
			userId: user.id,
			force,
		});

		const db = await getDB();
		const all = (await readdir(path)).filter((f) => f.endsWith(".csv"));
		const patches: string[] = [];

		logger.info("Checking for new files", { totalFiles: all.length });

		// 処理されていない新しいファイルをチェック
		for (const file of all) {
			try {
				if (force) {
					patches.push(file);
					continue;
				}

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

		const allData: any[] = [];
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
				console.log(chunk);
				// @ts-ignore
				const response = await client.api.kovaaks.$post({ json: chunk });
				if (response.ok) {
					uploadedChunks++;
					logger.debug("Chunk uploaded successfully", {
						progress: `${uploadedChunks}/${chunks.length}`,
						recordCount: chunk.length,
					});
				} else {
					throw await response.text();
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

		// 空行でセクションを分割（ヘッダー+データ行 と フッター）
		// KovaaKs CSVは通常、データ行の後に空行があり、その後にフッターが続く
		// ただし、空行がない場合や複数ある場合も考慮する必要がある
		// ここでは、"Weapon,Shots,Hits..." のようなフッター特有のヘッダーが出現する場所、
		// または "Kills:," のようなキーバリュー行が出現する場所を探す

		const lines = text.split("\n").map((line) => line.trim());
		// 空行除去はまだしない（セクション区切りのため）

		const headerIndex = lines.findIndex((line) =>
			line.includes("Kill #,Timestamp,Bot,Weapon"),
		);
		if (headerIndex === -1) {
			logger.warn("File has no valid header", { file });
			return null;
		}

		// データ行の終了場所を探す
		// ヘッダーの次の行から開始
		let footerStartIndex = -1;
		for (let i = headerIndex + 1; i < lines.length; i++) {
			// 空行、またはCSV形式ではない行（フッターの開始）を見つける
			if (
				lines[i] === "" ||
				(!lines[i].includes(",") && lines[i].includes(":"))
			) {
				footerStartIndex = i;
				break;
			}
			// "Weapon,Shots..." のようなフッター内ヘッダーもチェック
			if (lines[i].startsWith("Weapon,Shots,Hits")) {
				footerStartIndex = i;
				break;
			}
		}

		if (footerStartIndex === -1) {
			// フッターが見つからない場合はファイルの最後までデータとする
			footerStartIndex = lines.length;
		}

		// データ部分の抽出
		const dataLines = lines
			.slice(headerIndex, footerStartIndex)
			.filter((l) => l.length > 0);
		const footerLines = lines
			.slice(footerStartIndex)
			.filter((l) => l.length > 0);

		if (dataLines.length < 2) {
			logger.warn(
				"File has insufficient data (needs header + at least 1 data row)",
				{
					file,
					lineCount: dataLines.length,
				},
			);
			return null;
		}

		const header = dataLines.shift()!.split(",");

		const rows = dataLines
			.map((line) => line.split(","))
			.filter((row) => row.length === header.length);

		if (rows.length === 0) {
			logger.warn("No valid data rows found in file", { file });
			return null;
		}

		const objects = rows.map((row) =>
			Object.fromEntries(header.map((key, i) => [key, row[i] ?? ""])),
		);

		// フッターのパース
		const metaDict: Record<string, string> = {};

		// フッター内の キー:値 を抽出
		for (const line of footerLines) {
			// "Key:,Value" 形式
			if (line.includes(":,")) {
				const parts = line.split(":,");
				if (parts.length >= 2) {
					const key = parts[0].trim();
					const val = parts[1].trim();
					metaDict[key] = val;
				}
			}
			// "Key:,Value,Key2:,Value2" のような横並びや、"Weapon,Shots..." のようなテーブル形式は簡易的に処理
			// 今回は "Score:,580.0" のような形式を優先
			else if (line.includes(",")) {
				// "Weapon,Shots,Hits..." の行やその下の値の行は、今のところ単純なMapには入れにくいので
				// 特定のキー（Hit Count, Shotsなど）は文字列検索で頑張るか、このループで処理しきれないものは無視
				// ユーザー要望の Score は "Score:,580.0" 形式で来るため上記分岐で取れる
				// Hit Count, Shots は "Hit Count:,928" のように入っているか確認が必要
				// ユーザー提供の例を見ると:
				// "Hit Count:,928"
				// "Miss Count:,688"
				// となっているので上記分岐で取れるはず
			}
		}

		// 特別対応: Footerに "Weapon,Shots,Hits..." のテーブルがある場合、そこから Shots を取る必要があるかも？
		// 提供されたCSV例では:
		// Weapon,Shots,Hits,...
		// LG,1616,928,...
		// となっている。
		// "Hit Count:,928" という行もあるので、そちらを優先すればテーブルパースは不要かもしれない。
		// 一応、metaDict に入った値を確認して計算する。

		const meta = parseFilename(file);
		if (!meta) {
			logger.warn("Could not parse filename metadata", { file });
			return null;
		}

		const score = safeParseFloat(metaDict["Score"]);
		const hits = safeParseFloat(metaDict["Hit Count"]);
		// Removed unused variable

		let sessionShots = 0;
		if (metaDict["Shots"]) {
			sessionShots = safeParseFloat(metaDict["Shots"]);
		} else if (metaDict["Hit Count"] && metaDict["Miss Count"]) {
			sessionShots =
				safeParseFloat(metaDict["Hit Count"]) +
				safeParseFloat(metaDict["Miss Count"]);
		} else {
			// 見つからない場合はテーブル行を探す
			const weaponHeaderIndex = footerLines.findIndex((l) =>
				l.startsWith("Weapon,Shots,Hits"),
			);
			if (
				weaponHeaderIndex !== -1 &&
				weaponHeaderIndex + 1 < footerLines.length
			) {
				const valRow = footerLines[weaponHeaderIndex + 1].split(",");
				// Weapon, Shots, Hits... なので Index 1 が Shots
				sessionShots = safeParseFloat(valRow[1]);
			}
		}

		const sessionAccuracy = sessionShots > 0 ? hits / sessionShots : 0;

		// metaDict を JSON にして保存
		const metaJson = JSON.stringify(metaDict);

		const mappedData = mapKovaaksRow(
			objects,
			meta,
			user,
			score,
			sessionAccuracy,
			metaJson,
		);
		logger.debug("File parsed successfully", {
			file,
			recordCount: mappedData.length,
			score,
			sessionAccuracy,
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
	score: number,
	sessionAccuracy: number,
	metaJson: string,
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

				// フッター由来情報
				score,
				sessionAccuracy,
				meta: metaJson,
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
