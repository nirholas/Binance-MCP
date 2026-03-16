#!/usr/bin/env node
/**
 * Codemod: Replace deprecated server.tool(...) with server.registerTool(...).
 * Patterns:
 *   server.tool(name, description, schema, cb) -> server.registerTool(name, { description, inputSchema: schema }, cb)
 *   server.tool(name, description, {}, cb) -> server.registerTool(name, { description }, cb)
 *   server.tool(name, schema, cb) -> server.registerTool(name, { inputSchema: schema }, cb)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, "..", "src");

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

/** Find end of next top-level argument (string, object, or async function start). */
function skipArg(content, i) {
  const rest = content.slice(i);
  const trimmed = rest.replace(/^\s*,?\s*/s, "");
  const skipped = rest.length - trimmed.length;
  i += skipped;
  const ch = content[i];
  if (ch === '"' || ch === "'") {
    const q = ch;
    i++;
    while (i < content.length && content[i] !== q) {
      if (content[i] === "\\") i++;
      i++;
    }

    return i + 1;
  }
  if (ch === "{") {
    const end = findMatchingBrace(content, i);

    return end >= 0 ? end + 1 : i;
  }
  if (ch === "(") {
    const end = findMatchingParen(content, i);

    return end >= 0 ? end + 1 : i;
  }
  if (ch === "a" && content.slice(i, i + 5) === "async") {
    const parenStart = content.indexOf("(", i);
    if (parenStart >= 0) {
      const end = findMatchingParen(content, parenStart);

      return end >= 0 ? end + 1 : i;
    }
  }

  return i;
}

function transformFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  const original = content;
  let changed = false;

  while (true) {
    const idx = content.indexOf("server.tool(");
    if (idx < 0) break;

    const openParen = idx + "server.tool".length;
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
    const secondCh = argsStr[i];
    let description = null;
    let schemaStr = null;

    if (secondCh === '"' || secondCh === "'") {
      const q2 = secondCh;
      let descEnd = i + 1;
      while (descEnd < argsStr.length && argsStr[descEnd] !== q2) {
        if (argsStr[descEnd] === "\\") descEnd++;
        descEnd++;
      }
      description = argsStr.slice(i + 1, descEnd).replace(/\\"/g, '"');
      i = descEnd + 1;
      while (i < argsStr.length && /[\s,]/.test(argsStr[i])) i++;
      if (i >= argsStr.length) break;
      if (argsStr[i] === "{") {
        const end = findMatchingBrace(argsStr, i);
        schemaStr = end >= 0 ? argsStr.slice(i, end + 1) : "{}";
        i = end + 1;
      }
    } else if (secondCh === "{") {
      const end = findMatchingBrace(argsStr, i);
      schemaStr = end >= 0 ? argsStr.slice(i, end + 1) : "{}";
      i = end + 1;
    }

    while (i < argsStr.length && /[\s,]/.test(argsStr[i])) i++;
    const callbackStart = i;
    const callbackStr = argsStr.slice(callbackStart).trim();
    const restOfCall = content.slice(closeParen + 1);

    const isEmptySchema =
      schemaStr === "{}" || (schemaStr && schemaStr.replace(/\s/g, "") === "{}");
    let configObj;
    if (description !== null && isEmptySchema) {
      configObj = `{ description: ${JSON.stringify(description)} }`;
    } else if (description !== null && schemaStr) {
      configObj = `{\n      description: ${JSON.stringify(description)},\n      inputSchema: ${schemaStr},\n    }`;
    } else if (schemaStr) {
      configObj = `{\n      inputSchema: ${schemaStr},\n    }`;
    } else {
      configObj = "{}";
    }

    const newArgs = `"${name.replace(/"/g, '\\"')}",\n    ${configObj},\n    ${callbackStr}`;
    content = content.slice(0, idx) + "server.registerTool(" + newArgs + content.slice(closeParen);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, "utf8");

    return true;
  }

  return false;
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== "node_modules") {
      walk(full);
    } else if (e.isFile() && e.name.endsWith(".ts")) {
      try {
        const raw = fs.readFileSync(full, "utf8");
        if (raw.includes("server.tool(")) {
          if (transformFile(full)) {
            console.log("Updated:", path.relative(SRC, full));
          }
        }
      } catch (err) {
        console.error("Error processing", full, err.message);
      }
    }
  }
}

walk(SRC);
console.log("Done.");
