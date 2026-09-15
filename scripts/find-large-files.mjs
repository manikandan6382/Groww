import fs from "fs";
import path from "path";

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (["node_modules", ".git", "dist", "bin", "obj", ".agents", ".gemini", "coverage"].includes(file)) continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith(".js") || file.endsWith(".jsx") || file.endsWith(".ts") || file.endsWith(".tsx") || file.endsWith(".cs") || file.endsWith(".mjs") || file.endsWith(".cjs")) {
      const lines = fs.readFileSync(fullPath, "utf8").split("\n").length;
      if (lines > 150) {
        results.push({ path: fullPath.replace(/\\/g, "/"), lines });
      }
    }
  }
  return results;
}

const largeFiles = walk(".").sort((a, b) => b.lines - a.lines);
console.log(`Total files > 150 lines: ${largeFiles.length}`);
largeFiles.forEach(f => console.log(`${f.lines.toString().padStart(5, " ")} lines: ${f.path}`));
