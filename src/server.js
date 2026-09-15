import path from "node:path";
import readline from "node:readline";
import { tools } from "./mcp/kite-tools.js";
import { projectRoot, loadDotEnv } from "./mcp/kite-client.js";
import { handlers } from "./mcp/kite-handlers.js";

loadDotEnv(path.join(projectRoot, ".env"));

function textContent(value) {
  return [
    {
      type: "text",
      text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
    },
  ];
}

async function handleRequest(message) {
  if (message.method === "initialize") {
    return {
      protocolVersion: message.params?.protocolVersion || "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "zerodha-kite-mcp", version: "0.1.0" },
    };
  }

  if (message.method === "notifications/initialized") {
    return undefined;
  }

  if (message.method === "tools/list") {
    return { tools };
  }

  if (message.method === "tools/call") {
    const name = message.params?.name;
    const args = message.params?.arguments || {};
    const handler = handlers[name];
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }
    const result = await handler(args);
    return {
      content: textContent(result),
    };
  }

  throw new Error(`Unsupported method: ${message.method}`);
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

rl.on("line", async (line) => {
  if (!line.trim()) return;
  let message;
  try {
    message = JSON.parse(line);
  } catch (error) {
    send({
      jsonrpc: "2.0",
      error: { code: -32700, message: `Parse error: ${error.message}` },
      id: null,
    });
    return;
  }

  try {
    const result = await handleRequest(message);
    if (message.id !== undefined && result !== undefined) {
      send({ jsonrpc: "2.0", id: message.id, result });
    }
  } catch (error) {
    if (message.id !== undefined) {
      send({
        jsonrpc: "2.0",
        id: message.id,
        error: {
          code: -32000,
          message: error.message,
          data: error.payload || undefined,
        },
      });
    }
  }
});
