import { Button, Callout, Text, TextField } from "@radix-ui/themes";
import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { AuthLayout } from "@/components/layout/auth";
import { Header } from "@/components/layout/header";
import { client } from "@/lib/client";

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
			{(user) => (
				<>
					<Header threadId={user.id} />
					<form
						className="p-4 flex flex-col gap-4"
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
					>
						{form.state.isSubmitSuccessful && (
							<Callout.Root color="green">
								<Callout.Text>Success!</Callout.Text>
							</Callout.Root>
						)}

						{form.state.errors.length !== 0 && (
							<Callout.Root color="red">
								<Callout.Text>
									Error!
									{form.state.errors.join("\n")}
								</Callout.Text>
							</Callout.Root>
						)}

						<form.Field name="url">
							{(field) => (
								<>
									<label htmlFor={field.name}>
										<Text>Youtube URL:</Text>
									</label>
									<TextField.Root
										placeholder="Youtube URL"
										required
										id={field.name}
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
								</>
							)}
						</form.Field>

						<form.Subscribe
							selector={(state) => [state.canSubmit, state.isSubmitting]}
						>
							{([canSubmit, isSubmitting]) => (
								<div className="flex flex-row gap-4">
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
								</div>
							)}
						</form.Subscribe>
					</form>
				</>
			)}
		</AuthLayout>
	);
}
