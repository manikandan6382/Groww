import { paperTradeEngine } from "../../services/paperTradeEngine.js";
import { startDotnetEventListener } from "../../services/engine/dotnetEventListener.js";
import { reconcileDotnetPositions } from "../../services/engine/dotnetReconciler.js";

export function ensurePaperEngineStarted() {
  paperTradeEngine.start();
  startDotnetEventListener();
  reconcileDotnetPositions().catch(() => {});
}

export function streamPaperEvents(req, res, url) {
  const afterId = Number(url.searchParams.get("after") || 0);

  req.on("error", () => {});
  res.on("error", () => {});

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-store, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  if (!res.writableEnded && !res.destroyed) {
    try {
      res.write(": connected\n\n");
    } catch {}
  }

  for (const event of paperTradeEngine.getRecentEvents(afterId)) {
    writeSse(res, event);
  }

  const onEvent = (event) => writeSse(res, event);
  const heartbeat = setInterval(() => {
    if (res.writableEnded || res.destroyed) {
      clearInterval(heartbeat);
      return;
    }
    try {
      res.write(`: heartbeat ${Date.now()}\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 25_000);

  paperTradeEngine.on("event", onEvent);
  req.on("close", () => {
    clearInterval(heartbeat);
    paperTradeEngine.off("event", onEvent);
  });
}

function writeSse(res, event) {
  if (!res || res.writableEnded || res.destroyed) return;
  try {
    const payload = {
      ...(event.payload || {}),
      id: event.id,
      type: event.type,
      createdAt: event.createdAt,
    };
    res.write(`id: ${event.id}\n`);
    res.write(`event: ${event.type}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  } catch {}
}
