import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverPath = path.resolve(__dirname, "../src/server.js");

const child = spawn(process.execPath, [serverPath], {
  stdio: ["pipe", "pipe", "inherit"],
});

const messages = [
  {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "smoke", version: "0.1.0" },
    },
  },
  {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {},
  },
];

let output = "";
child.stdout.on("data", (chunk) => {
  output += chunk.toString();
  const lines = output.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length >= 2) {
    const responses = lines.map((line) => JSON.parse(line));
    const toolNames = responses[1].result.tools.map((tool) => tool.name);
    if (!toolNames.includes("kite_holdings") || !toolNames.includes("kite_generate_session")) {
      throw new Error(`Unexpected tools: ${toolNames.join(", ")}`);
    }
    child.kill();
    console.log(`MCP smoke test passed. Tools: ${toolNames.join(", ")}`);
  }
});

for (const message of messages) {
  child.stdin.write(`${JSON.stringify(message)}\n`);
}
