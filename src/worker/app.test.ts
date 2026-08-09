import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import type { Note, NotesRepository } from "./repository";

class MemoryRepository implements NotesRepository {
	private notes: Note[] = [];

	async health() {}

	async list() {
		return [...this.notes].reverse();
	}

	async create(body: string) {
		const note = { id: String(this.notes.length + 1), body, createdAt: new Date(0).toISOString() };
		this.notes.push(note);
		return note;
	}
}

const env = {
	DEPLOYMENT_ENV: "test",
	PLANETSCALE_BRANCH: "pr-test",
	COMMIT_SHA: "abc123",
} as Env;

describe("notes API", () => {
	it("reports deployment and database branch metadata", async () => {
		const app = createApp(() => new MemoryRepository());
		const response = await app.request("/api/health", {}, env);

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ ok: true, deployment: "test", databaseBranch: "pr-test" });
	});

	it("creates and lists notes", async () => {
		const repository = new MemoryRepository();
		const app = createApp(() => repository);
		const created = await app.request(
			"/api/notes",
			{ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body: "preview data" }) },
			env,
		);

		expect(created.status).toBe(201);
		const listed = await app.request("/api/notes", {}, env);
		expect(await listed.json()).toEqual({
			notes: [{ id: "1", body: "preview data", createdAt: "1970-01-01T00:00:00.000Z" }],
		});
	});

	it("rejects invalid content", async () => {
		const app = createApp(() => new MemoryRepository());
		const response = await app.request(
			"/api/notes",
			{ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body: "   " }) },
			env,
		);

		expect(response.status).toBe(400);
	});
});
