const prep = (id, label, detail, action) => ({ id, label, detail, action });
const question = (prompt, choices, answer, explanation) => ({ prompt, choices, answer, explanation });

export const preparationTools = { dish: 'Dissection dish', medium: 'Dissection medium', specimen: 'Stage and position', instruments: 'Instrument check' };

export const trainingDefinitions = {
  'adult-brain': {
    goal: 'Recover the adult central brain with both optic lobes attached.',
    readiness: [
      prep('specimen', 'Confirm the immobilized adult', 'Locate the head, compound eyes, and thorax before positioning.', 'position'),
      prep('dish', 'Set the dissection dish', 'Use the virtual well to keep the head and freed preparation within view.', 'dish'),
      prep('medium', 'Add dissection medium', 'The virtual saline represents a fluid workspace for the published brain preparation.', 'medium'),
      prep('instruments', 'Check fine forceps and transfer tool', 'Choose the instrument by its purpose: support, open, release, or transfer.', 'handling'),
    ],
    failure: 'If eye tissue remains attached or a lobe is missing, revisit the release step and distinguish the eye from the adjacent optic lobe.',
    criteria: ['Head capsule opened', 'Both optic lobes preserved in the model', 'Brain transferred as one piece'],
    questions: [
      question('Which tissue lies just medial to each compound eye?', ['Optic lobe', 'Crop', 'Ventral nerve cord'], 0, 'The paired optic lobes flank the central brain, adjacent to the visual periphery.'),
      question('What is the success criterion when clearing the eye tissue?', ['Separate the two brain halves', 'Keep both optic lobes attached', 'Keep the head capsule closed'], 1, 'Removing the surrounding tissue reveals the brain while preserving its lateral lobes.'),
      question('What is the correct object to transfer in this lesson?', ['A single compound eye', 'The whole head capsule', 'The freed brain with both lobes'], 2, 'The endpoint is an isolated preparation with the central brain and both optic lobes.'),
    ],
  },
  'adult-vnc': {
    goal: 'Expose the thoracic ventral nerve cord in situ and preserve the cervical connective.',
    readiness: [
      prep('specimen', 'Confirm the immobilized adult', 'Identify the dorsal thoracic midline before turning the specimen dorsal side up.', 'position'),
      prep('dish', 'Set the pinned preparation dish', 'The model uses a dish surface that accepts pins around the specimen.', 'dish'),
      prep('medium', 'Add dissection medium', 'The virtual saline represents the buffered medium used in the published preparation.', 'medium'),
      prep('instruments', 'Check pins, scissors, and forceps', 'Plan to anchor the cuticle, open it shallowly, then clear overlying tissue.', 'handling'),
    ],
    failure: 'When the VNC is hard to see, look for overlying tissue from the dorsal view. Keep dissection tools away from the neck connective.',
    criteria: ['Dorsal access opened', 'Overlying tissue cleared', 'Thoracic VNC and neck connection preserved in the model'],
    questions: [
      question('Where is the adult ventral nerve cord relative to the gut in the thorax?', ['Dorsal to it', 'Ventral to it', 'Inside it'], 1, 'The gut lies above the VNC when working through the dorsal thorax.'),
      question('Why use a shallow opening along the dorsal midline?', ['To prevent damage to underlying neural tissue', 'To separate both optic lobes', 'To create an opening in the eye'], 0, 'Dorsal access should preserve the tissues underneath, especially the VNC and the cervical connective.'),
      question('What preparation does this lesson demonstrate?', ['An isolated adult brain', 'A dissociated VNC sample', 'An exposed VNC retained in the adult'], 2, 'The whole-mount approach preserves the cord in place and retains the connection toward the head.'),
    ],
  },
  'larval-brain': {
    goal: 'Transfer the third-instar brain lobes and ventral nerve cord as one connected preparation.',
    readiness: [
      prep('specimen', 'Confirm the third-instar larva', 'Use the mouth hooks and posterior spiracles to identify the two ends of the model.', 'position'),
      prep('dish', 'Set the dissection and receiving wells', 'Use a second virtual well to inspect the isolated CNS.', 'dish'),
      prep('medium', 'Add dissection medium', 'In the simulator a liquid workspace supports transfer of the intact CNS.', 'medium'),
      prep('instruments', 'Check fine forceps and transfer tool', 'Practice working at the body wall and surrounding tissue while protecting the CNS.', 'handling'),
    ],
    failure: 'If the CNS outline is hard to distinguish, follow it from the anterior lobes to the narrower ventral cord before transferring.',
    criteria: ['Anterior cuticle opened', 'Both lobes and the VNC identified', 'Connected CNS transferred and inspected'],
    questions: [
      question('Which landmark helps you identify the anterior end?', ['Posterior spiracles', 'Mouth hooks', 'Abdominal tip'], 1, 'The mouth hooks are at the larval anterior end, near the head structures.'),
      question('Which structures make up the preparation you transfer in this lesson?', ['Brain lobes and attached ventral nerve cord', 'Gut and posterior spiracles', 'Brain lobes only'], 0, 'The training endpoint preserves the brain–VNC connection in one preparation.'),
      question('How can you assess the transferred specimen?', ['Check only whether it is transparent', 'Count adult legs on the specimen', 'Check both lobes and the continuous cord'], 2, 'The simulator shows the two lobes and continuity toward the ventral nerve cord.'),
    ],
  },
  'larval-vnc': {
    goal: 'Expose the larval ventral nerve cord from the dorsal side and inspect its continuity and peripheral connections.',
    readiness: [
      prep('specimen', 'Confirm the third-instar larva', 'Locate the posterior spiracles and orient the dorsal body wall toward the virtual microscope.', 'position'),
      prep('dish', 'Set the pinned preparation dish', 'Use the virtual dish surface as the anchor for the body wall.', 'dish'),
      prep('medium', 'Add dissection medium', 'The diagram shows a hydrated workspace for opening and viewing the preparation.', 'medium'),
      prep('instruments', 'Check pins and fine dissection tools', 'Plan to support and open the body wall without making contact with the neural structures.', 'handling'),
    ],
    failure: 'If the gut still covers the cord, use the dorsal view to distinguish the central digestive tract from the ventral neural tissue.',
    criteria: ['Body wall opened from the dorsal side', 'Obscuring tissues cleared', 'Cord and visible peripheral connections retained'],
    questions: [
      question('Which surface is opened in this larval preparation?', ['The dorsal body wall', 'The ventral cord', 'The anterior mouth hooks'], 0, 'Dorsal access leaves the ventral tissue bed available for inspection.'),
      question('Which landmark helps orient the posterior end?', ['Brain lobes', 'Mouth hooks', 'Posterior spiracles'], 2, 'The posterior spiracles identify the end opposite the mouth hooks.'),
      question('Which is the target endpoint?', ['Removing the VNC from the body wall', 'Leaving the exposed VNC in place', 'Removing the paired brain lobes'], 1, 'The fillet-style practice retains the cord and relationships to surrounding structures.'),
    ],
  },
};

