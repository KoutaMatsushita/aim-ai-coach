#!/usr/bin/env bun
import { Command } from "commander";
import { hc } from "hono/client";
import type { APIType } from "../../api";
import { uploadAimlab } from "./aimlab.ts";
import { getSessionOrLogin } from "./auth";
import { uploadKovaaks } from "./kovaaks.ts";

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
		const client = hc<APIType>(opts.endpoint);

		const { user } = await getSessionOrLogin();
		await uploadKovaaks(path, client, user);
	});

program
	.command("aimlab")
	.description("collect aimlab tasks")
	.argument("<path>")
	.option(
		"--endpoint <endpoint>",
		"upload api base endpoint",
		"http://localhost:4111/",
	)
	.action(async (path: string, opts: { endpoint: string }) => {
		const mastraClient = new MastraClient({
			baseUrl: opts.endpoint,
		});

		const { user } = await getSessionOrLogin();
		await uploadAimlab(path, mastraClient, user);
	});

program.parse();
