import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const index = resolve(dist, "index.html");
const port = Number(process.env.PORT || 3000);
const mime = {
  ".css": "text/css", ".html": "text/html; charset=utf-8", ".js": "text/javascript",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav", ".woff2": "font/woff2",
};

if (!(await stat(index).catch(() => null))?.isFile()) {
  console.error("The preview files are missing. Run npm install and npm run build first.");
  process.exit(1);
}

createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    response.writeHead(400).end();
    return;
  }
  const candidate = resolve(dist, `.${pathname}`);
  const location = relative(dist, candidate);
  if (location === ".." || location.startsWith(`..${sep}`) || isAbsolute(location)) {
    response.writeHead(404).end();
    return;
  }
  const file = (await stat(candidate).catch(() => null))?.isFile() ? candidate
    : pathname === "/" || request.headers.accept?.includes("text/html") ? index
    : null;
  if (!file) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, {
    "Content-Type": mime[extname(file)] || "application/octet-stream",
    "Cache-Control": file !== index && location.startsWith(`assets${sep}`) ? "public, max-age=31536000, immutable" : "no-cache",
  });
  if (request.method === "HEAD") response.end();
  else createReadStream(file).on("error", () => response.destroy()).pipe(response);
}).on("error", error => {
  console.error(error.code === "EADDRINUSE" ? `Port ${port} is in use. Stop the other server first.` : error.message);
  process.exitCode = 1;
}).listen(port, "localhost", () => console.log(`Kuldetek is ready at http://localhost:${port}`));
