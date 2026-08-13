interface Hyperdrive {
	host: string;
	user: string;
	password: string;
	database: string;
	port: number;
	connectionString: string;
}

interface Env {
	HYPERDRIVE: Hyperdrive;
	DEPLOYMENT_ENV: string;
	DATABASE_NAMESPACE: string;
	COMMIT_SHA: string;
	PREVIEW_CLEANUP_TOKEN: string;
}
