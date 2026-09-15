import fs from "fs";
import path from "path";

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (["node_modules", ".git", "dist", "bin", "obj", ".agents", ".gemini", "coverage"].includes(file)) continue;
    const fullPath = path.join(dir, file);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        results = results.concat(walk(fullPath));
      } else if (/\.(js|jsx|ts|tsx|cs|html|css|scss|mjs|cjs)$/.test(file)) {
        const lines = fs.readFileSync(fullPath, "utf8").split("\n").length;
        if (lines > 200) {
          results.push({ path: path.relative(".", fullPath).replace(/\\/g, "/"), lines });
        }
      }
    } catch {}
  }
  return results;
}

const largeFiles = walk(".").sort((a, b) => b.lines - a.lines);
console.log(`TOTAL_COUNT:${largeFiles.length}`);
console.log("----------------------------------------");
largeFiles.forEach(f => console.log(`${f.lines.toString().padStart(5, " ")} lines | ${f.path}`));
