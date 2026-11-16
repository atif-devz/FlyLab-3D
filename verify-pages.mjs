import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const root = resolve(process.argv[2] || 'pages-build');
const base = new URL(process.argv[3] || process.env.PAGES_BASE);
base.pathname = base.pathname.replace(/\/+$/, '') + '/';
const unescape = value => value.replaceAll('&amp;', '&').replaceAll('&#39;', "'").replaceAll('&quot;', '"');
const sitemap = await readFile(join(root, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => new URL(unescape(match[1])));
assert.equal(urls.length, 10);
assert.equal(new Set(urls.map(url => url.href)).size, 10);
const robots = await readFile(join(root, 'robots.txt'), 'utf8');
assert.match(robots, /^User-agent: \*\nAllow: \/\n/);
assert.ok(robots.includes('Sitemap: ' + new URL('sitemap.xml', base).href));
const social = await readFile(join(root, 'flylab-social.png'));
assert.equal(social.readUInt32BE(16), 1200);
assert.equal(social.readUInt32BE(20), 630);
const titles = new Set(), descriptions = new Set(), routes = new Set();
for (const url of urls) {
  assert.equal(url.origin, base.origin);
  assert.ok(url.pathname.startsWith(base.pathname));
  assert.match(url.pathname, /\/$/);
  const path = url.pathname.slice(base.pathname.length);
  const html = await readFile(join(root, path, 'index.html'), 'utf8');
  assert.equal(unescape(html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? ''), url.href);
  assert.doesNotMatch(html, /<meta name="robots" content="[^"]*noindex/i);
  assert.equal((html.match(/<h1(?:\s|>)/g) ?? []).length, 1);
  titles.add(html.match(/<title>([^<]+)<\/title>/)?.[1]);
  descriptions.add(html.match(/<meta name="description" content="([^"]+)"/)?.[1]);
  assert.ok(html.includes('og:image:alt'));
  const markup = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)?.[1];
  assert.equal(JSON.parse(markup)['@context'], 'https://schema.org');
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (match[1].startsWith('#')) continue;
    const destination = new URL(unescape(match[1]), url);
    if (destination.origin !== base.origin || !destination.pathname.startsWith(base.pathname)) continue;
    const name = destination.pathname.slice(base.pathname.length);
    const file = extname(name) ? name : join(name, 'index.html');
    assert.equal((await stat(join(root, file))).isFile(), true, file);
  }
  if (path) {
    assert.match(html, /<h2>Published references<\/h2>/);
    const target = html.match(/class="public-launch" href="([^"]+)"/)?.[1];
    assert.ok(target);
    const route = new URL(unescape(target));
    assert.ok(['anatomy', 'protocols', 'labs'].includes(route.searchParams.get('view')));
    routes.add(route.search);
  } else {
    assert.match(html, /<h1>FlyLab 3D<\/h1>/);
    assert.match(html, /publication-footer/);
    assert.match(html, /Developed by Muhammad Atif/);
  }
}
assert.equal(titles.size, urls.length);
assert.equal(descriptions.size, urls.length);
assert.ok(!titles.has(undefined) && !descriptions.has(undefined));
assert.equal(routes.size, 8);
console.log('Verified 10 canonical pages, structured metadata, unique titles and descriptions, static links, sitemap, robots.txt, and sharing image.');

