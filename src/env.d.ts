/// <reference types="astro/client" />

interface ImportMetaEnv {
	readonly GITHUB_TOKEN?: string;
	readonly RAINDROP_TOKEN?: string;
	readonly RAINDROP_COLLECTION_ID?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
