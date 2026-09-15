import { getAccent } from "./app-theme.js";

function compactRupee(value) {
  const num = Number(value || 0);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}k`;
  return `₹${num.toFixed(0)}`;
}

export function drawDonut(canvas, values, palette, totalValue = 0) {
  const ctx = canvas.getContext("2d");
  const total = values.reduce((sum, value) => sum + value, 0) || 1;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = 70;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  let start = -Math.PI / 2;
  values.forEach((value, index) => {
    const angle = (value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, start, start + angle);
    ctx.lineWidth = 24;
    ctx.lineCap = "butt";
    ctx.strokeStyle = palette[index % palette.length];
    ctx.stroke();
    start += angle;
  });
  ctx.fillStyle = "#f4f8ff";
  ctx.font = "800 18px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(compactRupee(totalValue), cx, cy - 2);
  ctx.fillStyle = "#8fa6bd";
  ctx.font = "12px Inter, sans-serif";
  ctx.fillText("Total", cx, cy + 18);
}

export function drawHealth(canvas, score) {
  const ctx = canvas.getContext("2d");
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = 54;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0, 149, 255, 0.16)";
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (score / 100));
  ctx.strokeStyle = getAccent();
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(0, 213, 255, 0.7)";
  ctx.shadowBlur = 16;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#f4f8ff";
  ctx.font = "800 32px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(String(score), cx, cy + 4);
  ctx.fillStyle = "#00f5c4";
  ctx.font = "12px Inter, sans-serif";
  ctx.fillText(score > 75 ? "Excellent" : score > 55 ? "Watch" : "Risky", cx, cy + 28);
}

export function drawLine(canvas, values, color, fill = true) {
  if (!canvas || !canvas.getContext) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || canvas.width || 96;
  const height = rect.height || canvas.height || 38;

  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }

  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const pad = fill ? 18 : 2;
  if (!values || values.length < 2) {
    ctx.fillStyle = "rgba(143, 166, 189, 0.7)";
    ctx.font = fill ? "13px Inter, sans-serif" : "10px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No live chart", width / 2, height / 2);
    ctx.restore();
    return;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => ({
    x: pad + (index / (values.length - 1)) * (width - pad * 2),
    y: height - pad - ((value - min) / span) * (height - pad * 2),
  }));

  const buildSmoothPath = (context) => {
    context.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      context.quadraticCurveTo(curr.x, curr.y, (curr.x + next.x) / 2, (curr.y + next.y) / 2);
    }
    context.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  };

  if (fill) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "rgba(0, 213, 255, 0.28)");
    gradient.addColorStop(0.7, "rgba(0, 213, 255, 0.06)");
    gradient.addColorStop(1, "rgba(0, 213, 255, 0)");
    ctx.beginPath();
    buildSmoothPath(ctx);
    ctx.lineTo(points.at(-1).x, height - pad);
    ctx.lineTo(points[0].x, height - pad);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  ctx.beginPath();
  buildSmoothPath(ctx);
  ctx.strokeStyle = color;
  ctx.lineWidth = fill ? 2.5 : 1.8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.restore();
}
