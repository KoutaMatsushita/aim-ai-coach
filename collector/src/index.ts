#!/usr/bin/env bun
import {Command} from "commander";
import {uploadKovaaks} from "./kovaaks.ts";
import {MastraClient} from "@mastra/client-js";
import {getUser} from "./discord.ts";
import {uploadAimlab} from "./aimlab.ts";

const program = new Command();
program
    .name("aim-ai-coach-score-collector")
    .description("Aim AI Coach Score Collector")
    .version("1.0.0")

program
    .command("kovaaks")
    .description("collect kovaaks scores")
    .argument("<path>")
    .option("--endpoint <endpoint>", "upload api base endpoint", "http://localhost:4111/")
    .action(async (path: string, opts: { endpoint: string }) => {
        const mastraClient = new MastraClient({
            baseUrl: opts.endpoint,
        });

        const user = await getUser()
        await mastraClient.request("/users", {
            method: "POST",
            body: user,
        })

        await uploadKovaaks(path, mastraClient, user)
    });

program
    .command("aimlab")
    .description("collect aimlab tasks")
    .argument("<path>")
    .option("--endpoint <endpoint>", "upload api base endpoint", "http://localhost:4111/")
    .action(async (path: string, opts: { endpoint: string }) => {
        const mastraClient = new MastraClient({
            baseUrl: opts.endpoint,
        });

        const user = await getUser()
        await mastraClient.request("/users", {
            method: "POST",
            body: user,
        })

        await uploadAimlab(path, mastraClient, user)
    });

program.parse();
