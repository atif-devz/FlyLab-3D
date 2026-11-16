export const larvalAnatomy = [
  { id: 'larval-cuticle', name: 'Larval cuticle', system: 'external', location: 'Body wall', source: 'larval-sem',
    description: 'The flexible cuticle covers the segmented body. Rows of small denticles on the ventral surface help the larva gain traction during crawling.' },
  { id: 'mouth-hooks', name: 'Mouth hooks', system: 'external', location: 'Anterior tip', source: 'larval-sem',
    description: 'The dark paired hooks are part of the mouth skeleton and provide a landmark for the anterior end.' },
  { id: 'spiracles', name: 'Anterior and posterior spiracles', system: 'external', location: 'Near both ends of the body', source: 'larval-sem',
    description: 'Larval spiracles connect the atmosphere to the tracheal network. The posterior pair marks the tail end.' },
  { id: 'larval-brain', name: 'Larval brain lobes', system: 'nervous', location: 'Anterior body', source: 'larval-cns-method',
    description: 'The two brain lobes lie near the anterior of the larva. They connect to the ventral nerve cord and can be examined together in a whole CNS preparation.' },
  { id: 'larval-vnc', name: 'Larval ventral nerve cord', system: 'nervous', location: 'Ventral to the gut', source: 'larval-cns-method',
    description: 'The ventral nerve cord contains segmental circuits and connects anteriorly to the brain. Its paired segmental nerves run toward the body wall.' },
  { id: 'larval-tracheae', name: 'Dorsal tracheal trunks', system: 'respiratory', location: 'Paired along the dorsal body', source: 'larval-sem',
    description: 'The paired main airways connect to spiracles and branch through much of the body, supplying oxygen to tissues.' },
  { id: 'larval-gut', name: 'Larval digestive tract', system: 'digestive', location: 'Central body cavity', source: 'larva-midgut',
    description: 'The larval digestive tract processes food during growth. Its central coils provide an anatomical reference when finding the ventral nerve cord.' },
];

export const larvalSources = [
  { id: 'larval-sem', title: 'External morphology atlas across the fruit fly life cycle', credit: 'Jürgens et al., Genetics', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11457947/' },
  { id: 'larval-cns-method', title: 'Dissection of larval CNS in Drosophila melanogaster', credit: 'Journal of Visualized Experiments', url: 'https://pubmed.ncbi.nlm.nih.gov/18704179/' },
  { id: 'larva-midgut', title: 'Development of the fruit fly digestive tract', credit: 'Volker Hartenstein, Atlas of Drosophila Development', url: 'https://www.sdbonline.org/sites/fly/atlas/3233.htm' },
];

