const GITHUB_USERNAME = "shinjipons";

export type WeeklyGitHubStats = {
	commits: number;
	linesAdded: number;
	linesDeleted: number;
};

function weekRange(): { from: Date; to: Date } {
	const to = new Date();
	const from = new Date();
	from.setUTCDate(from.getUTCDate() - 7);
	return { from, to };
}

/** GitHub `history` filters use `GitTimestamp`, not full ISO `DateTime`. */
function gitTimestamp(date: Date): string {
	return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

async function githubGraphql<T>(
	query: string,
	variables: Record<string, unknown>,
): Promise<T | null> {
	const token = import.meta.env.GITHUB_TOKEN;

	try {
		const res = await fetch("https://api.github.com/graphql", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
			body: JSON.stringify({ query, variables }),
		});

		if (!res.ok) return null;

		const data = (await res.json()) as { data?: T; errors?: unknown[] };
		if (data.errors?.length) return null;

		return data.data ?? null;
	} catch {
		return null;
	}
}

/**
 * Profile activity for the last 7 days: commit count plus lines added/removed.
 * Lines are summed from commits on each contributed repo's default branch (GitHub
 * does not expose a single profile-level LOC field). Set `GITHUB_TOKEN` locally
 * and in production for reliable rate limits.
 */
export async function getWeeklyGitHubStats(): Promise<WeeklyGitHubStats | null> {
	const { from, to } = weekRange();
	const fromIso = from.toISOString();
	const toIso = to.toISOString();

	const idData = await githubGraphql<{ user: { id: string } | null }>(
		`query ($login: String!) { user(login: $login) { id } }`,
		{ login: GITHUB_USERNAME },
	);
	const userId = idData?.user?.id;
	if (!userId) return null;

	const statsData = await githubGraphql<{
		user: {
			contributionsCollection: {
				totalCommitContributions: number;
				commitContributionsByRepository: Array<{
					repository: {
						defaultBranchRef: {
							target: {
								history: {
									nodes: Array<{
										additions: number;
										deletions: number;
									}>;
								};
							} | null;
						} | null;
					};
				}>;
			};
		} | null;
	}>(
		`
			query ($login: String!, $userId: ID!, $from: DateTime!, $to: DateTime!, $since: GitTimestamp!, $until: GitTimestamp!) {
				user(login: $login) {
					contributionsCollection(from: $from, to: $to) {
						totalCommitContributions
						commitContributionsByRepository(maxRepositories: 100) {
							repository {
								defaultBranchRef {
									target {
										... on Commit {
											history(
												since: $since
												until: $until
												author: { id: $userId }
												first: 100
											) {
												nodes {
													additions
													deletions
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
		`,
		{
			login: GITHUB_USERNAME,
			userId,
			from: fromIso,
			to: toIso,
			since: gitTimestamp(from),
			until: gitTimestamp(to),
		},
	);

	const collection = statsData?.user?.contributionsCollection;
	const commits = collection?.totalCommitContributions;
	if (typeof commits !== "number") return null;

	let linesAdded = 0;
	let linesDeleted = 0;

	for (const { repository } of collection?.commitContributionsByRepository ??
		[]) {
		const nodes =
			repository?.defaultBranchRef?.target?.history?.nodes ?? [];
		for (const commit of nodes) {
			linesAdded += commit.additions ?? 0;
			linesDeleted += commit.deletions ?? 0;
		}
	}

	return { commits, linesAdded, linesDeleted };
}
