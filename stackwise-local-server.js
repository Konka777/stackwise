// Local-only Stackwise server. Run: node stackwise-local-server.js
import { createServer } from "node:http";
import { readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const folder = dirname(fileURLToPath(import.meta.url));
const appFile = join(folder, "stackwise-file-storage.html");
const dataFile = join(folder, "stackwise-data.json");
const port = 3030;

function send(response, status, body, type = "text/plain; charset=utf-8") {
  response.writeHead(status, { "content-type": type, "cache-control": "no-store" });
  response.end(body);
}

createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/") {
      return send(response, 200, await readFile(appFile), "text/html; charset=utf-8");
    }
    if (request.method === "GET" && request.url === "/api/cards") {
      return send(response, 200, await readFile(dataFile), "application/json; charset=utf-8");
    }
    if (request.method === "PUT" && request.url === "/api/cards") {
      let body = "";
      for await (const part of request) {
        body += part;
        if (body.length > 1_000_000) return send(response, 413, "Data file is too large.");
      }
      const data = JSON.parse(body);
      if (!Array.isArray(data.cards)) return send(response, 400, "Expected a cards array.");
      const tempFile = `${dataFile}.tmp`;
      await writeFile(tempFile, `${JSON.stringify(data, null, 2)}\n`);
      await rename(tempFile, dataFile);
      return send(response, 204, "");
    }
    send(response, 404, "Not found");
  } catch (error) {
    send(response, 500, error instanceof Error ? error.message : "Unexpected error");
  }
}).listen(port, () => console.log(`Stackwise is ready at http://localhost:${port}`));
