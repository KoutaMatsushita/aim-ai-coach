#!/usr/bin/env bun
import { Command } from "commander";
import { hc } from "hono/client";
import type { APIType } from "../../api";
import { uploadAimlab } from "./aimlab.ts";
import { getSessionOrLogin } from "./auth";
import { uploadKovaaks } from "./kovaaks.ts";
import {config} from "./config";

const createHC = (endpoint: string) => hc<APIType>(endpoint);
export type ClientType = ReturnType<typeof createHC>;

const program = new Command();
program
	.name("aim-ai-coach-score-collector")
	.description("Aim AI Coach Score Collector")
	.version("1.0.0");

program
	.command("login")
	.option(
		"--endpoint <endpoint>",
		"upload api base endpoint",
		"https://aim-ai-coach.mk2481.dev",
	)
	.action(async (opts: { endpoint: string }) => {
		console.log(await getSessionOrLogin());
	});

program
	.command("kovaaks")
	.description("collect kovaaks scores")
	.argument("<path>")
	.option(
		"--endpoint <endpoint>",
		"upload api base endpoint",
		"https://aim-ai-coach.mk2481.dev",
	)
	.action(async (path: string, opts: { endpoint: string }) => {
        const { user, session } = await getSessionOrLogin();
        const client = hc<APIType>(
            opts.endpoint,
            {
                headers: {
                    "Authorization": `Bearer ${config.get("device.access_token")}`,
                }
            }
        );

		await uploadKovaaks(path, client, user);
	});

program
	.command("aimlab")
	.description("collect aimlab tasks")
	.argument("<path>")
	.option(
		"--endpoint <endpoint>",
		"upload api base endpoint",
		"https://aim-ai-coach.mk2481.dev",
	)
	.action(async (path: string, opts: { endpoint: string }) => {
        const { user } = await getSessionOrLogin();
        const client = hc<APIType>(
            opts.endpoint,
            {
                headers: {
                    "Authorization": `Bearer ${config.get("device.access_token")}`,
                }
            }
        );

		await uploadAimlab(path, client, user);
	});

program.parse();
