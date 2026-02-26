function normalizeSearchQuery(query: string): string {
	return query.trim();
}

export function createSidebarSearchMatcher(query: string): (candidate: string) => boolean {
	const normalizedQuery = normalizeSearchQuery(query);
	if (normalizedQuery.length === 0) {
		return () => true;
	}

	try {
		const regex = new RegExp(normalizedQuery, "i");
		return (candidate) => regex.test(candidate);
	} catch {
		const loweredQuery = normalizedQuery.toLowerCase();
		return (candidate) => candidate.toLowerCase().includes(loweredQuery);
	}
}

export function filterItemsBySidebarSearch<T>(
	items: ReadonlyArray<T>,
	query: string,
	selectSearchText: (item: T) => string
): T[] {
	const normalizedQuery = normalizeSearchQuery(query);
	if (normalizedQuery.length === 0) {
		return [...items];
	}

	const matcher = createSidebarSearchMatcher(normalizedQuery);
	return items.filter((item) => matcher(selectSearchText(item)));
}
