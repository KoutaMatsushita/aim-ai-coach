import { createFileRoute } from "@tanstack/react-router";

import { AuthLayout } from "@/components/layout/auth";
import { client } from "@/lib/client";
import { Button, Text, TextField } from "@radix-ui/themes";
import { useForm } from "@tanstack/react-form";

export const Route = createFileRoute("/knowledges/")({
	component: Knowledge,
});

function Knowledge() {
	const form = useForm({
		defaultValues: {
			url: "",
		},
		onSubmit: async ({ value }) => {
			await client.api.knowledges.youtube.$post({ json: value });
		},
	});

	return (
		<AuthLayout>
			{() => (
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
				>
					<form.Field name="url">
						{(field) => (
							<>
								<label htmlFor={field.name}>
									<Text>Youtube URL:</Text>
								</label>
								<TextField.Root placeholder="Youtube URL" />
							</>
						)}
					</form.Field>

					<form.Subscribe
						selector={(state) => [state.canSubmit, state.isSubmitting]}
					>
						{([canSubmit, isSubmitting]) => (
							<>
								<Button type="submit" disabled={!canSubmit}>
									{isSubmitting ? "..." : "Submit"}
								</Button>
								<Button
									type="reset"
									onClick={(e) => {
										e.preventDefault();
										form.reset();
									}}
								>
									Reset
								</Button>
							</>
						)}
					</form.Subscribe>
				</form>
			)}
		</AuthLayout>
	);
}
