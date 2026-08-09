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
	PLANETSCALE_BRANCH: string;
	COMMIT_SHA: string;
}
