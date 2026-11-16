# Contributing to FlyLab 3D

## Software and documentation

Use the [software issue template](.github/ISSUE_TEMPLATE/software.md) for a bug or usability improvement. Include the affected workspace, browser and operating system, and what you expected to happen. Prefer a synthetic or bundled example when reporting a problem with data import, export, or analysis.

Keep pull requests focused. Explain how the change affects the learner experience and list the checks you actually ran. For interface or 3D changes, describe what you verified in the browser and include a screenshot or recording when it clarifies the change.

Run the local development steps in [the README](README.md). To check the standalone build, run these commands from the project root.

```sh
node make-portable.mjs FlyBio_3D.html
node --experimental-vm-modules verify-portable.mjs FlyBio_3D.html
```

The automated checks complement browser testing. For changes to shared viewers or controls, exercise the affected workspace and an existing workflow that uses the same component.

## Scientific review

Use the [scientific correction template](.github/ISSUE_TEMPLATE/scientific_accuracy.md) to flag inaccuracies in anatomy, terminology, methods, or simulated interpretation. Name the lesson, structure, or step. Explain the correction and link to the relevant publication, atlas, protocol, or database record. A page, figure, table, or accession helps reviewers locate the evidence.

Use the [protocol proposal template](.github/ISSUE_TEMPLATE/protocol_proposal.md) to suggest a new lesson or catalog entry. State the learning objective, species and life stage, scientific sources, and whether you are proposing a catalog entry or an interactive exercise.

Review scientific evidence and the activity's educational scope separately from code and automated tests. Keep schematic anatomy and synthetic outcomes labeled, and describe which claims the cited material supports.

For source contributions, see `dist/protocol-catalog.js` and `dist/protocol-inventory.js` for bibliography, `dist/protocol-lessons.js` for lesson steps, and `dist/training-definitions.js` for preparation and assessment. Record the origin, redistribution terms, and attribution for any third-party material included in the project. Link to published materials when a reference is sufficient.

Report vulnerabilities through the [security policy](SECURITY.md). Follow the [code of conduct](CODE_OF_CONDUCT.md) in all project discussions.
