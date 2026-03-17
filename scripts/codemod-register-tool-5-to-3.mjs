#!/usr/bin/env node
/**
 * Codemod: Convert 5-arg server.registerTool(name, {}, description, inputSchema, cb)
 * to 3-arg server.registerTool(name, { description, inputSchema }, cb)
 * and add explicit param types to avoid implicit any.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, "..", "src");

const FILES = [
  path.join(SRC, "tools/custodial/index.ts"),
  path.join(SRC, "tools/custodial-solution/index.ts"),
  path.join(SRC, "tools/creditline/index.ts"),
];

function findMatchingBrace(str, start, open = "{", close = "}") {
  let depth = 0;
  for (let i = start; i < str.length; i++) {
    if (str[i] === open) depth++;
    else if (str[i] === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findMatchingParen(str, start) {
  return findMatchingBrace(str, start, "(", ")");
}

function findTemplateLiteralEnd(str, start) {
  let i = start;
  if (str[i] !== "`") return -1;
  i++;
  while (i < str.length) {
    if (str[i] === "\\") {
      i += 2;
      continue;
    }
    if (str[i] === "`") return i;
    if (str[i] === "${") {
      const end = findMatchingBrace(str, i + 1, "{", "}");
      if (end >= 0) i = end + 1;
      else i++;
      continue;
    }
    i++;
  }
  return -1;
}

function transformFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  const original = content;
  let changed = false;

  while (true) {
    const idx = content.indexOf("server.registerTool(");
    if (idx < 0) break;
    const openParen = idx + "server.registerTool".length;
    const closeParen = findMatchingParen(content, openParen);
    if (closeParen < 0) break;

    const argsStr = content.slice(openParen + 1, closeParen);
    let i = 0;
    while (i < argsStr.length && /\s/.test(argsStr[i])) i++;
    if (i >= argsStr.length) break;

    const firstCh = argsStr[i];
    if (firstCh !== '"' && firstCh !== "'") break;
    const q = firstCh;
    let nameEnd = i + 1;
    while (nameEnd < argsStr.length && argsStr[nameEnd] !== q) {
      if (argsStr[nameEnd] === "\\") nameEnd++;
      nameEnd++;
    }
    const name = argsStr.slice(i + 1, nameEnd).replace(/\\"/g, '"');
    i = nameEnd + 1;
    while (i < argsStr.length && /[\s,]/.test(argsStr[i])) i++;
    if (i >= argsStr.length) break;
    if (argsStr[i] !== "{") break;
    const emptyEnd = findMatchingBrace(argsStr, i);
    if (emptyEnd < 0) break;
    const emptyStr = argsStr.slice(i, emptyEnd + 1);
    if (emptyStr.replace(/\s/g, "") !== "{}") break;
    i = emptyEnd + 1;
    while (i < argsStr.length && /[\s,]/.test(argsStr[i])) i++;
    if (i >= argsStr.length) break;
    if (argsStr[i] !== "`") break;
    const descEnd = findTemplateLiteralEnd(argsStr, i);
    if (descEnd < 0) break;
    const description = argsStr.slice(i, descEnd + 1);
    i = descEnd + 1;
    while (i < argsStr.length && /[\s,]/.test(argsStr[i])) i++;
    if (i >= argsStr.length || argsStr[i] !== "{") break;
    const schemaEnd = findMatchingBrace(argsStr, i);
    if (schemaEnd < 0) break;
    const schemaStr = argsStr.slice(i, schemaEnd + 1);
    i = schemaEnd + 1;
    while (i < argsStr.length && /[\s,]/.test(argsStr[i])) i++;
    const callbackStr = argsStr.slice(i).trim();
    if (!callbackStr.startsWith("async")) break;

    const configObj = `{\n      description: ${description},\n      inputSchema: ${schemaStr},\n    }`;
    let newCallback = callbackStr;
    const paramsMatch = callbackStr.match(/async\s*\(\s*\{\s*([^}]*)\s*\}\s*\)\s*=>/);
    if (paramsMatch) {
      const keys = paramsMatch[1].split(",").map((k) => k.trim());
      const typeStr = keys.map((k) => `${k}?: unknown`).join("; ");
      newCallback = callbackStr.replace(
        /async\s*\(\s*\{\s*[^}]*\s*\}\s*\)\s*=>/,
        `async (params: { ${typeStr} }) => { const { ${keys.join(", ")} } = params;`
      );
    } else if (callbackStr.includes("async (params)")) {
      newCallback = callbackStr.replace("async (params)", "async (params: Record<string, unknown>)");
    }

    const newArgs = `"${name.replace(/"/g, '\\"')}",\n    ${configObj},\n    ${newCallback}`;
    content =
      content.slice(0, idx) +
      "server.registerTool(" +
      newArgs +
      content.slice(closeParen);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, "utf8");
    return true;
  }
  return false;
}

for (const filePath of FILES) {
  if (!fs.existsSync(filePath)) {
    console.warn("Skip (not found):", filePath);
    continue;
  }
  let count = 0;
  while (true) {
    const content = fs.readFileSync(filePath, "utf8");
    const idx = content.indexOf("server.registerTool(");
    if (idx < 0) break;
    const openParen = content.indexOf("(", idx);
    const closeParen = findMatchingParen(content, openParen);
    if (closeParen < 0) break;
    const argsStr = content.slice(openParen + 1, closeParen);
    let i = 0;
    while (i < argsStr.length && /\s/.test(argsStr[i])) i++;
    if (i >= argsStr.length || (argsStr[i] !== '"' && argsStr[i] !== "'")) break;
    const q = argsStr[i];
    const nameStart = i + 1;
    let nameEnd = nameStart;
    while (nameEnd < argsStr.length && argsStr[nameEnd] !== q) {
      if (argsStr[nameEnd] === "\\") nameEnd++;
      nameEnd++;
    }
    const name = argsStr.slice(nameStart, nameEnd).replace(/\\"/g, '"');
    i = nameEnd + 1;
    while (i < argsStr.length && /[\s,]/.test(argsStr[i])) i++;
    if (i >= argsStr.length || argsStr[i] !== "{") break;
    const emptyEnd = findMatchingBrace(argsStr, i);
    if (emptyEnd < 0 || argsStr.slice(i, emptyEnd + 1).replace(/\s/g, "") !== "{}") break;
    i = emptyEnd + 1;
    while (i < argsStr.length && /[\s,]/.test(argsStr[i])) i++;
    if (i >= argsStr.length || argsStr[i] !== "`") break;
    const descEnd = findTemplateLiteralEnd(argsStr, i);
    if (descEnd < 0) break;
    const description = argsStr.slice(i, descEnd + 1);
    i = descEnd + 1;
    while (i < argsStr.length && /[\s,]/.test(argsStr[i])) i++;
    if (i >= argsStr.length || argsStr[i] !== "{") break;
    const schemaEnd = findMatchingBrace(argsStr, i);
    if (schemaEnd < 0) break;
    const schemaStr = argsStr.slice(i, schemaEnd + 1);
    i = schemaEnd + 1;
    while (i < argsStr.length && /[\s,]/.test(argsStr[i])) i++;
    const callbackStr = argsStr.slice(i).trim();
    if (!callbackStr.startsWith("async")) break;
    const configObj = `{\n      description: ${description},\n      inputSchema: ${schemaStr},\n    }`;
    let newCallback = callbackStr;
    const paramsMatch = callbackStr.match(/async\s*\(\s*\{\s*([^}]*)\s*\}\s*\)\s*=>/);
    if (paramsMatch) {
      const keys = paramsMatch[1].split(",").map((k) => k.trim());
      const typeStr = keys.map((k) => `${k}?: unknown`).join("; ");
      newCallback = callbackStr.replace(
        /async\s*\(\s*\{\s*[^}]*\s*\}\s*\)\s*=>/,
        `async (params: { ${typeStr} }) => { const { ${keys.join(", ")} } = params;`
      );
    } else if (callbackStr.includes("async (params)")) {
      newCallback = callbackStr.replace("async (params)", "async (params: Record<string, unknown>)");
    }
    const newArgs = `"${name.replace(/"/g, '\\"')}",\n    ${configObj},\n    ${newCallback}`;
    const newContent =
      content.slice(0, idx) + "server.registerTool(" + newArgs + content.slice(closeParen + 1);
    fs.writeFileSync(filePath, newContent, "utf8");
    count++;
  }
  if (count > 0) console.log("Updated", count, "tool(s) in", path.relative(SRC, filePath));
}

console.log("Done.");
