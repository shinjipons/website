const PAGE_REVEAL_ANIMATION_NAMES = new Set([
	"page-reveal",
	"page-reveal-from-left",
]);

export type PageRevealOptions = {
	indexOffset?: number;
	variant?: "default" | "from-left";
};

export function initPageReveal(
	container: Element | null,
	selector: string,
	options: PageRevealOptions = {},
): void {
	if (!container) return;

	const { indexOffset = 0, variant = "default" } = options;

	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		container.classList.add("page-reveal-ready");
		return;
	}

	container.querySelectorAll(selector).forEach((el, index) => {
		el.setAttribute(
			"data-page-reveal",
			variant === "from-left" ? "from-left" : "",
		);
		(el as HTMLElement).style.setProperty(
			"--page-reveal-index",
			String(index + indexOffset),
		);
		el.addEventListener(
			"animationend",
			(event) => {
				if (!PAGE_REVEAL_ANIMATION_NAMES.has(event.animationName)) {
					return;
				}
				el.removeAttribute("data-page-reveal");
				(el as HTMLElement).style.removeProperty("--page-reveal-index");
			},
			{ once: true },
		);
	});

	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			container.classList.add("page-reveal-ready");
		});
	});
}
