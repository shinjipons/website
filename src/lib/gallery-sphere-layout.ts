/**
 * Number of latitude bands (rows) and items per band (columns) so every row has the same count.
 * Chooses a divisor `rows` of n closest to √n (e.g. n=6 → 2×3, n=8 → 2×4, n=9 → 3×3).
 */
export function dimensionsForEqualRows(n: number): { rows: number; perRow: number } {
	if (n <= 0) return { rows: 1, perRow: 1 };
	if (n === 1) return { rows: 1, perRow: 1 };
	const t = Math.sqrt(n);
	let bestR = 1;
	let bestDiff = Infinity;
	for (let r = 1; r <= n; r++) {
		if (n % r !== 0) continue;
		const diff = Math.abs(r - t);
		if (diff < bestDiff - 1e-9) {
			bestDiff = diff;
			bestR = r;
		} else if (Math.abs(diff - bestDiff) < 1e-9 && r < bestR) {
			bestR = r;
		}
	}
	return { rows: bestR, perRow: n / bestR };
}

/**
 * Unit direction for item index i on a sphere: `rows` horizontal bands, `perRow` evenly spaced longitudes per band.
 */
export function equalRowsUnitSphere(i: number, n: number): [number, number, number] {
	if (n <= 0) return [0, 0, 1];
	if (n === 1) return [0, 0, 1];
	const { rows, perRow } = dimensionsForEqualRows(n);
	const row = Math.floor(i / perRow);
	const col = i % perRow;
	const y = 1 - (2 * (row + 0.5)) / rows;
	const ringR = Math.sqrt(Math.max(0, 1 - y * y));
	const psi = (2 * Math.PI * col) / perRow;
	const x = ringR * Math.cos(psi);
	const z = ringR * Math.sin(psi);
	const len = Math.hypot(x, y, z);
	if (len < 1e-10) return [0, 0, 1];
	return [x / len, y / len, z / len];
}

function dot3(
	ax: number,
	ay: number,
	az: number,
	bx: number,
	by: number,
	bz: number,
): number {
	return ax * bx + ay * by + az * bz;
}

function cross3(
	ax: number,
	ay: number,
	az: number,
	bx: number,
	by: number,
	bz: number,
): [number, number, number] {
	return [
		ay * bz - az * by,
		az * bx - ax * bz,
		ax * by - ay * bx,
	];
}

function normalize3(x: number, y: number, z: number): [number, number, number] {
	const len = Math.hypot(x, y, z);
	if (len < 1e-10) return [0, 0, 1];
	return [x / len, y / len, z / len];
}

/** Project `v` onto the plane orthogonal to unit `n`. */
function projectOntoTangentPlane(
	vx: number,
	vy: number,
	vz: number,
	nx: number,
	ny: number,
	nz: number,
): [number, number, number] {
	const d = dot3(vx, vy, vz, nx, ny, nz);
	return [vx - d * nx, vy - d * ny, vz - d * nz];
}

/**
 * Unit vector in the tangent plane pointing toward world +Y (with fallbacks at poles),
 * so card roll is stable and images are not arbitrarily flipped.
 */
function stableTangentUp(
	nx: number,
	ny: number,
	nz: number,
): [number, number, number] {
	const refs: Array<[number, number, number]> = [
		[0, 1, 0],
		[0, 0, 1],
		[1, 0, 0],
	];
	for (const [rx, ry, rz] of refs) {
		const [px, py, pz] = projectOntoTangentPlane(rx, ry, rz, nx, ny, nz);
		const len = Math.hypot(px, py, pz);
		if (len > 1e-6) return normalize3(px, py, pz);
	}
	return [0, 0, 1];
}

/**
 * Rotation matrix (column vectors) as CSS matrix3d: columns are images of local +X, +Y, +Z.
 * Local +Z = outward normal; local +Y = screen-down in CSS, so local −Y aligns with `tangentUp`.
 */
function rotationFromNormalStable(nx: number, ny: number, nz: number): string {
	const [tu0, tu1, tu2] = stableTangentUp(nx, ny, nz);

	const bz0 = nx;
	const bz1 = ny;
	const bz2 = nz;

	const by0 = -tu0;
	const by1 = -tu1;
	const by2 = -tu2;

	const [c0, c1, c2] = cross3(by0, by1, by2, bz0, bz1, bz2);
	const [bx0, bx1, bx2] = normalize3(c0, c1, c2);

	// 180° about local +Z (outward normal): R * Rz(π) → negate X and Y columns.
	return `matrix3d(${-bx0},${-bx1},${-bx2},0,${-by0},${-by1},${-by2},0,${bz0},${bz1},${bz2},0,0,0,0,1)`;
}

/**
 * Full CSS transform for one gallery card: translate to sphere surface, then orient face along the radial.
 * Uses `--gallery-radius` and optional `--gallery-sphere-scale` (default 1) on `.gallery-container`
 * for radial layout. Markup applies `scale(calc(var(--gallery-image-scale, 1) / var(--gallery-sphere-scale, 1)))`
 * so smaller sphere spread is offset by larger tile scale (optional `--gallery-image-scale` multiplier).
 */
export function gallerySphereItemTransform(i: number, n: number): string {
	const [nx, ny, nz] = equalRowsUnitSphere(i, n);
	const rot = rotationFromNormalStable(nx, ny, nz);
	const r = `calc(var(--gallery-radius) * var(--gallery-sphere-scale, 1))`;
	const tx = `calc(${r} * ${nx})`;
	const ty = `calc(${r} * ${ny})`;
	const tz = `calc(${r} * ${nz})`;
	return `translate3d(${tx},${ty},${tz}) ${rot}`;
}
