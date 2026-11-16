export const sourceLinks = {
  tip: ['Delventhal et al. · Labellar tip recording', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4089476/'],
  sensilla: ['Hiroi et al. · Labellar sensillum classes', 'https://pubmed.ncbi.nlm.nih.gov/15389687/'],
  choice: ['Dus et al. · Feeding preference assays', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3136275/'],
  per: ['Shiraiwa and Carlson · Proboscis extension response', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2535836/'],
  flypad: ['Itskov et al. · Automated feeding measurements', 'https://www.nature.com/articles/ncomms5560'],
  cafe: ['Ja et al. · Capillary feeder assay', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC1899109/'],
  motion: ['Nichols et al. · Crawling, climbing and courtship assays', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3671839/'],
  survival: ['Linford et al. · Fruit fly lifespan measurements', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3582515/'],
  development: ['Bainbridge and Bownes · Staging metamorphosis', 'https://pubmed.ncbi.nlm.nih.gov/6802923/'],
  sleep: ['Shaw et al. · Sleep and waking', 'https://greenspanlab.ucsd.edu/files/Shaw-2000.pdf'],
  choiceLarva: ['Maier et al. · Larval taste choice', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8709573/'],
  olfaction: ['Tully and Quinn · Odor choice and conditioning', 'https://pubmed.ncbi.nlm.nih.gov/3939242/'],
  oviposition: ['Yang et al. · Egg-laying site selection', 'https://pubmed.ncbi.nlm.nih.gov/18356529/'],
  ssr: ['De Bruyne et al. · Antennal single-sensillum recordings', 'https://pubmed.ncbi.nlm.nih.gov/11395013/'],
  eag: ['Electroantennogram field measurements', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6793049/'],
  nmj: ['Intracellular voltage responses at the larval NMJ', 'https://pubmed.ncbi.nlm.nih.gov/32524479/'],
  patch: ['Wilson et al. · Whole-cell recordings in vivo', 'https://pubmed.ncbi.nlm.nih.gov/14684826/'],
  calcium: ['Wang et al. · Calcium imaging of olfactory activity', 'https://pubmed.ncbi.nlm.nih.gov/12553914/'],
};

export function sourceLink(key) {
  const [label, url] = sourceLinks[key];
  return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + label + ' ↗</a>';
}

export function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

export function intValue(value, fallback, low, high) {
  const numeric = typeof value === 'string' && !value.trim() ? NaN : Number(value);
  return Number.isFinite(numeric) ? Math.round(clamp(numeric, low, high)) : fallback;
}

export function rng(seed) {
  let state = (Number(seed) >>> 0) || 1;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function symmetricNoise(random) {
  return (random() + random() + random() + random() - 2) * Math.sqrt(3);
}

export function csvRows(columns, rows) {
  const escape = value => {
    const raw = value == null ? '' : typeof value === 'number' ? Number(value.toFixed(6)) : String(value);
    const guarded = typeof raw === 'string' && /^[\s\uFEFF]*[=+\-@]|^[\r\n\t]/u.test(raw) ? "'" + raw : String(raw);
    return '"' + guarded.replaceAll('"', '""') + '"';
  };
  return [columns, ...rows.map(row => columns.map(column => row[column]))].map(row => row.map(escape).join(',')).join('\r\n') + '\r\n';
}

export function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : NaN;
}

export function fmt(value, places = 2) {
  return Number.isFinite(value) ? new Intl.NumberFormat('en', { maximumFractionDigits: places }).format(value) : '—';
}

function finiteRange(range) {
  const [minimum, maximum] = range;
  if (Number.isFinite(minimum) && Number.isFinite(maximum) && maximum > minimum) return [minimum, maximum];
  return [0, 1];
}

export function lineChart({ series, xRange, yRange, xLabel, yLabel, name, threshold, spikes = [] }) {
  const width = 640;
  const height = 252;
  const plot = { left: 60, right: 618, top: 16, bottom: 212 };
  const [xMin, xMax] = finiteRange(xRange);
  const [yMin, yMax] = finiteRange(yRange);
  const xPos = x => plot.left + (x - xMin) / (xMax - xMin) * (plot.right - plot.left);
  const yPos = y => plot.bottom - (y - yMin) / (yMax - yMin) * (plot.bottom - plot.top);
  let grid = '';
  for (let i = 0; i <= 4; i++) {
    const fraction = i / 4;
    const xValue = xMin + (xMax - xMin) * fraction;
    const yValue = yMin + (yMax - yMin) * fraction;
    const x = xPos(xValue);
    const y = yPos(yValue);
    grid += '<line x1="' + x + '" y1="' + plot.top + '" x2="' + x + '" y2="' + plot.bottom + '" stroke="#dbe8e3" />'
      + '<line x1="' + plot.left + '" y1="' + y + '" x2="' + plot.right + '" y2="' + y + '" stroke="#dbe8e3" />'
      + '<text x="' + x + '" y="' + (plot.bottom + 15) + '" text-anchor="middle">' + fmt(xValue) + '</text>'
      + '<text x="' + (plot.left - 8) + '" y="' + (y + 4) + '" text-anchor="end">' + fmt(yValue) + '</text>';
  }
  const paths = series.map(({ points, color, dash }) => {
    const coordinates = points.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
      .map(([x, y]) => xPos(x).toFixed(1) + ',' + yPos(y).toFixed(1)).join(' ');
    return '<polyline points="' + coordinates + '" stroke="' + color + '" stroke-width="1.7" fill="none" vector-effect="non-scaling-stroke"' + (dash ? ' stroke-dasharray="4 3"' : '') + ' />';
  }).join('');
  const line = Number.isFinite(threshold) && threshold >= yMin && threshold <= yMax
    ? '<line x1="' + plot.left + '" x2="' + plot.right + '" y1="' + yPos(threshold) + '" y2="' + yPos(threshold) + '" stroke="#a16c25" stroke-dasharray="5 3"/>' : '';
  const points = spikes.map(([x, y]) => '<circle cx="' + xPos(x).toFixed(1) + '" cy="' + yPos(y).toFixed(1) + '" r="2.5" fill="#963b52" />').join('');
  return '<svg width="100%" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="' + name + '" style="display:block;max-width:850px;background:#f7fbf9;border-radius:8px">'
    + '<g fill="#426056" font-family="system-ui,sans-serif" font-size="10">' + grid + '</g>'
    + '<path d="M' + plot.left + ' ' + plot.top + 'V' + plot.bottom + 'H' + plot.right + '" stroke="#435f54" fill="none"/>'
    + line + paths + points
    + '<g fill="#294b3d" font-family="system-ui,sans-serif" font-size="12"><text x="' + ((plot.left + plot.right) / 2) + '" y="247" text-anchor="middle">' + xLabel + '</text>'
    + '<text transform="translate(14 ' + ((plot.top + plot.bottom) / 2) + ') rotate(-90)" text-anchor="middle">' + yLabel + '</text></g></svg>';
}
