import { createFileRoute } from "@tanstack/react-router";
import app from "api";

export const Route = createFileRoute("/api/$")({
	server: {
		handlers: ({ createHandlers }) =>
			createHandlers({
				ANY: async ({ request }) => {
					return app.fetch(request);
				},
			}),
	},
});
