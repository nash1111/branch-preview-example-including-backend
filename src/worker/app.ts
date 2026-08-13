import { Hono } from "hono";
import type { NotesRepository } from "./repository";

export type RepositoryFactory = (env: Env) => NotesRepository;

export function createApp(repositoryFor: RepositoryFactory) {
	const app = new Hono<{ Bindings: Env }>();

	app.get("/api/health", async (c) => {
		await repositoryFor(c.env).health();
		return c.json({
			ok: true,
			stack: "React + Hono + Cloudflare Hyperdrive + PlanetScale",
			deployment: c.env.DEPLOYMENT_ENV ?? "local",
			databaseNamespace: c.env.DATABASE_NAMESPACE ?? "not-configured",
			commitSha: c.env.COMMIT_SHA ?? "local",
		});
	});

	app.get("/api/notes", async (c) => {
		const notes = await repositoryFor(c.env).list();
		return c.json({ notes });
	});

	app.post("/api/notes", async (c) => {
		let payload: { body?: unknown };
		try {
			payload = await c.req.json();
		} catch {
			return c.json({ error: "JSON body is required" }, 400);
		}

		const body = typeof payload.body === "string" ? payload.body.trim() : "";
		if (body.length < 1 || body.length > 280) {
			return c.json({ error: "body must be between 1 and 280 characters" }, 400);
		}

		const note = await repositoryFor(c.env).create(body);
		return c.json({ note }, 201);
	});

	app.delete("/api/preview-data", async (c) => {
		const expected = c.env.PREVIEW_CLEANUP_TOKEN;
		if (!expected || c.req.header("authorization") !== `Bearer ${expected}`) {
			return c.json({ error: "Not found" }, 404);
		}

		await repositoryFor(c.env).cleanup();
		return c.json({ ok: true, databaseNamespace: c.env.DATABASE_NAMESPACE });
	});

	app.onError((error, c) => {
		console.error("API request failed", error);
		return c.json({ error: "Database request failed" }, 500);
	});

	return app;
}
