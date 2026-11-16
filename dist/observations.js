const columns = ['structure_id', 'measurement', 'value', 'unit', 'replicate', 'condition', 'time_point'];
const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

function readCsv(text) {
  const records = [];
  let record = [];
  let field = '';
  let quoted = false;
  let quoteClosed = false;

  const finishField = () => {
    record.push(field);
    field = '';
    quoteClosed = false;
  };

  const finishRecord = () => {
    finishField();
    if (record.length > 1 || record[0].trim()) records.push(record);
    record = [];
  };

  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (quoted) {
      if (character !== '"') {
        field += character;
      } else if (text[index + 1] === '"') {
        field += '"';
        index++;
      } else {
        quoted = false;
        quoteClosed = true;
      }
      continue;
    }

    if (character === ',') {
      finishField();
    } else if (character === '\r' || character === '\n') {
      finishRecord();
      if (character === '\r' && text[index + 1] === '\n') index++;
    } else if (character === '"' && !field && !quoteClosed) {
      quoted = true;
    } else if (character === '"' || quoteClosed) {
      throw new Error('The CSV contains an invalid quoted field.');
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error('The CSV contains an unclosed quoted field.');
  finishRecord();
  const headers = records.shift()?.map((header) => header.trim()) ?? [];
  if (headers.length !== columns.length || !columns.every((column) => headers.includes(column))) {
    throw new Error(`The CSV needs these columns: ${columns.join(', ')}.`);
  }

  return records.map((cells, index) => {
    if (cells.length !== headers.length) throw new Error(`CSV row ${index + 2} has the wrong number of fields.`);
    return Object.fromEntries(headers.map((header, columnIndex) => [header, cells[columnIndex]]));
  });
}

function readJson(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('The JSON file could not be read. Check its syntax and try again.');
  }

  const records = Array.isArray(data) ? data : data?.measurements ?? data?.observations ?? data?.rows;
  if (!Array.isArray(records)) throw new Error('The JSON needs an array of measurement records.');
  return records;
}

function numericValue(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  if (typeof value !== 'string' || !decimal.test(value.trim())) return NaN;
  const number = Number(value);
  if (number === 0 && /[1-9]/.test(value.split(/e/i)[0])) return NaN;
  return Number.isFinite(number) ? number : NaN;
}

export function parseObservations(text, filename, knownIds) {
  const input = text.replace(/^\uFEFF/, '').trim();
  const isJson = /\.json$/i.test(filename) || /^[\[{]/.test(input);
  const records = isJson ? readJson(input) : readCsv(input);
  if (!records.length) throw new Error('The file has no measurement rows.');

  const known = new Set(knownIds);
  const unmatched = new Set();
  const rows = [];
  const replicateKeys = new Set();

  for (const [index, record] of records.entries()) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      throw new Error(`Observation ${index + 1} needs a measurement record.`);
    }

    const raw = { ...record, structure_id: record.structure_id ?? record.structureId, time_point: record.time_point ?? record.timePoint };
    const row = {};
    for (const column of columns) {
      if (column === 'value') {
        row.value = numericValue(raw.value);
        if (!Number.isFinite(row.value)) throw new Error(`Observation ${index + 1} needs a finite numeric value.`);
      } else {
        const value = raw[column];
        if (typeof value !== 'string' || !value.trim()) throw new Error(`Observation ${index + 1} needs ${column}.`);
        row[column] = value.trim();
      }
    }

    if (!known.has(row.structure_id)) {
      unmatched.add(row.structure_id);
      continue;
    }

    const replicateKey = JSON.stringify([row.structure_id, seriesKey(row), row.condition, row.replicate]);
    if (replicateKeys.has(replicateKey)) throw new Error(`Observation ${index + 1} repeats replicate ${row.replicate} for the same structure, series and condition.`);
    replicateKeys.add(replicateKey);
    rows.push(row);
  }

  return { rows, unmatched: [...unmatched] };
}

function seriesKey(row) {
  return JSON.stringify([row.measurement, row.unit, row.time_point]);
}

export function getSeries(rows) {
  const series = new Map();
  for (const row of rows) {
    const key = seriesKey(row);
    if (!series.has(key)) {
      series.set(key, { key, label: `${row.measurement} (${row.unit}) · ${row.time_point}`, conditions: new Set() });
    }
    series.get(key).conditions.add(row.condition);
  }

  return [...series.values()].map(({ key, label, conditions }) => ({ key, label, conditionCount: conditions.size }));
}

export function getConditions(rows, key) {
  return [...new Set(rows.filter((row) => seriesKey(row) === key).map((row) => row.condition))];
}

export function summarize(rows, key, condition) {
  const groups = new Map();
  let count = 0;
  for (const row of rows) {
    if (row.condition !== condition || seriesKey(row) !== key) continue;
    const group = groups.get(row.structure_id) ?? { mean: 0, count: 0 };
    group.count++;
    if (Math.sign(group.mean) === Math.sign(row.value)) {
      group.mean += (row.value - group.mean) / group.count;
    } else {
      group.mean = (group.mean - group.mean / group.count) + row.value / group.count;
    }
    groups.set(row.structure_id, group);
    count++;
  }
  return { values: new Map([...groups].map(([id, group]) => [id, group.mean])), count };
}

export const exampleCsv = `structure_id,measurement,value,unit,replicate,condition,time_point
eyes,Illustrative signal,18,a.u.,A1,Example A,baseline
eyes,Illustrative signal,20,a.u.,A2,Example A,baseline
wings,Illustrative signal,12,a.u.,A1,Example A,baseline
wings,Illustrative signal,14,a.u.,A2,Example A,baseline
brain,Illustrative signal,38,a.u.,A1,Example A,baseline
brain,Illustrative signal,42,a.u.,A2,Example A,baseline
gut,Illustrative signal,25,a.u.,A1,Example A,baseline
gut,Illustrative signal,27,a.u.,A2,Example A,baseline
eyes,Illustrative signal,32,a.u.,B1,Example B,baseline
eyes,Illustrative signal,34,a.u.,B2,Example B,baseline
wings,Illustrative signal,7,a.u.,B1,Example B,baseline
wings,Illustrative signal,9,a.u.,B2,Example B,baseline
brain,Illustrative signal,47,a.u.,B1,Example B,baseline
brain,Illustrative signal,49,a.u.,B2,Example B,baseline
gut,Illustrative signal,20,a.u.,B1,Example B,baseline
gut,Illustrative signal,23,a.u.,B2,Example B,baseline
`;

export const larvalExampleCsv = `structure_id,measurement,value,unit,replicate,condition,time_point
larval-brain,Illustrative signal,31,a.u.,A1,Example A,baseline
larval-brain,Illustrative signal,35,a.u.,A2,Example A,baseline
larval-vnc,Illustrative signal,20,a.u.,A1,Example A,baseline
larval-vnc,Illustrative signal,24,a.u.,A2,Example A,baseline
larval-gut,Illustrative signal,16,a.u.,A1,Example A,baseline
larval-gut,Illustrative signal,18,a.u.,A2,Example A,baseline
larval-brain,Illustrative signal,36,a.u.,B1,Example B,baseline
larval-brain,Illustrative signal,40,a.u.,B2,Example B,baseline
larval-vnc,Illustrative signal,30,a.u.,B1,Example B,baseline
larval-vnc,Illustrative signal,34,a.u.,B2,Example B,baseline
larval-gut,Illustrative signal,13,a.u.,B1,Example B,baseline
larval-gut,Illustrative signal,15,a.u.,B2,Example B,baseline
`;
