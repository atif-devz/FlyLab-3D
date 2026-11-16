const decoder = new TextDecoder();
const encoder = new TextEncoder();
const maxEntry = 18 * 1024 * 1024;
const spreadsheet = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const relationship = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const packageRelationships = 'http://schemas.openxmlformats.org/package/2006/relationships';
export const xlsxMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function directory(buffer) {
  const view = new DataView(buffer);
  const entries = new Map();
  let end = view.byteLength - 22;
  while (end >= 0 && end >= view.byteLength - 65557 && view.getUint32(end, true) !== 0x06054b50) end -= 1;
  if (end < 0 || end < view.byteLength - 65557) throw new Error('This is not a readable Excel workbook.');
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  if (count > 2000 || view.getUint16(end + 4, true) !== 0 || at >= end) throw new Error('Use a smaller single-file workbook.');
  for (let index = 0; index < count; index += 1) {
    if (at + 46 > end || view.getUint32(at, true) !== 0x02014b50) throw new Error('The workbook archive is damaged.');
    const nameBytes = view.getUint16(at + 28, true);
    const next = at + 46 + nameBytes + view.getUint16(at + 30, true) + view.getUint16(at + 32, true);
    if (next > end) throw new Error('The workbook archive is damaged.');
    const name = decoder.decode(new Uint8Array(buffer, at + 46, nameBytes));
    entries.set(name, { method: view.getUint16(at + 10, true), packed: view.getUint32(at + 20, true),
      size: view.getUint32(at + 24, true), local: view.getUint32(at + 42, true), flags: view.getUint16(at + 8, true) });
    at = next;
  }
  return async function read(name) {
    const entry = entries.get(name);
    if (!entry) return null;
    if (entry.size > maxEntry || entry.flags & 1) throw new Error('This workbook uses a large or encrypted entry.');
    const start = entry.local;
    if (start + 30 > view.byteLength || view.getUint32(start, true) !== 0x04034b50) throw new Error('The workbook archive is damaged.');
    const offset = start + 30 + view.getUint16(start + 26, true) + view.getUint16(start + 28, true);
    if (offset + entry.packed > view.byteLength) throw new Error('The workbook archive is incomplete.');
    const compressed = new Uint8Array(buffer, offset, entry.packed);
    if (entry.method === 0 && entry.size === entry.packed) return decoder.decode(compressed);
    if (entry.method !== 8 || !globalThis.DecompressionStream) throw new Error('This browser cannot open that compressed workbook. Export the sheet as CSV.');
    const reader = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
    let length = 0, str = '';
    const text = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > entry.size || length > maxEntry) {
        await reader.cancel();
        throw new Error('The workbook expanded past its supported size.');
      }
      str += text.decode(value, { stream: true });
    }
    if (length !== entry.size) throw new Error('The workbook has an incomplete entry.');
    return str + text.decode();
  };
}

function parse(text) {
  if (!text || /<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('This workbook has invalid spreadsheet XML.');
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagNameNS('*', 'parsererror').length) throw new Error('This workbook has damaged spreadsheet XML.');
  return doc;
}
function elements(node, name) { return [...node.getElementsByTagNameNS('*', name)]; }
function textRuns(node) { return elements(node, 't').filter(text => text.parentElement?.localName !== 'rPh').map(text => text.textContent).join(''); }
function columnOf(reference) {
  const letters = /^[A-Z]+/i.exec(reference)?.[0]?.toUpperCase() ?? '';
  return [...letters].reduce((number, char) => number * 26 + char.charCodeAt(0) - 64, 0) - 1;
}
function safePath(path) {
  const target = path.startsWith('/') ? path.slice(1) : 'xl/' + path;
  if (!/^[\w./-]+$/.test(target) || target.split('/').includes('..')) throw new Error('Unsupported workbook worksheet location.');
  return target;
}

export async function readWorkbook(buffer) {
  const read = directory(buffer);
  const book = parse(await read('xl/workbook.xml'));
  const rels = parse(await read('xl/_rels/workbook.xml.rels'));
  const refs = elements(rels, 'Relationship');
  const sheet = elements(book, 'sheet').find(candidate => !['hidden', 'veryHidden'].includes(candidate.getAttribute('state')));
  const id = sheet?.getAttributeNS(relationship, 'id') || sheet?.getAttribute('r:id');
  const rel = id ? refs.find(candidate => candidate.getAttribute('Id') === id && candidate.getAttribute('Type')?.endsWith('/worksheet')) : null;
  if (!rel || rel.getAttribute('TargetMode') === 'External') throw new Error('Use a workbook with a visible worksheet.');
  const definition = parse(await read(safePath(rel.getAttribute('Target') ?? '')));
  const sstRel = refs.find(candidate => candidate.getAttribute('Type')?.endsWith('/sharedStrings') && candidate.getAttribute('TargetMode') !== 'External');
  const sharedXml = await read(sstRel ? safePath(sstRel.getAttribute('Target')) : 'xl/sharedStrings.xml');
  const shared = sharedXml ? elements(parse(sharedXml), 'si').map(textRuns) : [];
  const rows = elements(definition, 'row');
  if (rows.length > 30001) throw new Error('Use a worksheet with at most 30,000 data rows.');
  return rows.map(row => {
    const cells = [];
    for (const cell of elements(row, 'c')) {
      const type = cell.getAttribute('t');
      const raw = elements(cell, 'v')[0]?.textContent ?? '';
      const val = type === 's' ? shared[Number(raw)] ?? '' : type === 'inlineStr' ? textRuns(cell) : type === 'e' ? '' : raw;
      const index = cell.hasAttribute('r') ? columnOf(cell.getAttribute('r')) : cells.length;
      if (index >= 0 && index < 128) cells[index] = val;
      else if (val) throw new Error('Use a worksheet with at most 128 data columns.');
    }
    return Array.from(cells, value => value ?? '');
  }).filter(row => row.some(value => value.trim()));
}

function xml(text) {
  return String(text ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]);
}
function columnName(index) {
  let out = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) out = String.fromCharCode(65 + (n - 1) % 26) + out;
  return out;
}
function worksheet(grid) {
  return '<worksheet xmlns="' + spreadsheet + '"><sheetData>' + grid.map((row, i) =>
    '<row r="' + (i + 1) + '">' + row.map((value, j) => {
      if (value === null || value === undefined) return '';
      const address = columnName(j) + (i + 1);
      if (typeof value === 'number' && Number.isFinite(value)) return '<c r="' + address + '"><v>' + value + '</v></c>';
      return '<c r="' + address + '" t="inlineStr"><is><t xml:space="preserve">' + xml(value) + '</t></is></c>';
    }).join('') + '</row>').join('') + '</sheetData></worksheet>';
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  for (let bit = 0; bit < 8; bit += 1) n = n & 1 ? 0xedb88320 ^ n >>> 1 : n >>> 1;
  return n;
});
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 255];
  return (crc ^ 0xffffffff) >>> 0;
}

function storeZip(entries) {
  const blocks = [], central = [];
  let pointer = 0, directoryBytes = 0;
  for (const [name, data] of entries) {
    const filename = encoder.encode(name);
    const content = encoder.encode(data);
    const checksum = crc32(content);
    const local = new Uint8Array(30 + filename.length);
    const lp = new DataView(local.buffer);
    lp.setUint32(0, 0x04034b50, true); lp.setUint16(4, 20, true);
    lp.setUint32(14, checksum, true); lp.setUint32(18, content.length, true); lp.setUint32(22, content.length, true);
    lp.setUint16(26, filename.length, true); local.set(filename, 30);
    blocks.push(local, content);
    const record = new Uint8Array(46 + filename.length);
    const cp = new DataView(record.buffer);
    cp.setUint32(0, 0x02014b50, true); cp.setUint16(4, 20, true); cp.setUint16(6, 20, true);
    cp.setUint32(16, checksum, true); cp.setUint32(20, content.length, true); cp.setUint32(24, content.length, true);
    cp.setUint16(28, filename.length, true); cp.setUint32(42, pointer, true); record.set(filename, 46);
    central.push(record);
    directoryBytes += record.byteLength;
    pointer += local.byteLength + content.byteLength;
  }
  const footer = new DataView(new ArrayBuffer(22));
  footer.setUint32(0, 0x06054b50, true); footer.setUint16(8, entries.length, true); footer.setUint16(10, entries.length, true);
  footer.setUint32(12, directoryBytes, true); footer.setUint32(16, pointer, true);
  return new Blob([...blocks, ...central, footer.buffer], { type: xlsxMime });
}

export function makeWorkbook(sheets) {
  const types = 'http://schemas.openxmlformats.org/package/2006/content-types';
  const workbookType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.';
  const relxml = items => '<Relationships xmlns="' + packageRelationships + '">' + items.join('') + '</Relationships>';
  const rel = (id, type, target) => '<Relationship Id="' + id + '" Type="' + relationship + '/' + type + '" Target="' + target + '"/>';
  const entries = [
    ['[Content_Types].xml', '<Types xmlns="' + types + '"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      + '<Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="' + workbookType + 'sheet.main+xml"/>'
      + sheets.map((_, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="' + workbookType + 'worksheet+xml"/>').join('') + '</Types>'],
    ['_rels/.rels', relxml([rel('rId1', 'officeDocument', 'xl/workbook.xml')])],
    ['xl/workbook.xml', '<workbook xmlns="' + spreadsheet + '" xmlns:r="' + relationship + '"><sheets>'
      + sheets.map((sheet, i) => '<sheet name="' + xml(sheet.name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('') + '</sheets></workbook>'],
    ['xl/_rels/workbook.xml.rels', relxml(sheets.map((_, i) => rel('rId' + (i + 1), 'worksheet', 'worksheets/sheet' + (i + 1) + '.xml')))],
    ...sheets.map((sheet, i) => ['xl/worksheets/sheet' + (i + 1) + '.xml', worksheet(sheet.grid)]),
  ];
  return storeZip(entries);
}

