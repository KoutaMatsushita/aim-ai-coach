import { createFileRoute } from "@tanstack/react-router";

import { AuthLayout } from "@/components/layout/auth";
import { client } from "@/lib/client";
import { useForm } from "@tanstack/react-form";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

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
								<label htmlFor={field.name}>Youtube URL:</label>
								<Input
									required={true}
									type="url"
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
