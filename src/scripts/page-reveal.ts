export function initPageReveal(
	container: Element | null,
	selector: string,
): void {
	if (!container) return;

	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		container.classList.add("page-reveal-ready");
		return;
	}

	container.querySelectorAll(selector).forEach((el, index) => {
		el.setAttribute("data-page-reveal", "");
		(el as HTMLElement).style.setProperty(
			"--page-reveal-index",
			String(index),
		);
	});

	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			container.classList.add("page-reveal-ready");
		});
	});
}
