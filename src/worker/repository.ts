import { createConnection, type Connection, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

export interface Note {
	id: string;
	body: string;
	createdAt: string;
}

export interface NotesRepository {
	health(): Promise<void>;
	list(): Promise<Note[]>;
	create(body: string): Promise<Note>;
}

interface NoteRow extends RowDataPacket {
	id: string;
	body: string;
	createdAt: Date | string;
}

const schema = `
	CREATE TABLE IF NOT EXISTS notes (
		id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
		body VARCHAR(280) NOT NULL,
		created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
		PRIMARY KEY (id)
	)
`;

function serialize(row: NoteRow): Note {
	return {
		id: String(row.id),
		body: row.body,
		createdAt: new Date(row.createdAt).toISOString(),
	};
}

export class PlanetScaleNotesRepository implements NotesRepository {
	constructor(private readonly hyperdrive: Hyperdrive) {}

	private async connect(): Promise<Connection> {
		return createConnection({
			host: this.hyperdrive.host,
			user: this.hyperdrive.user,
			password: this.hyperdrive.password,
			database: this.hyperdrive.database,
			port: this.hyperdrive.port,
			disableEval: true,
		});
	}

	private async withConnection<T>(operation: (connection: Connection) => Promise<T>): Promise<T> {
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
			await connection.query(schema);
			const [rows] = await connection.query<NoteRow[]>(
				"SELECT CAST(id AS CHAR) AS id, body, created_at AS createdAt FROM notes ORDER BY id DESC LIMIT 50",
			);
			return rows.map(serialize);
		});
	}

	async create(body: string): Promise<Note> {
		return this.withConnection(async (connection) => {
			await connection.query(schema);
			const [result] = await connection.execute<ResultSetHeader>("INSERT INTO notes (body) VALUES (?)", [body]);
			const [rows] = await connection.execute<NoteRow[]>(
				"SELECT CAST(id AS CHAR) AS id, body, created_at AS createdAt FROM notes WHERE id = ?",
				[result.insertId],
			);
			const note = rows[0];
			if (!note) throw new Error("Inserted note could not be read back");
			return serialize(note);
		});
	}
}
