import { Command } from "discord-hono";
import { factory } from "../init.js";

export const pingCommand = factory.command(new Command("ping", "Ping for aim ai Coach"), (c) =>
	c.res("pong")
);
