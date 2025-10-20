import {createFileRoute} from '@tanstack/react-router'
import {AccountSettingsCards, SecuritySettingsCards} from "@daveyplate/better-auth-ui"
import {Separator} from "@radix-ui/themes"
import { AuthLayout } from "@/components/layout/auth"
import { Header } from "@/components/layout/header"

export const Route = createFileRoute('/account/settings')({
    component: RouteComponent,
})

function RouteComponent() {
    return <AuthLayout>
        {(user) => <>
            <Header threadId={user.id} />
            <div className="flex flex-col gap-8 items-center py-12 px-4">
                <AccountSettingsCards className="max-w-xl"/>
                <Separator my="3" size="4"/>
                <SecuritySettingsCards className="max-w-xl"/>
            </div>
        </>}
    </AuthLayout>
}
