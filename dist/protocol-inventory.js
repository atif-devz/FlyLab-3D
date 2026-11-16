import { protocolCatalog } from './protocol-catalog.js';

const lastVerification = '2026-11-16';
const methodFields = ['tissue', 'instruments', 'reagents', 'prerequisites', 'procedure', 'outcomes', 'troubleshooting', 'safety'];
const sharps = 'Follow local sharps-handling and disposal procedures.';
const fixation = 'Use your laboratory’s approved fixative handling and waste procedures.';

const details = {
  'adult-brain-jove': {
    citation: 'Kelly SM, Elchert A, Kahl M. JoVE 129:e56174 (2017).',
    doi: '10.3791/56174',
    tissue: ['Adult brain', 'Mushroom bodies', 'Optic lobes', 'Photoreceptor projections'],
    instruments: ['Dissecting stereomicroscope', 'Fine forceps', 'Dissection dish', 'Confocal microscope'],
    reagents: ['Dissection buffer', 'Fixative', 'Primary and secondary antibodies', 'Mounting medium'],
    prerequisites: ['Adult specimen', 'Identify the compound eyes and head capsule', 'Select a downstream marker or imaging end point'],
    procedure: ['Expose the brain through the head capsule', 'Clear retinal and cuticular material without tearing the brain', 'Fix, stain and mount the brain as appropriate for the imaging end point'],
    outcomes: ['Intact whole brain with usable optic lobes', 'Fluorescent labels in the structures targeted by the selected markers'],
    troubleshooting: ['If one optic lobe is missing, review how force was applied near the retina', 'If the brain is obscured, inspect for remaining cuticle or air bubbles'],
    safety: [sharps, fixation],
  },
  'adult-vnc-jove': {
    citation: 'Börner J, Godenschwege TA. JoVE 52:e3080 (2011).',
    doi: '10.3791/3080',
    tissue: ['Adult ventral nerve cord', 'Cervical connective', 'Thorax'],
    instruments: ['Dissecting stereomicroscope', 'Fine forceps', 'Dissection support', 'Micromanipulator for the published recording workflow'],
    reagents: ['Physiological saline', 'Tracer dye for the published workflow'],
    prerequisites: ['Adult specimen', 'Identify the dorsal thorax and the neck connection'],
    procedure: ['Secure the adult so the dorsal thorax is accessible', 'Expose the dorsal surface of the VNC and clear obstructing tissue', 'Check that the cervical connective remains continuous'],
    outcomes: ['Ventral nerve cord exposed in place', 'Head and cervical connection preserved'],
    troubleshooting: ['If the VNC is difficult to see, check orientation and look for obscuring tissue before continuing', 'Treat a severed cervical connective as a failed intact preparation'],
    safety: [sharps],
  },
  'larval-cns-jove': {
    citation: 'Hafer N, Schedl P. JoVE 1:e85 (2006).',
    doi: '10.3791/85',
    tissue: ['Third-instar brain lobes', 'Larval ventral nerve cord', 'Larval cuticle'],
    instruments: ['Dissecting stereomicroscope', 'Two pairs of fine forceps', 'Dissection dish', 'Microscope slide'],
    reagents: ['Dissection buffer', 'Reagents for optional fixation and immunostaining'],
    prerequisites: ['Third-instar larva', 'Identify the anterior mouth hooks and posterior spiracles'],
    procedure: ['Expose the larval central nervous system from the cuticle', 'Identify the paired brain lobes and the central cord before clearing other tissue', 'In the published route, retain the cuticle support through staining and release the CNS for mounting'],
    outcomes: ['Paired brain lobes still connected to the ventral nerve cord', 'Specimen available for whole-mount inspection'],
    troubleshooting: ['If the brain lobes and VNC have separated, record that the intended whole CNS preparation was lost', 'Review which tissue was held and how the specimen was supported'],
    safety: [sharps, fixation],
  },
  'larval-vnc-open': {
    citation: 'Clayworth K, Gilbert M, Auld V. Cold Spring Harbor Protocols (2024).',
    doi: '10.1101/pdb.prot108160',
    tissue: ['Third-instar ventral nerve cord', 'Larval body wall', 'Peripheral nerves'],
    instruments: ['Dissecting stereomicroscope', 'Dissection pins', 'Fine forceps', 'Fine scissors', 'Lined dissection dish'],
    reagents: ['Dissection saline', 'Fixation and immunolabeling reagents appropriate to the target'],
    prerequisites: ['Third-instar larva', 'Identify the dorsal and ventral surfaces'],
    procedure: ['Position the larva for a dorsal opening', 'Spread the cuticle to expose the ventral CNS and peripheral branches', 'Clear overlying tissue while retaining the ventral body wall and nerves'],
    outcomes: ['Supported fillet exposing the VNC and peripheral nerves', 'Tissue retained in anatomical context for immunolabeling'],
    troubleshooting: ['If the body wall twists, check the pin positions and orientation', 'If the VNC lifts with adjacent tissue, stop and identify which attachment is pulling on it'],
    safety: [sharps, fixation],
  },
  'adult-cns-flylight': {
    citation: 'FlyLight. HHMI Janelia Research Campus. Adult CNS dissection and fixation protocol.',
    tissue: ['Adult brain', 'Adult ventral nerve cord', 'Cervical connective'],
    instruments: ['Dissecting stereomicroscope', 'Fine forceps', 'Dissection dish'],
    reagents: ['Dissection buffer', 'Fixative specified by FlyLight'],
    prerequisites: ['Adult Drosophila specimen', 'Define whether the brain and VNC should remain connected'],
    procedure: ['Expose the adult CNS using the FlyLight preparation route', 'Check the head-to-thorax connection before transferring tissue', 'Use the cited fixation and imaging workflow'],
    outcomes: ['Adult CNS prepared for immunolabeling and anatomical imaging'],
    troubleshooting: ['Inspect the neck connective after handling to confirm continuity'],
    safety: [sharps, fixation],
  },
  'larval-cns-flylight': {
    citation: 'FlyLight. HHMI Janelia Research Campus. Larval CNS dissection and fixation protocol (2019 revision).',
    tissue: ['Third-instar brain lobes', 'Larval ventral nerve cord'],
    instruments: ['Dissecting stereomicroscope', 'Fine forceps', 'Dissection dish', 'Transfer pipette'],
    reagents: ['Dissection buffer', 'Fixative specified by FlyLight'],
    prerequisites: ['Third-instar larvae', 'Confirm that the planned imaging needs a whole CNS'],
    procedure: ['Expose the CNS near the anterior of the larva', 'Clear neighboring tissue and check brain-to-cord continuity', 'Transfer and preserve the CNS for the downstream imaging workflow'],
    outcomes: ['An intact larval CNS with connected brain lobes and ventral nerve cord'],
    troubleshooting: ['Inspect the preparation to distinguish CNS tissue from adherent gut or cuticle'],
    safety: [sharps, fixation],
  },
  'adult-brain-whole-mount': {
    citation: 'Tito AJ, Cheema S, Jiang M, Zhang S. JoVE 118:e55128 (2016).',
    doi: '10.3791/55128',
    tissue: ['Adult brain', 'Head capsule', 'Retina'],
    instruments: ['Dissecting stereomicroscope', 'Fine forceps', 'Dissection dish'],
    reagents: ['Dissection buffer', 'Whole-mount fixation and labeling reagents'],
    prerequisites: ['Adult fly', 'Identify the compound eyes and brain orientation'],
    procedure: ['Free the brain from the head capsule', 'Inspect the paired lobes before fixation and mounting'],
    outcomes: ['Whole adult brain suitable for evaluation of the structures of interest'],
    troubleshooting: ['Check for obvious damage or remaining cuticular fragments before accepting a preparation'],
    safety: [sharps, fixation],
  },
  'larval-vnc-patch': {
    doi: '10.3791/58375',
    tissue: ['Third-instar brain lobes', 'Larval ventral nerve cord'],
    instruments: ['Dissecting stereomicroscope', 'Fine forceps', 'Electrophysiology rig', 'Recording electrode'],
    reagents: ['Physiological solutions specified by the original procedure'],
    prerequisites: ['Third-instar larvae', 'Familiarity with basic electrophysiology instrumentation'],
    procedure: ['Prepare the larval CNS for access', 'Place the recording electrode as described in the original method', 'Acquire a trace and distinguish activity from recording artifacts'],
    outcomes: ['Electrophysiological recordings from the prepared larval CNS'],
    troubleshooting: ['Check dissection integrity and electrode contact if the trace is unstable'],
    safety: [sharps],
  },
  'optic-lobes-jove': {
    doi: '10.3791/61273',
    tissue: ['Adult optic lobes', 'Larval optic-lobe primordia', 'Brain'],
    instruments: ['Dissecting stereomicroscope', 'Fine forceps', 'Microscope slide', 'Confocal microscope'],
    reagents: ['Stage-appropriate dissection buffer', 'Fixative', 'Antibodies', 'Mounting medium'],
    prerequisites: ['Identify the correct life stage and desired viewing plane'],
    procedure: ['Dissect and immunolabel the stage-matched brain', 'Orient the desired optic lobe in the mounting plane'],
    outcomes: ['Optic-lobe structures visible in an intentional orientation'],
    safety: [sharps, fixation],
  },
  'adult-vnc-imaging': {
    doi: '10.1038/s41467-018-06857-z',
    tissue: ['Adult ventral nerve cord', 'Thorax'],
    instruments: ['Dissecting stereomicroscope', 'Fly mounting assembly', 'Two-photon microscope'],
    prerequisites: ['Define the activity readout and behavioral measure'],
    procedure: ['Prepare optical access to the thoracic cord', 'Collect neural signals and walking measurements together'],
    outcomes: ['Neural activity signals collected alongside adult locomotion'],
    safety: [sharps],
  },
  'midgut-jove': {
    tissue: ['Adult midgut', 'Digestive tract'],
    instruments: ['Dissecting stereomicroscope', 'Fine forceps', 'Dissection dish'],
    reagents: ['Dissection buffer'],
    procedure: ['Expose the digestive tract', 'Trace the gut from anterior to posterior and isolate the midgut region of interest'],
    outcomes: ['Adult gut with identifiable midgut regions'],
    troubleshooting: ['Check that the gut has not been pulled apart at a region boundary before recording anatomy'],
    safety: [sharps],
  },
  'ovary-jove': {
    tissue: ['Adult ovary', 'Ovarioles', 'Egg chambers'],
    instruments: ['Dissecting stereomicroscope', 'Fine forceps', 'Dissection dish'],
    reagents: ['Dissection medium'],
    prerequisites: ['Adult female fly'],
    procedure: ['Access the paired ovaries within the abdomen', 'Separate the ovarian tissue for inspection'],
    outcomes: ['Ovarian tissue suitable for inspection'],
    safety: [sharps],
  },
  'indirect-flight-muscles': {
    tissue: ['Adult thorax', 'Indirect flight muscles'],
    instruments: ['Dissecting stereomicroscope', 'Fine dissection tools', 'Microscope'],
    outcomes: ['Thoracic flight fibers with visible architecture'],
    safety: [sharps],
  },
  'larval-nmj': {
    doi: '10.3791/1107',
    tissue: ['Larval body-wall muscle', 'Motor nerves', 'Neuromuscular junction'],
    instruments: ['Dissecting stereomicroscope', 'Dissection pins', 'Fine forceps', 'Fine scissors'],
    reagents: ['Dissection saline'],
    procedure: ['Open and support the larval body wall as a fillet', 'Clear tissue obscuring the segmental muscles and motor branches'],
    outcomes: ['Larval fillet exposing muscles and their innervation'],
    safety: [sharps],
  },
  'imaginal-discs': {
    doi: '10.3791/51792',
    tissue: ['Larval imaginal discs', 'Wing disc', 'Eye-antennal disc'],
    instruments: ['Dissecting stereomicroscope', 'Fine forceps', 'Microscopy setup'],
    reagents: ['Dissection buffer', 'Fixation and immunolabeling reagents'],
    prerequisites: ['Choose the disc type and larval stage to compare'],
    procedure: ['Identify the target disc by its position and shape', 'Remove adjacent tissue before staining and mounting'],
    outcomes: ['Dissected imaginal discs ready for tissue labeling'],
    safety: [sharps, fixation],
  },
  'polytene-preparation': {
    doi: '10.1101/pdb.prot4708',
    tissue: ['Larval salivary gland', 'Polytene chromosomes'],
    instruments: ['Dissecting stereomicroscope', 'Fine forceps', 'Slide and coverslip'],
    outcomes: ['A chromosome preparation with distinguishable polytene bands'],
    safety: [sharps],
  },
  'egg-chambers': {
    doi: '10.3791/3679',
    tissue: ['Adult ovariole', 'Egg chamber'],
    instruments: ['Dissecting stereomicroscope', 'Fine forceps', 'Live imaging chamber'],
    reagents: ['Dissection and culture medium'],
    prerequisites: ['Identify egg chambers at the developmental stage required by the imaging question'],
    procedure: ['Separate a stage-matched chamber from its ovariole', 'Position the chamber for time-lapse observation'],
    outcomes: ['Individual chambers positioned for observation over time'],
    safety: [sharps],
  },
  'larval-neuroblast': {
    tissue: ['Larval brain', 'Neuroblasts'],
    instruments: ['Dissecting stereomicroscope', 'Fine forceps', 'Live imaging microscope'],
    reagents: ['Dissection and culture medium'],
    outcomes: ['Time series of recognizable neuroblast divisions'],
    safety: [sharps],
  },
  'pupal-eye': {
    doi: '10.3791/52120',
    tissue: ['Pupal eye epithelium', 'Developing retina'],
    instruments: ['Dissecting stereomicroscope', 'Fine forceps', 'Live imaging microscope'],
    outcomes: ['Time series showing changes in pupal eye cell arrangement'],
    safety: [sharps],
  },
  'embryo-hanging-drop': {
    doi: '10.3791/1206',
    tissue: ['Intact embryo'],
    instruments: ['Dissecting stereomicroscope', 'Coverslip', 'Live imaging chamber'],
    reagents: ['Mounting oil'],
    procedure: ['Select embryos for the intended developmental window', 'Orient the embryos on the support before time-lapse observation'],
    outcomes: ['Mounted embryos that remain in view during time-lapse imaging'],
  },
  'pupal-epithelia': {
    doi: '10.3791/60282',
    tissue: ['Pupal epithelia'],
    instruments: ['Live imaging microscope', 'Image-analysis software'],
    outcomes: ['Measurements of tissue orientation and growth from staged time series'],
  },
  'embryo-larva-harvest': {
    tissue: ['Intact embryos', 'Intact larvae'],
    instruments: ['Collection chamber', 'Dissecting stereomicroscope'],
    outcomes: ['Identified embryonic and larval cohorts ready for observation'],
  },
  'adult-behavior': {
    doi: '10.3791/3795',
    tissue: ['Whole adult fly'],
    instruments: ['Behavioral assay arena', 'Timing or video-recording system'],
    prerequisites: ['Define the behavior and standardize age, handling and test conditions'],
    procedure: ['Collect matched observations in each comparison group', 'Score the predefined behavioral endpoint'],
    outcomes: ['Comparable assay observations for each defined adult behavioral endpoint'],
  },
  'adult-courtship-memory': {
    doi: '10.3791/55808',
    tissue: ['Whole adult fly'],
    instruments: ['Courtship arena', 'Video-recording system'],
    prerequisites: ['Define trained and comparison groups before scoring'],
    outcomes: ['An observed change in courtship behavior relative to a comparison group'],
  },
  'larval-light-choice': {
    doi: '10.3791/50237',
    tissue: ['Whole larva'],
    instruments: ['Light-choice arena', 'Controlled illumination'],
    prerequisites: ['Stage larvae consistently and define the observation endpoint'],
    outcomes: ['A distribution across lit and shaded areas suitable for a preference calculation'],
  },
  'larval-crawling': {
    doi: '10.21769/BioProtoc.2933',
    tissue: ['Whole larva', 'Body-wall muscles'],
    instruments: ['Crawling arena', 'Video-recording system', 'Image-analysis software'],
    outcomes: ['Measures of travel distance and body contractions'],
  },
  'fly-husbandry': {
    tissue: ['Whole flies and developing stages'],
    instruments: ['Fly vials', 'Culture incubator', 'Fly handling equipment'],
    reagents: ['Fly food'],
    outcomes: ['Maintained stocks and consistently staged cohorts'],
  },
  'fly-lab-maintenance': {
    doi: '10.1101/pdb.ip35',
    tissue: ['Whole flies and developing stages'],
    instruments: ['Culture vials', 'Culture incubator', 'Fly handling equipment'],
    reagents: ['Fly food'],
    outcomes: ['Routine culture and stock handling workflows'],
  },
  'fly-genetics-teaching': {
    citation: 'Lakhotia SC, Ranganath HA, eds. Experiments with Drosophila for Biology Courses (2021). Hosted at FlyBase.',
    tissue: ['Whole fly', 'Visible adult traits'],
    instruments: ['Dissecting stereomicroscope', 'Culture vials'],
    outcomes: ['Classroom identification and inheritance exercises with observable phenotypes'],
  },
  'fly-biology-teaching': {
    tissue: ['Whole adult fly', 'Distinguishing adult traits'],
    instruments: ['Dissecting stereomicroscope', 'Culture vials'],
    outcomes: ['Recognize adult sex differences and interpret basic classroom crosses'],
  },
  'adult-testes-jove': {
    citation: 'Zamore PD, Ma S. JoVE 51:e2641 (2011).',
    doi: '10.3791/2641',
    tissue: ['Adult testis', 'Male reproductive tract'],
    instruments: ['Dissecting stereomicroscope', 'Fine forceps', 'Dissection dish'],
    reagents: ['Dissection buffer'],
    prerequisites: ['Adult male fly'],
    procedure: ['Expose the male reproductive tract', 'Recognize the coiled testes and separate them from adjacent tissues'],
    outcomes: ['Isolated testes recognized by their shape and anatomical relationship to the tract'],
    safety: [sharps],
  },
  'malpighian-ramsay': {
    doi: '10.3791/53144',
    tissue: ['Adult Malpighian tubules'],
    instruments: ['Dissecting stereomicroscope', 'Fine forceps', 'Microelectrodes'],
    reagents: ['Assay solutions specified in the source'],
    prerequisites: ['Define fluid or ion flux as the primary measured endpoint'],
    procedure: ['Identify and isolate the renal tubules', 'Observe and quantify secretion and ion transport with the published assay'],
    outcomes: ['Fluid secretion and ion flux estimates from identified renal tubules'],
    safety: [sharps],
  },
  'larval-salivary-imaging': {
    citation: 'Ma CJ, Brill JA. Bio-protocol 11:e4039 (2021).',
    doi: '10.21769/BioProtoc.4039',
    tissue: ['Larval salivary gland', 'Secretory granules'],
    instruments: ['Dissecting stereomicroscope', 'Fine forceps', 'Microscope', 'Image-analysis software'],
    procedure: ['Prepare salivary tissue for imaging', 'Measure granules in a consistently selected gland region'],
    outcomes: ['Granule size estimates made using consistent image selection and measurement'],
    safety: [sharps],
  },
  'pupal-wing-jove': {
    doi: '10.3791/55854',
    tissue: ['Pupal wing', 'Developing wing epithelium'],
    instruments: ['Dissecting stereomicroscope', 'Fine forceps'],
    prerequisites: ['Select a defined pupal stage and downstream analysis'],
    procedure: ['Expose the wing region in a staged pupa', 'Separate the developing wing without compressing the epithelium'],
    outcomes: ['Developing wing separated for the intended examination'],
    safety: [sharps],
  },
  'embryo-ephys-prep': {
    tissue: ['Late embryo', 'Embryonic body wall', 'Embryonic nerves and muscles'],
    instruments: ['Dissecting stereomicroscope', 'Fine dissection tools', 'Coverslip'],
    reagents: ['Dissection saline'],
    prerequisites: ['Identify late embryonic stage by anatomical landmarks'],
    outcomes: ['An oriented embryo preparation with accessible body-wall tissues'],
    safety: [sharps],
  },
  'labellar-tip-recording': {
    doi: '10.3791/51355',
    tissue: ['Adult labellum', 'Gustatory sensilla'],
    instruments: ['Dissecting stereomicroscope', 'Micromanipulator', 'Recording electrode', 'Signal acquisition system'],
    reagents: ['Taste stimulus solution', 'Recording carrier solution'],
    prerequisites: ['Identify the recording sensillum and define stimulus controls'],
    procedure: ['Position the recording probe on an identified sensillum', 'Acquire evoked signals and inspect the spike train'],
    outcomes: ['A spike trace suitable for evaluating sensillar responses'],
    troubleshooting: ['Check baseline stability and sensillum contact before comparing conditions'],
    safety: [sharps],
  },
  'per-jove': {
    doi: '10.3791/193',
    tissue: ['Whole adult fly', 'Proboscis'],
    instruments: ['Dissecting stereomicroscope', 'Stimulus applicator', 'Fly holder'],
    reagents: ['Taste stimulus solutions'],
    prerequisites: ['Define response criteria and control stimulus before testing'],
    procedure: ['Present the control and test stimuli', 'Score the visible extension response consistently across groups'],
    outcomes: ['Proportion of flies extending the proboscis under each tested condition'],
    troubleshooting: ['Check that each fly can move its proboscis freely before interpreting a low response'],
  },
  'cafe-jove': {
    citation: 'Diegelmann S et al. JoVE 121:e55024 (2017).',
    doi: '10.3791/55024',
    tissue: ['Whole adult fly'],
    instruments: ['Capillary feeder', 'Fly chamber', 'Volume scale'],
    reagents: ['Liquid food'],
    prerequisites: ['Prepare matched no-fly evaporation controls'],
    procedure: ['Record capillary volumes at the start and end of an observation window', 'Compare the change with matched no-fly controls'],
    outcomes: ['Evaporation-corrected food volume consumed over a selected interval'],
    troubleshooting: ['Check for leaks or excessive evaporation if blank capillaries lose more liquid than expected'],
  },
  'flypad-primary': {
    citation: 'Itskov PM et al. Nature Communications 5:4560 (2014).',
    doi: '10.1038/ncomms5560',
    tissue: ['Whole adult fly', 'Proboscis'],
    instruments: ['flyPAD arena', 'Capacitance acquisition system', 'Signal-analysis software'],
    reagents: ['Food presented at sensing sites'],
    prerequisites: ['Verify channel stability and define bout and sip measurements'],
    procedure: ['Collect capacitance traces while individual flies interact with food', 'Identify candidate feeding events using the described signal analysis'],
    outcomes: ['Timestamped inferred contact events and feeding bouts'],
    troubleshooting: ['Check baseline drift and channel-specific artifacts before interpreting event counts'],
  },
  'sleep-monitoring': {
    doi: '10.1101/pdb.top108095',
    tissue: ['Whole adult fly'],
    instruments: ['Drosophila Activity Monitor', 'Individual monitoring tubes'],
    prerequisites: ['Define light schedule and inactivity criteria in advance'],
    outcomes: ['Activity time series and inactivity-derived estimates of sleep bouts'],
  },
  'bdsc-fly-manual': {
    citation: 'Markstein M. Drosophila Workers Unite! (2018). Hosted by the Bloomington Drosophila Stock Center.',
    tissue: ['Whole flies and developing stages'],
    instruments: ['Culture vials', 'Fly handling equipment'],
    reagents: ['Fly culture media'],
    outcomes: ['Teaching reference for recognizing, handling and maintaining flies'],
  },
  'larval-gut-motility': {
    tissue: ['Larval midgut', 'Midgut junction', 'Visceral muscle'],
    instruments: ['Dissecting stereomicroscope', 'Microscope for live observation'],
    prerequisites: ['Identify the midgut region being measured'],
    outcomes: ['Observed contractions documented by gut region'],
    safety: [sharps],
  },
};

const institutional = new Set(['adult-cns-flylight', 'larval-cns-flylight', 'fly-genetics-teaching', 'fly-biology-teaching', 'bdsc-fly-manual', 'embryo-larva-harvest', 'midgut-jove', 'ovary-jove']);

function sourceStatus(url) {
  const hostname = /^https:\/\/([^/]+)/.exec(url)?.[1];
  if (hostname === 'pmc.ncbi.nlm.nih.gov') return 'Full-text article record (PMC)';
  if (hostname === 'pubmed.ncbi.nlm.nih.gov') return 'Indexed citation (PubMed)';
  if (hostname === 'www.jove.com') return 'Publisher record (JoVE)';
  if (hostname === 'www.nature.com') return 'Publisher article';
  return 'Institutional resource';
}

export const inventory = protocolCatalog.map(record => {
  const extra = details[record.id] ?? {};
  const method = Object.fromEntries(methodFields.map(field => [field, extra[field] ?? []]));
  return {
    ...record,
    ...method,
    citation: extra.citation ?? (record.title + '. ' + record.publisher + '.'),
    doi: extra.doi ?? null,
    verification: { date: lastVerification, sourceStatus: sourceStatus(record.url) },
    validation: {
      procedure: institutional.has(record.id) ? 'institutional-reference' : 'published-method',
      simulation: record.lesson ? 'educational-prototype' : null,
    },
  };
});

function csvCell(value) {
  let cell = Array.isArray(value) ? value.join(' | ') : String(value ?? '');
  if (/^[\s\uFEFF]*[=+\-@]|^[\t\r\n]/u.test(cell)) cell = "'" + cell;
  return '"' + cell.replaceAll('"', '""') + '"';
}

export function inventoryCsv() {
  const header = ['id', 'title', 'stage', 'category', 'publisher', 'url', 'citation', 'doi', 'summary', 'lesson',
    ...methodFields, 'last_verified', 'source_status', 'procedure_status', 'simulation_status'];
  const rows = inventory.map(record => [
    record.id, record.title, record.stage, record.category, record.publisher, record.url, record.citation, record.doi, record.summary, record.lesson,
    ...methodFields.map(field => record[field]), record.verification.date, record.verification.sourceStatus,
    record.validation.procedure, record.validation.simulation,
  ]);
  return [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

