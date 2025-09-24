"use client"

import {Button} from "../ui/button"
import {authClient} from "../../lib/auth/client";

export default () => {
    const handleLogin = async () => {
        await authClient.signIn.social({
            provider: "discord",
            callbackURL: "/",
        })
    }

    return <div>
        <Button onClick={handleLogin}>discord login</Button>
    </div>
}