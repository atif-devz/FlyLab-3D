const FLY = 'Drosophila melanogaster';
const TAXON_ID = 7227;
const NCBI_API = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
const NCBI_DOCS = 'https://www.ncbi.nlm.nih.gov/books/NBK25497/';
const FLYBASE_REPORT = 'https://flybase.org/reports/';
const ENSEMBL_FLY = 'https://www.ensembl.org/Drosophila_melanogaster';
const UNI_SEARCH = 'https://www.uniprot.org/uniprotkb';
const EUROPE_SEARCH = 'https://europepmc.org/search';
const VFB = 'https://www.virtualflybrain.org/';
const VFB_BROWSER = 'https://v2.virtualflybrain.org/org.geppetto.frontend/geppetto';
const VFB_SEARCH = 'https://solr.virtualflybrain.org/solr/ontology/select';

const flybaseIdPattern = /^FBgn\d{7}$/i;
const uniprotIdPattern = /^(?:[OPQ]\d[A-Z0-9]{3}\d|[A-NR-Z]\d(?:[A-Z][A-Z0-9]{2}\d){1,2})$/i;
const simpleSymbolPattern = /^[A-Za-z][A-Za-z0-9._-]{0,39}$/;
const numericIdPattern = /^\d{1,12}$/;
const geoAccessionPattern = /^G(?:SE|DS|SM|PL)\d{1,12}$/i;
const anatomyIdPattern = /^FBbt[_: ]\d{8}$/i;
const pageUrl = (base, params) => {
  const url = new URL(base);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.href;
};

function plainText(value, limit = 320) {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  return String(value)
    .replace(/<[^>]*>/g, '')
    .replace(/&(?:amp|lt|gt|quot|apos);/gi, entity => ({
      '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'",
    })[entity.toLowerCase()])
    .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit)
    .trim();
}

export function normalizeResearchQuery(value) {
  return plainText(value, 120).replace(/[^\p{L}\p{N}\p{M}._\-+ ]/gu, ' ').replace(/\s+/g, ' ').trim();
}

const canonicalFlyBaseId = id => 'FBgn' + id.slice(4);
const canonicalAnatomyId = id => 'FBbt_' + id.slice(5);
const flyBaseUrl = id => FLYBASE_REPORT + canonicalFlyBaseId(id);
const exactQuery = term => '"' + term + '"';
const literatureQuery = term => 'TITLE_ABS:' + exactQuery(term) + ' AND TITLE_ABS:Drosophila';
const organismQuery = term => exactQuery(term) + '[All Fields] AND ' + exactQuery(FLY) + '[Organism]';
const geoQuery = term => geoAccessionPattern.test(term) ?
  term.toUpperCase() + '[ACCN] AND ' + exactQuery(FLY) + '[Organism]' : organismQuery(term);
const uniQuery = term => {
  if (uniprotIdPattern.test(term)) return 'organism_id:7227 AND accession:' + term.toUpperCase();
  if (flybaseIdPattern.test(term)) return 'organism_id:7227 AND xref:flybase-' + canonicalFlyBaseId(term);
  const phrase = exactQuery(term);
  return 'organism_id:7227 AND ' + (simpleSymbolPattern.test(term) ? '(gene_exact:' + phrase + ' OR ' + phrase + ')' : phrase);
};
const list = value => Array.isArray(value) ? value : [];

function linkSource(id, label, category, description, homeUrl, { docsUrl = homeUrl, searchUrl = () => homeUrl } = {}) {
  return { id, label, category, description, homeUrl, docsUrl, searchUrl, method: 'link' };
}

export const researchSources = Object.freeze([
  {
    id: 'flybase', label: 'FlyBase', category: 'Genetics',
    description: 'Open curated fly gene reports directly on FlyBase.',
    method: 'link', homeUrl: 'https://flybase.org/', docsUrl: 'https://flybase.github.io/docs/api/',
    searchUrl: term => flybaseIdPattern.test(term) ? flyBaseUrl(term) : 'https://flybase.org/search/FBgn/' + encodeURIComponent(term),
    licenseUrl: 'https://wiki.flybase.org/wiki/FlyBase_Wiki%3AAbout',
  },
  {
    id: 'uniprot', label: 'UniProtKB', category: 'Genetics',
    description: 'Protein names, identifiers, review status, and cross-references for Drosophila melanogaster.',
    method: 'api', homeUrl: UNI_SEARCH, docsUrl: 'https://www.uniprot.org/api-documentation',
    searchUrl: term => pageUrl(UNI_SEARCH, { query: uniQuery(term) }),
    licenseUrl: 'https://www.uniprot.org/help/license',
  },
  {
    id: 'ncbi-gene', label: 'NCBI Gene', category: 'Genetics',
    description: 'Gene symbols, aliases, and stable identifiers for Drosophila melanogaster.',
    method: 'api', homeUrl: 'https://www.ncbi.nlm.nih.gov/gene/', docsUrl: NCBI_DOCS,
    searchUrl: term => numericIdPattern.test(term) ? 'https://www.ncbi.nlm.nih.gov/gene/' + term :
      pageUrl('https://www.ncbi.nlm.nih.gov/gene/', { term: organismQuery(term) }),
    licenseUrl: 'https://www.ncbi.nlm.nih.gov/About/disclaimer.html',
  },
  {
    id: 'ensembl', label: 'Ensembl', category: 'Genetics',
    description: 'Exact fly gene symbols and FlyBase gene identifiers in the Ensembl genome browser.',
    method: 'api', homeUrl: ENSEMBL_FLY + '/Info/Index',
    docsUrl: 'https://rest.ensembl.org/documentation/info/symbol_lookup',
    searchUrl: term => flybaseIdPattern.test(term) ?
      pageUrl(ENSEMBL_FLY + '/Gene/Summary', { g: canonicalFlyBaseId(term) }) :
      pageUrl('https://www.ensembl.org/Multi/Search/Results', { species: 'Drosophila_melanogaster', q: term }),
  },
  linkSource('bdsc', 'Bloomington Drosophila Stock Center', 'Genetics', 'Stock center and collection documentation hosted by Indiana University.', 'https://bdsc.indiana.edu/'),
  linkSource('vdrc', 'Vienna Drosophila Resource Center', 'Genetics', 'Stock center and collection documentation hosted by VDRC.', 'https://stockcenter.vdrc.at/control/main'),
  linkSource('drsc-trip', 'DRSC/TRiP', 'Genetics', 'Harvard Drosophila Functional Genomics Resources.', 'https://fgr.hms.harvard.edu/'),
  {
    id: 'virtual-fly-brain', label: 'Virtual Fly Brain', category: 'Anatomy & neuroscience',
    description: 'Anatomy ontology identifiers, anatomical names, and links to the Virtual Fly Brain 3D viewer.',
    method: 'api', homeUrl: VFB, docsUrl: VFB + 'docs/apis/solr/',
    searchUrl: term => anatomyIdPattern.test(term) ?
      pageUrl(VFB_BROWSER, { id: canonicalAnatomyId(term) }) : VFB_BROWSER,
  },
  linkSource('flywire', 'FlyWire Codex', 'Anatomy & neuroscience', 'Connectome data releases and neuron annotations. A sign-in may be required.', 'https://codex.flywire.ai/', { docsUrl: 'https://codex.flywire.ai/faq' }),
  linkSource('neuprint', 'neuPrint', 'Anatomy & neuroscience', 'Janelia connectome exploration and query interface.', 'https://neuprint.janelia.org/', { docsUrl: 'https://connectome-neuprint.github.io/neuprint-python/docs/' }),
  linkSource('flycircuit', 'FlyCircuit', 'Anatomy & neuroscience', 'Published Drosophila brain neuron images and anatomy reconstructions.', 'https://www.flycircuit.tw/'),
  {
    id: 'europe-pmc', label: 'Europe PMC', category: 'Literature',
    description: 'Publication metadata for Drosophila title and abstract matches, including preprints.',
    method: 'api', homeUrl: 'https://europepmc.org/', docsUrl: 'https://europepmc.org/RestfulWebService',
    searchUrl: term => pageUrl(EUROPE_SEARCH, { query: literatureQuery(term) }),
  },
  linkSource('pubmed', 'PubMed', 'Literature', 'Biomedical literature records at the National Library of Medicine.', 'https://pubmed.ncbi.nlm.nih.gov/', {
    searchUrl: term => pageUrl('https://pubmed.ncbi.nlm.nih.gov/', { term: 'Drosophila ' + term }),
  }),
  linkSource('pubmed-central', 'PubMed Central', 'Literature', 'Full-text research archive at the National Library of Medicine.', 'https://pmc.ncbi.nlm.nih.gov/', {
    searchUrl: term => pageUrl('https://pmc.ncbi.nlm.nih.gov/', { term: 'Drosophila ' + term }),
  }),
  linkSource('jove', 'JoVE', 'Protocols', 'Published video protocols on JoVE. Some require a subscription.', 'https://www.jove.com/'),
  linkSource('bio-protocol', 'Bio-protocol', 'Protocols', 'Published experimental methods and protocol references.', 'https://bio-protocol.org/'),
  linkSource('protocols-io', 'protocols.io', 'Protocols', 'Public protocol records and version history maintained by their authors.', 'https://www.protocols.io/'),
  {
    id: 'ncbi-geo', label: 'NCBI GEO', category: 'Datasets',
    description: 'Public gene-expression study metadata, accessions, and release dates.',
    method: 'api', homeUrl: 'https://www.ncbi.nlm.nih.gov/geo/', docsUrl: NCBI_DOCS,
    searchUrl: term => geoAccessionPattern.test(term) ?
      pageUrl('https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi', { acc: term.toUpperCase() }) :
      pageUrl('https://www.ncbi.nlm.nih.gov/gds/', { term: organismQuery(term) }),
    licenseUrl: 'https://www.ncbi.nlm.nih.gov/About/disclaimer.html',
  },
  linkSource('biostudies', 'EMBL-EBI BioStudies', 'Datasets', 'Biological study deposits, including ArrayExpress collections.', 'https://www.ebi.ac.uk/biostudies/', {
    searchUrl: term => pageUrl('https://www.ebi.ac.uk/biostudies/studies', { query: 'Drosophila ' + term }),
  }),
  linkSource('pride', 'PRIDE', 'Datasets', 'EMBL-EBI public proteomics data repository.', 'https://www.ebi.ac.uk/pride/'),
].map(Object.freeze));

function record(sourceId, data) {
  return { type: '', summary: '', organism: '', year: '', release: '', identifiers: [], links: [], sourceId, ...data };
}

class SourceError extends Error {
  constructor(status = 0) {
    super('The source could not return records.');
    this.status = status;
  }
}

async function requestJson(fetchImpl, url, signal) {
  signal.throwIfAborted();
  const response = await fetchImpl(url, {
    signal, credentials: 'omit', referrerPolicy: 'no-referrer', headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new SourceError(response.status);
  return { data: await response.json(), headers: response.headers };
}

let nextNcbiSlot = 0;

async function paceNcbiRequests(signal) {
  while (true) {
    signal.throwIfAborted();
    const now = performance.now();
    const wait = nextNcbiSlot - now;
    if (wait <= 0) {
      nextNcbiSlot = now + 420;
      return;
    }
    await new Promise((resolve, reject) => {
      const cancel = () => {
        clearTimeout(timer);
        reject(signal.reason);
      };
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', cancel);
        resolve();
      }, wait);
      signal.addEventListener('abort', cancel, { once: true });
    });
  }
}

async function searchUniProt(term, limit, signal, fetchImpl) {
  const url = pageUrl('https://rest.uniprot.org/uniprotkb/search', {
    query: uniQuery(term), format: 'json', size: limit,
    fields: 'accession,id,protein_name,gene_names,organism_name,organism_id,reviewed,xref_flybase,xref_geneid',
  });
  const { data, headers } = await requestJson(fetchImpl, url, signal);
  if (!Array.isArray(data?.results)) throw new SourceError();
  const release = plainText(headers?.get?.('X-UniProt-Release'), 32);
  const releaseDate = plainText(headers?.get?.('X-UniProt-Release-Date'), 32);
  const records = data.results.slice(0, limit).flatMap(item => {
    const id = plainText(item?.primaryAccession, 20);
    if (!uniprotIdPattern.test(id) || Number(item.organism?.taxonId) !== TAXON_ID) return [];
    const description = item.proteinDescription;
    const title = plainText(description?.recommendedName?.fullName?.value ??
      list(description?.submissionNames)[0]?.fullName?.value ?? item.uniProtkbId, 220) || id;
    const genes = list(item.genes).map(gene => plainText(gene?.geneName?.value, 48)).filter(Boolean);
    const links = list(item.uniProtKBCrossReferences).flatMap(entry => {
      const identifier = plainText(entry?.id, 32);
      if (entry?.database === 'FlyBase' && flybaseIdPattern.test(identifier)) {
        return [{ label: 'FlyBase ' + identifier, url: flyBaseUrl(identifier) }];
      }
      if (entry?.database === 'GeneID' && numericIdPattern.test(identifier)) {
        return [{ label: 'NCBI Gene ' + identifier, url: 'https://www.ncbi.nlm.nih.gov/gene/' + identifier }];
      }
      return [];
    }).slice(0, 6);
    const review = plainText(item.entryType, 80);
    const summary = [genes.length ? 'Gene symbols ' + [...new Set(genes)].join(', ') : '', review].filter(Boolean).join(' · ');
    return [record('uniprot', {
      id, title, type: 'Protein', url: UNI_SEARCH + '/' + id + '/entry', summary, organism: FLY,
      identifiers: [id, ...genes].slice(0, 8), links, release, releaseDate,
    })];
  });
  return { records, release, releaseDate };
}

async function searchEuropePmc(term, limit, signal, fetchImpl) {
  const url = pageUrl('https://www.ebi.ac.uk/europepmc/webservices/rest/search', {
    query: literatureQuery(term), format: 'json', resultType: 'lite', pageSize: limit,
  });
  const { data } = await requestJson(fetchImpl, url, signal);
  if (!Array.isArray(data?.resultList?.result) && Number(data?.hitCount) !== 0) throw new SourceError();
  const release = plainText(data?.version, 30);
  const records = list(data.resultList?.result).slice(0, limit).flatMap(item => {
    const source = plainText(item?.source, 12);
    const id = plainText(item?.id, 40);
    const title = plainText(item?.title, 260);
    if (!/^[A-Z0-9]{2,10}$/.test(source) || !/^[A-Za-z0-9._-]{1,40}$/.test(id) || !title) return [];
    const pmid = plainText(item.pmid, 16);
    const pmcid = plainText(item.pmcid, 18);
    const doi = plainText(item.doi, 180);
    const links = [];
    const identifiers = [source + ' ' + id];
    if (numericIdPattern.test(pmid)) links.push({ label: 'PubMed ' + pmid, url: 'https://pubmed.ncbi.nlm.nih.gov/' + pmid + '/' });
    if (/^PMC\d{1,12}$/.test(pmcid)) links.push({ label: pmcid, url: 'https://pmc.ncbi.nlm.nih.gov/articles/' + pmcid + '/' });
    if (/^10\.\d{4,9}\/[A-Za-z0-9._();:/+-]+$/i.test(doi)) {
      links.push({ label: 'DOI', url: 'https://doi.org/' + doi.split('/').map(encodeURIComponent).join('/') });
      identifiers.push(doi);
    }
    const summary = [plainText(item.authorString, 170), plainText(item.journalTitle, 100)].filter(Boolean).join(' · ');
    return [record('europe-pmc', {
      id: source + ':' + id, title, type: source === 'PPR' ? 'Preprint' : 'Publication',
      url: 'https://europepmc.org/article/' + source + '/' + encodeURIComponent(id),
      summary, year: plainText(item.pubYear, 4), identifiers, links,
    })];
  });
  return { records, release };
}

async function searchNcbi(database, term, limit, signal, fetchImpl) {
  const sourceId = database === 'gene' ? 'ncbi-gene' : 'ncbi-geo';
  let ids;
  if (database === 'gene' && numericIdPattern.test(term)) {
    ids = [term];
  } else {
    const url = pageUrl(NCBI_API + 'esearch.fcgi', {
      db: database, term: database === 'gds' ? geoQuery(term) : organismQuery(term),
      retmode: 'json', retmax: limit, tool: 'FlyLab3D',
    });
    await paceNcbiRequests(signal);
    const { data } = await requestJson(fetchImpl, url, signal);
    if (!Array.isArray(data?.esearchresult?.idlist) || data.esearchresult.error) throw new SourceError();
    ids = data.esearchresult.idlist.filter(id => numericIdPattern.test(id)).slice(0, limit);
  }
  if (!ids.length) return { records: [] };
  const url = pageUrl(NCBI_API + 'esummary.fcgi', { db: database, id: ids.join(','), retmode: 'json', tool: 'FlyLab3D' });
  await paceNcbiRequests(signal);
  const { data } = await requestJson(fetchImpl, url, signal);
  if (!Array.isArray(data?.result?.uids)) throw new SourceError();
  const records = ids.flatMap(id => {
    const item = data.result[id];
    if (!item || item.error) return [];
    if (database === 'gene') {
      if (Number(item.organism?.taxid) !== TAXON_ID) return [];
      const symbol = plainText(item.nomenclaturesymbol || item.name, 48);
      const description = plainText(item.nomenclaturename || item.description, 190);
      const aliases = plainText(item.otheraliases, 150);
      return [record(sourceId, {
        id, title: [symbol, description !== symbol ? description : ''].filter(Boolean).join(' · ') || 'Gene ' + id,
        type: 'Gene', summary: aliases ? 'Aliases ' + aliases : '', organism: FLY,
        identifiers: [id, symbol].filter(Boolean), url: 'https://www.ncbi.nlm.nih.gov/gene/' + id,
      })];
    }
    const geoId = plainText(item.accession, 24);
    const title = plainText(item.title, 250);
    if (!geoAccessionPattern.test(geoId) || !title) return [];
    const releaseDate = plainText(item.pdat, 24);
    return [record(sourceId, {
      id: geoId, title, type: 'Dataset', organism: plainText(item.taxon, 100),
      summary: plainText(item.entrytype || item.gdstype, 100), identifiers: [geoId],
      year: /^\d{4}/.test(releaseDate) ? releaseDate.slice(0, 4) : '', releaseDate,
      url: pageUrl('https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi', { acc: geoId }),
    })];
  });
  return { records };
}

async function searchEnsembl(term, limit, signal, fetchImpl) {
  if (!flybaseIdPattern.test(term) && !simpleSymbolPattern.test(term)) {
    return { status: 'link', records: [], message: 'Ensembl lookups accept an exact gene symbol or FlyBase identifier.' };
  }
  const path = flybaseIdPattern.test(term) ?
    '/lookup/id/' + canonicalFlyBaseId(term) + '?species=drosophila_melanogaster' :
    '/lookup/symbol/drosophila_melanogaster/' + encodeURIComponent(term) + '?expand=0';
  let data;
  try {
    // Query-string content negotiation avoids a cross-origin preflight.
    ({ data } = await requestJson(fetchImpl, 'https://rest.ensembl.org' + path + '&content-type=application%2Fjson', signal));
  } catch (error) {
    if (error instanceof SourceError && [400, 404].includes(error.status)) return { records: [] };
    throw error;
  }
  if (!data?.id && !data?.error) throw new SourceError();
  if (!flybaseIdPattern.test(data?.id) || data.species !== 'drosophila_melanogaster' || data.object_type !== 'Gene') return { records: [] };
  const id = canonicalFlyBaseId(data.id);
  const symbol = plainText(data.display_name, 48);
  const assembly = plainText(data.assembly_name, 80);
  const summary = [plainText(data.description, 240), assembly ? 'Assembly ' + assembly : ''].filter(Boolean).join(' · ');
  return { records: [record('ensembl', {
    id, title: symbol || id, type: 'Gene', organism: FLY, summary,
    identifiers: [id, symbol].filter(Boolean), url: pageUrl(ENSEMBL_FLY + '/Gene/Summary', { g: id }),
    links: [{ label: 'FlyBase ' + id, url: flyBaseUrl(id) }],
  })] };
}

async function searchVfb(term, limit, signal, fetchImpl) {
  const query = anatomyIdPattern.test(term) ? 'short_form:' + canonicalAnatomyId(term) :
    '(label:' + exactQuery(term) + ' OR synonym:' + exactQuery(term) + ')';
  const url = pageUrl(VFB_SEARCH, {
    q: query, fq: 'facets_annotation:Anatomy AND short_form:FBbt_* AND NOT facets_annotation:Deprecated',
    fl: 'short_form,label,synonym,facets_annotation', rows: limit, wt: 'json',
  });
  const { data } = await requestJson(fetchImpl, url, signal);
  if (!Array.isArray(data?.response?.docs)) throw new SourceError();
  const records = data.response.docs.slice(0, limit).flatMap(item => {
    const id = plainText(item?.short_form, 20);
    const title = plainText(item?.label, 160);
    if (!anatomyIdPattern.test(id) || !title) return [];
    const lifeStages = list(item.facets_annotation).filter(facet => ['Embryo', 'Larva', 'Pupa', 'Adult'].includes(facet));
    const synonyms = list(item.synonym).map(name => plainText(name, 70)).filter(Boolean).slice(0, 5);
    const summary = [
      lifeStages.length ? 'Stage ' + lifeStages.join(', ') : '',
      synonyms.length ? 'Also called ' + synonyms.join(', ') : '',
    ].filter(Boolean).join(' · ');
    return [record('virtual-fly-brain', {
      id, title, type: 'Anatomy', summary, identifiers: [id],
      url: pageUrl(VFB_BROWSER, { id: canonicalAnatomyId(id) }),
    })];
  });
  return { records };
}

const adapters = new Map([
  ['uniprot', searchUniProt],
  ['ncbi-gene', searchNcbi.bind(null, 'gene')],
  ['ensembl', searchEnsembl],
  ['europe-pmc', searchEuropePmc],
  ['ncbi-geo', searchNcbi.bind(null, 'gds')],
  ['virtual-fly-brain', searchVfb],
]);

export async function searchResearchSource(
  sourceId,
  query,
  { signal, limit = 5, fetchImpl = globalThis.fetch, timeoutMs = 9000 } = {},
) {
  if (signal?.aborted) throw new DOMException('Search cancelled.', 'AbortError');
  const source = researchSources.find(entry => entry.id === sourceId);
  if (!source) throw new RangeError('Unknown research source.');
  const term = normalizeResearchQuery(query);
  const base = {
    sourceId, records: [], release: '', releaseDate: '', retrievedAt: '',
    searchUrl: term ? source.searchUrl(term) : source.homeUrl,
  };
  if (!term) return { ...base, status: 'empty', message: 'Enter a research term.' };
  const adapter = adapters.get(sourceId);
  if (!adapter) return { ...base, status: 'link', message: 'Search or browse this resource on the provider’s website.' };
  const count = Math.min(10, Math.max(1, Math.trunc(Number(limit)) || 5));
  const controller = new AbortController();
  const cancel = () => controller.abort(new DOMException('Search cancelled.', 'AbortError'));
  const timeout = setTimeout(() => controller.abort(new DOMException('Source timed out.', 'TimeoutError')), Math.max(1, timeoutMs));
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    const result = await adapter(term, count, controller.signal, fetchImpl);
    controller.signal.throwIfAborted();
    if (result.status === 'link') return { ...base, ...result };
    const status = result.records.length ? 'ok' : 'empty';
    const message = status === 'empty' ? 'The source returned no matching records.' :
      result.records.length + (result.records.length === 1 ? ' record retrieved.' : ' records retrieved.');
    return { ...base, ...result, status, message, retrievedAt: new Date().toISOString() };
  } catch (error) {
    if (signal?.aborted) throw new DOMException('Search cancelled.', 'AbortError');
    let message = 'The source could not be reached here. Open the source to search directly.';
    if (controller.signal.reason?.name === 'TimeoutError') message = 'The source took too long to respond. Open the source to search directly.';
    if (error instanceof SourceError && error.status === 429) message = 'The source is limiting requests. Try again later or open the source.';
    return { ...base, status: 'error', message };
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', cancel);
  }
}
