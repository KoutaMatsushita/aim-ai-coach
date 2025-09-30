import { lstat, readFile, readdir, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

export const chunkArray = <T>(arr: T[], size: number): T[][] => {
	const result: T[][] = [];
	for (let i = 0; i < arr.length; i += size) {
		result.push(arr.slice(i, i + size));
	}
	return result;
};

export const hashFile = async (
	path: string,
	algorithm: "SHA-256" | "SHA-1" | "SHA-512" = "SHA-256",
) => {
	const data = await readFile(path);
	const hashBuffer = await crypto.subtle.digest(algorithm, data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

type FindOptions = {
	recursive?: boolean; // デフォルト: true
	followSymlinks?: boolean; // デフォルト: false
	caseInsensitive?: boolean; // デフォルト: true
};

function normalizeExt(ext: string, ci: boolean) {
	const e = ext.startsWith(".") ? ext : `.${ext}`;
	return ci ? e.toLowerCase() : e;
}

function matchExt(name: string, target: string, ci: boolean) {
	const got = ci ? extname(name).toLowerCase() : extname(name);
	return got === target;
}

export async function findFirstWithExt(
	targetPath: string,
	ext: string,
	opts: FindOptions = {},
): Promise<string | null> {
	const {
		recursive = true,
		followSymlinks = false,
		caseInsensitive = true,
	} = opts;

	const wanted = normalizeExt(ext, caseInsensitive);
	const abs = resolve(targetPath);
	const statFn = followSymlinks ? stat : lstat;

	let s;
	try {
		s = await statFn(abs);
	} catch {
		return null;
	}

	// 1) パス自体がファイルの場合は拡張子で判定
	if (s.isFile()) {
		return matchExt(abs, wanted, caseInsensitive) ? abs : null;
	}

	// 2) ディレクトリの場合はBFSで探索
	if (!s.isDirectory()) return null;

	const q: string[] = [abs];

	while (q.length) {
		const dir = q.shift()!;
		let entries;
		try {
			entries = await readdir(dir, { withFileTypes: true });
		} catch {
			continue;
		}

		for (const e of entries) {
			const full = join(dir, e.name);

			if (e.isFile()) {
				if (matchExt(e.name, wanted, caseInsensitive)) return full; // 最初の一件を返す
				continue;
			}
			if (e.isDirectory()) {
				if (recursive) q.push(full);
				continue;
			}
			if (e.isSymbolicLink() && followSymlinks) {
				const st = await stat(full);
				if (st.isFile() && matchExt(full, wanted, caseInsensitive)) return full;
				if (st.isDirectory() && recursive) q.push(full);
			}
		}
	}

	return null;
}
