export type RaindropLike = {
	id: number;
	title: string;
	link: string;
	domain: string;
	cover: string;
};

type RaindropApiItem = {
	_id: number;
	title: string;
	link: string;
	domain: string;
	type?: string;
	created?: string;
	lastUpdate?: string;
	cover?: string;
	media?: Array<{ link?: string }>;
};

type RaindropsResponse = {
	result: boolean;
	items?: RaindropApiItem[];
};

const LIKES_LIMIT = 9;
const COVER_CHECK_TIMEOUT_MS = 8000;
const MAX_PAGES = 5;
const PER_PAGE = 50;
const DEFAULT_COLLECTION_ID = "70973402";

function collectionId(): string {
	return import.meta.env.RAINDROP_COLLECTION_ID ?? DEFAULT_COLLECTION_ID;
}

function coverFromItem(item: RaindropApiItem): string | undefined {
	if (item.cover) return item.cover;
	const mediaLink = item.media?.find((m) => m.link)?.link;
	return mediaLink || undefined;
}

function itemRecencyMs(item: RaindropApiItem): number {
	const raw = item.lastUpdate ?? item.created;
	if (!raw) return 0;
	const ms = Date.parse(raw);
	return Number.isFinite(ms) ? ms : 0;
}

function mapItem(item: RaindropApiItem, cover: string): RaindropLike {
	return {
		id: item._id,
		title: item.title,
		link: item.link,
		domain: item.domain,
		cover,
	};
}

function isImageContentType(contentType: string | null): boolean {
	if (!contentType) return false;
	return /^image\//i.test(contentType.split(";")[0].trim());
}

async function isCoverUrlValid(url: string): Promise<boolean> {
	const probe = async (method: "HEAD" | "GET"): Promise<boolean> => {
		const controller = new AbortController();
		const timeoutId = setTimeout(
			() => controller.abort(),
			COVER_CHECK_TIMEOUT_MS,
		);

		try {
			const res = await fetch(url, {
				method,
				signal: controller.signal,
				redirect: "follow",
				headers: method === "GET" ? { Range: "bytes=0-0" } : undefined,
			});

			if (!res.ok) return false;
			return isImageContentType(res.headers.get("content-type"));
		} catch {
			return false;
		} finally {
			clearTimeout(timeoutId);
		}
	};

	if (await probe("HEAD")) return true;
	return probe("GET");
}

async function fetchImageCandidates(token: string): Promise<RaindropApiItem[]> {
	const collected: RaindropApiItem[] = [];

	for (let page = 0; page < MAX_PAGES; page++) {
		const params = new URLSearchParams({
			search: "type:image",
			sort: "-created",
			perpage: String(PER_PAGE),
			page: String(page),
		});

		const res = await fetch(
			`https://api.raindrop.io/rest/v1/raindrops/${collectionId()}?${params}`,
			{ headers: { Authorization: `Bearer ${token}` } },
		);

		if (!res.ok) break;

		const data = (await res.json()) as RaindropsResponse;
		if (!data.result || !data.items?.length) break;

		collected.push(...data.items.filter((item) => item.type === "image"));

		if (data.items.length < PER_PAGE) break;
	}

	return collected.sort((a, b) => itemRecencyMs(b) - itemRecencyMs(a));
}

/**
 * The 9 most recent image bookmarks from RAINDROP_COLLECTION_ID (default 70973402).
 * Grid shows the cover image; each card links to that bookmark's original URL (`link`).
 */
export async function getRaindropLikes(): Promise<RaindropLike[] | null> {
	const token = import.meta.env.RAINDROP_TOKEN;
	if (!token) return null;

	try {
		const candidates = await fetchImageCandidates(token);
		if (!candidates.length) return null;

		const valid: RaindropLike[] = [];

		for (const item of candidates) {
			if (valid.length >= LIKES_LIMIT) break;

			if (!item.link) continue;

			const cover = coverFromItem(item);
			if (!cover) continue;
			if (!(await isCoverUrlValid(cover))) continue;

			valid.push(mapItem(item, cover));
		}

		return valid.length ? valid : null;
	} catch {
		return null;
	}
}
