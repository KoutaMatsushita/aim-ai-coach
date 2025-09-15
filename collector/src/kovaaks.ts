import {readdir} from "node:fs/promises";
import {join} from "node:path";

import {basename} from "path";
import type {MastraClient} from "@mastra/client-js";
import type {DiscordUser} from "./discord.ts";
import {chunkArray, hashFile} from "./util.ts";
import {getDB} from "./local-db.ts";
import {localCompleteKovaaksScore} from "./db/schema.ts";

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
    mastraClient: MastraClient,
    user: DiscordUser,
) => {
    const db = await getDB()
    const all = (await readdir(path)).filter(f => f.endsWith(".csv"));
    const patches: string[] = [];

    for (const file of all) {
        const fileHash = await hashFile(join(path, file));
        const history = await db.query.localCompleteKovaaksScore.findFirst({
            where: (t, { eq, and }) => and(
                eq(localCompleteKovaaksScore.fileName, file),
                eq(localCompleteKovaaksScore.fileHash, fileHash),
            ),
        });

        if (history) {
            console.log(`[SKIP] ${file}`);
        } else {
            patches.push(file);
        }
    }

    console.log(`[TOTAL] ${patches.length} files`);

    const data = []
    for (const [index, file] of Object.entries(patches)) {
        console.log(`[${index + 1}/${patches.length}] ${file}`)

        const parsed = await parseKovaaks(path, file, user)
        if (!parsed) continue;

        data.push(...parsed)
    }

    for (const chunk of chunkArray(data, 100)) {
        await mastraClient.request(`/users/${user.id}/kovaaks`, {
            method: "POST",
            body: chunk,
        })
    }

    for (const file of patches) {
        await db.insert(localCompleteKovaaksScore)
            .values({
                fileName: file,
                fileHash: await hashFile(join(path, file)),
            })
    }
}

const parseKovaaks = async (path: string, file: string, user: DiscordUser) => {
    const lines = await Bun.file(join(path, file))
        .text()
        .then(t => t.split("\n").filter(l => l.trim().length > 0).map(t => t.trim()));

    const header = lines.shift()!.split(",");
    const rows = lines
        .map(line => line.split(","))
        .filter(r => r.length === header.length);

    const objects = rows.map(row =>
        Object.fromEntries(header.map((key, i) => [key, row[i] ?? ""]))
    );

    const meta = parseFilename(file);
    if (!meta) return null;

    return mapKovaaksRow(objects, meta, user)
};

const parseFilename = (path: string): MetaData | null => {
    const name = basename(path).trim();
    const m = name.match(FILENAME_RE);
    if (!m || !m.groups) return null;

    const scenarioName = m.groups["scenario"];
    const mode = m.groups["mode"];
    const runDatetimeText = m.groups["dt"]; // "YYYY.MM.DD-HH.MM.SS"

    if (!scenarioName || !mode || !runDatetimeText) return null;

    const [, y, mo, d, h, mi, s] =
        runDatetimeText.match(/^(\d{4})\.(\d{2})\.(\d{2})-(\d{2})\.(\d{2})\.(\d{2})$/)!;

    const date = new Date(
        Number(y),
        Number(mo) - 1, // JSは0始まりの月
        Number(d),
        Number(h),
        Number(mi),
        Number(s),
        0
    );

    const runEpochSec = Math.floor(date.getTime() / 1000);

    return {
        scenarioName,
        mode,
        runDatetimeText,
        runEpochSec,
        sourceFilename: path
    };
};

const mapKovaaksRow = (raws: { [p: string]: any }[], meta: MetaData, user: DiscordUser) => raws.map(raw => ({
    discordUserId: user.id,

    // メタ情報
    scenarioName: meta.scenarioName,
    mode: meta.mode,
    runDatetimeText: meta.runDatetimeText,
    runEpochSec: meta.runEpochSec,
    sourceFilename: meta.sourceFilename,

    // スコア情報
    accuracy: parseFloat(raw["Accuracy"]),
    bot: raw["Bot"],
    cheated: parseInt(raw["Cheated"]?.trim() ?? "0", 10),
    damageDone: parseFloat(raw["Damage Done"]),
    damagePossible: parseFloat(raw["Damage Possible"]),
    efficiency: parseFloat(raw["Efficiency"]),
    hits: parseInt(raw["Hits"], 10),
    killNumber: parseInt(raw["Kill #"], 10),
    overShots: parseInt(raw["OverShots"] ?? "0", 10),
    shots: parseInt(raw["Shots"], 10),
    ttk: raw["TTK"],
    timestamp: raw["Timestamp"] ?? "", // 無いなら空文字
    weapon: raw["Weapon"],
} as const))
