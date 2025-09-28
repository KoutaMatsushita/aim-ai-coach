import {createMastra} from "./mastra";
import { createDB } from "./db";
import { createAuth } from "./auth";

export type Auth = ReturnType<typeof createAuth>

export type Variables = {
    auth: ReturnType<typeof createAuth>
    user: Auth['$Infer']['Session']['user'] | null
    session: Auth['$Infer']['Session']['session'] | null
    mastra: ReturnType<typeof createMastra>
    db: ReturnType<typeof createDB>
}

export type RequiredAuthVariables = Variables & {
    user: Auth['$Infer']['Session']['user']
    session: Auth['$Infer']['Session']['session']
}
