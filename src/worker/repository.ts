import { Client, type QueryResultRow } from "pg";

export interface Note {
	id: string;
	body: string;
	createdAt: string;
}

export interface NotesRepository {
	health(): Promise<void>;
	list(): Promise<Note[]>;
	create(body: string): Promise<Note>;
	cleanup(): Promise<void>;
}

interface NoteRow extends QueryResultRow {
	id: string;
	body: string;
	createdAt: Date | string;
}

function serialize(row: NoteRow): Note {
	return {
		id: String(row.id),
		body: row.body,
		createdAt: new Date(row.createdAt).toISOString(),
	};
}

export function validateNamespace(namespace: string): string {
	if (!/^pr_[1-9][0-9]*$/.test(namespace)) {
		throw new Error(`Invalid preview database namespace: ${namespace}`);
	}
	return namespace;
}

export class PlanetScaleNotesRepository implements NotesRepository {
	private readonly namespace: string;

	constructor(
		private readonly hyperdrive: Hyperdrive,
		namespace: string,
	) {
		this.namespace = validateNamespace(namespace);
	}

	private async connect(): Promise<Client> {
		const connection = new Client({ connectionString: this.hyperdrive.connectionString });
		await connection.connect();
		return connection;
	}

	private async withConnection<T>(operation: (connection: Client) => Promise<T>): Promise<T> {
		const connection = await this.connect();
		try {
			return await operation(connection);
		} finally {
			await connection.end();
		}
	}

	async health(): Promise<void> {
		await this.withConnection(async (connection) => {
			await connection.query("SELECT 1");
		});
	}

	async list(): Promise<Note[]> {
		return this.withConnection(async (connection) => {
			const result = await connection.query<NoteRow>(
				`SELECT id::text AS id, body, created_at AS "createdAt"
				 FROM public.preview_notes
				 WHERE namespace = $1
				 ORDER BY id DESC
				 LIMIT 50`,
				[this.namespace],
			);
			return result.rows.map(serialize);
		});
	}

	async create(body: string): Promise<Note> {
		return this.withConnection(async (connection) => {
			const result = await connection.query<NoteRow>(
				`INSERT INTO public.preview_notes (namespace, body) VALUES ($1, $2)
				 RETURNING id::text AS id, body, created_at AS "createdAt"`,
				[this.namespace, body],
			);
			const note = result.rows[0];
			if (!note) throw new Error("Inserted note could not be read back");
			return serialize(note);
		});
	}

	async cleanup(): Promise<void> {
		await this.withConnection(async (connection) => {
			await connection.query("DELETE FROM public.preview_notes WHERE namespace = $1", [this.namespace]);
		});
	}
}
