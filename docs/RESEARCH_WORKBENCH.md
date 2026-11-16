# Research workbench development

## Baseline

The starting point is the published FlyLab 3D commit `e8a6058b7d585396830880f2348d6aab12af1dc4`. The local checkout uses the existing `atif-devz/FlyLab-3D` remote. Development starts on `research-workbench` from that commit.

The existing application uses framework-free browser JavaScript, CSS and HTML, with vendored Three.js r174. Anatomical and behavioral models are procedural. The protocol catalog and lesson actions use structured JavaScript records. Plans and training progress use local storage where available. Uploads and simulations keep separate provenance. GitHub Actions verifies the offline and Pages builds before deploying the static site. The optional Node review-room relay runs separately.

The baseline offline verifier passed its 34 modules, four core lessons, eleven workspaces, analysis fixtures, animation geometry and relay tests. The Pages build passed its ten canonical-page, metadata, link and sitemap checks. Those checks exercise important software behavior but do not establish scientific validation.

The [MouseBio 3D reference](https://github.com/qasim-hussain-code/MouseBio_3D) demonstrates useful interaction patterns in its structure navigator, specimen layers, source labels, and linked view comparisons. FlyLab retains its own models and procedures. Reuse of third-party code or anatomy requires a separate license and dataset review.

## Priorities

1. Preserve published modules and add a global entry point for source-grounded research search.
2. Query browser-accessible official metadata services with source-specific adapters and fallback links. Carry stable identifiers, retrieval time and explicitly provided release information.
3. Connect source records and existing 3D workspaces to a saved experiment-context record.
4. Add independent-unit inferential analysis and reproducible exports alongside existing descriptive analysis.
5. Use separately licensed, stage-specific datasets before expanding anatomical reconstruction or connectome overlays. The present geometry is schematic.
6. Expand dissection and teaching experiences alongside independent review of the actual specimens, tools and endpoints.

The most important baseline gaps were catalog-only research search, disconnected experiment metadata, and limited inference tools. Possible anatomy improvements need appropriate assets and review. Link-only sources need separately documented permission and integration testing before their data can be mirrored.

## Evidence labels

A provider record carries the provider's identifier and link. A curated annotation describes a named source and observation. A FlyLab structure or lesson represents a teaching model, with its stage and existing sources. Links from records to teaching views are contextual navigation. A local experiment record describes the user's research design and provenance fields. It does not validate completion of a laboratory experiment.

See the [scientific validation plan](Design_and_Validation.md) for reviewer responsibilities and release gates.

## Workbench methods

Local lookups match FlyLab structure names, stage and descriptions plus indexed protocol titles and metadata. The curated Ir25a example links stable gene and protein identifiers and a published observation about adult gustatory neurons. It opens schematic whole organs. [FlyBase FBgn0031634](https://flybase.org/reports/FBgn0031634) · [NCBI Gene 33683](https://www.ncbi.nlm.nih.gov/gene/33683) · [eLife 30115](https://doi.org/10.7554/eLife.30115)

The six live searches use official browser-accessible endpoints. Ensembl accepts an exact symbol or FlyBase identifier. Virtual Fly Brain returns anatomy terms with references to its viewer. NCBI Gene and GEO, UniProtKB, and Europe PMC return species-scoped metadata. Results preserve provider attribution and available release information. The source directory also links to FlyBase, which requires opening its website because its API omits the browser cross-origin header. [NCBI E-utilities](https://www.ncbi.nlm.nih.gov/books/NBK25501/) · [UniProt API](https://www.uniprot.org/api-documentation) · [Ensembl REST](https://rest.ensembl.org/) · [Virtual Fly Brain Solr](https://www.virtualflybrain.org/docs/apis/solr/) · [Europe PMC API](https://europepmc.org/RestfulWebService)

Source requests are bounded, cancellable and optional. A provider can time out, rate-limit or return zero matches. The directory covers metadata and source discovery, and availability of an individual paper, stock, atlas or dataset is governed by its provider. FlyLab does not rehost full JoVE text or video.

Statistical inference expects one observation per independent experimental unit for Welch and ANOVA. Review use of the ANOVA assumptions and the study design before interpreting the result. The implementation includes confidence intervals for Welch, omnibus ANOVA, and Benjamini–Hochberg adjustment for an input family of p-values. Example datasets are synthetic. [NIST statistical handbook](https://www.itl.nist.gov/div898/handbook/) · [Benjamini and Hochberg](https://doi.org/10.1111/j.2517-6161.1995.tb02031.x)
