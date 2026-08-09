import { type FormEvent, useCallback, useEffect, useState } from "react";

interface Note {
	id: string;
	body: string;
	createdAt: string;
}

interface Health {
	ok: boolean;
	stack: string;
	deployment: string;
	databaseNamespace: string;
	commitSha: string;
}

async function readJson<T>(response: Response): Promise<T> {
	const data = (await response.json()) as T & { error?: string };
	if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status})`);
	return data;
}

export default function App() {
	const [health, setHealth] = useState<Health>();
	const [notes, setNotes] = useState<Note[]>([]);
	const [body, setBody] = useState("");
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);

	const load = useCallback(async () => {
		try {
			const [healthResult, notesResult] = await Promise.all([
				fetch("/api/health").then(readJson<Health>),
				fetch("/api/notes").then(readJson<{ notes: Note[] }>),
			]);
			setError("");
			setHealth(healthResult);
			setNotes(notesResult.notes);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "読み込みに失敗しました");
		}
	}, []);

	useEffect(() => {
		// `load` only updates state after its network requests settle.
		// eslint-disable-next-line react-hooks/set-state-in-effect
		void load();
	}, [load]);

	async function submit(event: FormEvent) {
		event.preventDefault();
		if (!body.trim()) return;
		setBusy(true);
		try {
			const { note } = await fetch("/api/notes", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ body }),
			}).then(readJson<{ note: Note }>);
			setNotes((current) => [note, ...current]);
			setBody("");
			setError("");
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "保存に失敗しました");
		} finally {
			setBusy(false);
		}
	}

	return (
		<main>
			<section className="hero">
				<p className="eyebrow">FULL-STACK BRANCH PREVIEW</p>
				<h1>Preview Notes</h1>
				<p className="lead">この画面、Hono API、PlanetScaleのDB namespaceはすべてPR専用です。</p>
			</section>

			<section className="status" aria-label="deployment status">
				<span className={health?.ok ? "dot online" : "dot"} />
				<div>
					<strong>{health?.ok ? "Connected" : "Connecting…"}</strong>
					<small>{health?.databaseNamespace ?? "PlanetScale namespace"}</small>
				</div>
				<code>{health?.commitSha.slice(0, 7) ?? "-------"}</code>
			</section>

			<form onSubmit={submit}>
				<label htmlFor="note">このプレビューだけのメモ</label>
				<div className="composer">
					<input
						id="note"
						value={body}
						onChange={(event) => setBody(event.target.value)}
						maxLength={280}
						placeholder="PlanetScaleへ保存…"
					/>
					<button disabled={busy || !body.trim()}>{busy ? "保存中" : "追加"}</button>
				</div>
			</form>

			{error && <p className="error">{error}</p>}

			<section className="notes" aria-live="polite">
				{notes.length === 0 && !error ? <p className="empty">まだメモはありません。</p> : null}
				{notes.map((note) => (
					<article key={note.id}>
						<p>{note.body}</p>
						<time dateTime={note.createdAt}>{new Date(note.createdAt).toLocaleString("ja-JP")}</time>
					</article>
				))}
			</section>

			<footer>React → Hono → Cloudflare Hyperdrive → PlanetScale</footer>
		</main>
	);
}
