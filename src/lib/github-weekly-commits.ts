const GITHUB_USERNAME = "shinjipons";

function weekRange(): { from: string; to: string } {
	const to = new Date();
	const from = new Date();
	from.setUTCDate(from.getUTCDate() - 7);
	return { from: from.toISOString(), to: to.toISOString() };
}

/**
 * Commits on the personal GitHub profile in the last 7 days
 * (`contributionsCollection.totalCommitContributions`).
 * Public data works without a token; set `GITHUB_TOKEN` for higher rate limits.
 */
export async function getWeeklyCommitCount(): Promise<number | null> {
	const { from, to } = weekRange();
	const token = import.meta.env.GITHUB_TOKEN;

	const query = `
		query ($login: String!, $from: DateTime!, $to: DateTime!) {
			user(login: $login) {
				contributionsCollection(from: $from, to: $to) {
					totalCommitContributions
				}
			}
		}
	`;

	try {
		const res = await fetch("https://api.github.com/graphql", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
			body: JSON.stringify({
				query,
				variables: { login: GITHUB_USERNAME, from, to },
			}),
		});

		if (!res.ok) return null;

		const data = (await res.json()) as {
			data?: {
				user?: {
					contributionsCollection?: {
						totalCommitContributions?: number;
					};
				};
			};
			errors?: unknown[];
		};

		if (data.errors?.length) return null;

		const count =
			data.data?.user?.contributionsCollection?.totalCommitContributions;

		return typeof count === "number" ? count : null;
	} catch {
		return null;
	}
}
