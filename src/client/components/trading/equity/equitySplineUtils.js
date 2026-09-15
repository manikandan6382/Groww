/**
 * Generates smooth cubic Bézier spline for SVG path
 */
export function generateSmoothPath(points, getX, getY) {
  if (!points || points.length === 0) return "";
  if (points.length === 1) {
    const y = getY(points[0].capital);
    return `M ${getX(0)} ${y} L ${getX(1)} ${y}`;
  }
  if (points.length === 2) {
    const p0 = { x: getX(0), y: getY(points[0].capital) };
    const p1 = { x: getX(1), y: getY(points[1].capital) };
    const cx = (p0.x + p1.x) / 2;
    return `M ${p0.x} ${p0.y} C ${cx} ${p0.y}, ${cx} ${p0.y}, ${p1.x} ${p1.y}`;
  }

  let path = `M ${getX(0)} ${getY(points[0].capital)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? { x: getX(i - 1), y: getY(points[i - 1].capital) } : { x: getX(0), y: getY(points[0].capital) };
    const p1 = { x: getX(i), y: getY(points[i].capital) };
    const p2 = { x: getX(i + 1), y: getY(points[i + 1].capital) };
    const p3 = i < points.length - 2 ? { x: getX(i + 2), y: getY(points[i + 2].capital) } : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 5;
    const cp1y = p1.y + (p2.y - p0.y) / 5;
    const cp2x = p2.x - (p3.x - p1.x) / 5;
    const cp2y = p2.y - (p3.y - p1.y) / 5;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return path;
}
