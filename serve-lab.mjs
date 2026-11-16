import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { realpath, readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { normalizePlan } from './dist/plans-core.js';

const roomLifetime = 8 * 60 * 60 * 1000;
const maxRooms = 48;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };

export function createRoomStore(clock = Date.now) {
  const rooms = new Map();
  function prune() {
    const now = clock();
    for (const [id, room] of rooms) if (room.expires <= now) rooms.delete(id);
  }
  function get(id, key) {
    prune();
    const room = rooms.get(id);
    if (!room || !/^[a-f0-9]{40}$/.test(key)) return null;
    if (!timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(room.key, 'hex'))) return null;
    return room;
  }
  function snapshot(room) { return { revision: room.revision, plan: { ...room.plan } }; }
  return {
    create(input) {
      prune();
      if (rooms.size >= maxRooms) return { status: 429, data: { error: 'Room capacity reached.' } };
      const plan = normalizePlan(input?.plan);
      if (!plan.title) return { status: 400, data: { error: 'The plan needs a name.' } };
      let id;
      do { id = randomBytes(6).toString('hex'); } while (rooms.has(id));
      const key = randomBytes(20).toString('hex');
      const room = { key, plan, revision: 1, expires: clock() + roomLifetime };
      rooms.set(id, room);
      return { status: 201, data: { code: id + '.' + key, ...snapshot(room) } };
    },
    read(id, key) {
      const room = get(id, key);
      return room ? { status: 200, data: snapshot(room) } : { status: 404, data: { error: 'Room unavailable.' } };
    },
    update(id, key, input) {
      const room = get(id, key);
      if (!room) return { status: 404, data: { error: 'Room unavailable.' } };
      if (input?.revision !== room.revision) return { status: 409, data: { error: 'The room has a newer revision.' } };
      const plan = normalizePlan(input.plan);
      if (!plan.title) return { status: 400, data: { error: 'The plan needs a name.' } };
      room.plan = plan;
      room.revision += 1;
      return { status: 200, data: snapshot(room) };
    },
  };
}

function json(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  response.end(JSON.stringify(data));
}

async function body(request) {
  if (!request.headers['content-type']?.startsWith('application/json')) throw new Error('JSON required.');
  if (Number(request.headers['content-length']) > 32768) throw new Error('Plan too large.');
  let used = 0;
  const chunks = [];
  for await (const chunk of request) {
    used += chunk.length;
    if (used > 32768) throw new Error('Plan too large.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export async function makeServer() {
  const docs = await realpath(fileURLToPath(new URL('./dist/', import.meta.url)));
  const rooms = createRoomStore();
  return createServer(async (request, response) => {
    try {
      const route = new URL(request.url ?? '/', 'http://localhost').pathname;
      if (route.startsWith('/api/flylab/')) {
        const origin = request.headers.origin;
        if (origin && (!/^https?:\/\//.test(origin) || new URL(origin).host !== request.headers.host)) return json(response, 403, { error: 'Use the FlyLab origin.' });
        const [id] = /^\/api\/flylab\/rooms\/([a-f0-9]{12})$/.exec(route)?.slice(1) ?? [];
        const key = /^Bearer ([a-f0-9]{40})$/.exec(request.headers.authorization ?? '')?.[1] ?? '';
        let result;
        if (route === '/api/flylab/rooms' && request.method === 'POST') result = rooms.create(await body(request));
        else if (id && request.method === 'GET') result = rooms.read(id, key);
        else if (id && request.method === 'PUT') result = rooms.update(id, key, await body(request));
        else return json(response, 404, { error: 'Unknown FlyLab endpoint.' });
        return json(response, result.status, result.data);
      }
      if (!['GET', 'HEAD'].includes(request.method)) return json(response, 405, { error: 'Unsupported request.' });
      const part = decodeURIComponent(route === '/' ? '/index.html' : route);
      if (!/^\/[a-zA-Z0-9_/.-]+$/.test(part) || part.split('/').some(fragment => fragment === '..' || fragment.startsWith('.'))) return json(response, 404, { error: 'File unavailable.' });
      const kind = types[extname(part)];
      if (!kind) return json(response, 404, { error: 'File unavailable.' });
      let file;
      try { file = await realpath(resolve(docs, '.' + part)); } catch { return json(response, 404, { error: 'File unavailable.' }); }
      const underRoot = process.platform === 'win32' ? file.toLowerCase().startsWith((docs + sep).toLowerCase()) : file.startsWith(docs + sep);
      if (!underRoot || !(await stat(file)).isFile()) return json(response, 404, { error: 'File unavailable.' });
      const content = await readFile(file);
      response.writeHead(200, { 'Content-Type': kind, 'Content-Length': content.length, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
      if (request.method === 'HEAD') response.end();
      else response.end(content);
    } catch {
      if (!response.headersSent && !response.destroyed) json(response, 400, { error: 'The request could not be read.' });
      else response.end();
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const arg = name => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined;
  const port = Number(arg('--port') ?? 8842);
  const host = arg('--host') ?? '127.0.0.1';
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Choose a valid port.');
  const server = await makeServer();
  server.listen(port, host, () => console.log('FlyLab URL: http://' + (host.includes(':') ? '[' + host + ']' : host) + ':' + port + '/'));
}

