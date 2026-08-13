import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import { validateNamespace, type Note, type NotesRepository } from "./repository";

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

	async cleanup() {
		this.notes = [];
	}
}

const env = {
	DEPLOYMENT_ENV: "test",
	DATABASE_NAMESPACE: "pr_123",
	COMMIT_SHA: "abc123",
	PREVIEW_CLEANUP_TOKEN: "cleanup-test-token",
} as Env;

describe("notes API", () => {
	it("reports deployment and database namespace metadata", async () => {
		const app = createApp(() => new MemoryRepository());
		const response = await app.request("/api/health", {}, env);

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ ok: true, deployment: "test", databaseNamespace: "pr_123" });
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

	it("cleans up only with the preview token", async () => {
		const repository = new MemoryRepository();
		await repository.create("temporary");
		const app = createApp(() => repository);

		const denied = await app.request("/api/preview-data", { method: "DELETE" }, env);
		expect(denied.status).toBe(404);

		const cleaned = await app.request(
			"/api/preview-data",
			{ method: "DELETE", headers: { authorization: "Bearer cleanup-test-token" } },
			env,
		);
		expect(cleaned.status).toBe(200);
		expect(await repository.list()).toEqual([]);
	});

	it("accepts only PR-scoped database namespaces", () => {
		expect(validateNamespace("pr_42")).toBe("pr_42");
		expect(() => validateNamespace("main; DROP TABLE notes")).toThrow("Invalid preview database namespace");
	});
});
