import {factory} from "../init.js";
import {Command} from "discord-hono";

export const pingCommand = factory.command(
    new Command('ping', 'Ping for aim ai Coach'),
    c => c.res("pong")
)
