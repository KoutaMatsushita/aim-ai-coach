import type {ClientType} from "../index";
import { readdir } from "node:fs/promises";
import { logger } from "../logger";
import { join } from "node:path";

export const applySeeds = async (
    client: ClientType,
) => {
    const seedDir = join(__dirname, "..", "..", "..", "seeds")
    const youtubeDir = join(seedDir, "youtube")
    const textDir = join(seedDir, "text")

    for (const path of await readdir(youtubeDir)) {
        const movies: string[] = await Bun.file(join(youtubeDir, path)).json()
        for (const movie of movies) {
            logger.info("knowledge", { movie })
            const response = await client.api.knowledges.youtube.$post({ json: { url: movie } })
            if (!response.ok) {
                throw await response.text()
            }
        }
    }

    for (const path of await readdir(textDir)) {
        logger.info("path", { path })
        const file = Bun.file(join(textDir, path))
        const response = await client.api.knowledges.text.$post({ json: { title: file.name, content: await file.text() } })
        if (!response.ok) {
            throw await response.text()
        }
    }

}
