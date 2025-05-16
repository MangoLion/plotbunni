/**
 * @file src/data/conceptTemplates.js
 * @description Defines the default concept templates for new novels.
 * Each object in DEFAULT_CONCEPT_TEMPLATES will be processed by `createConceptTemplate`
 * in `models.js` to add `id`, `isDefault: true`, `creation_date`, and `last_modified_date`.
 */

/**
 * @typedef {import('./models').ConceptTemplateData} ConceptTemplateData
 */

/**
 * @type {Array<{name: string, templateData: ConceptTemplateData}>}
 */
export const DEFAULT_CONCEPT_TEMPLATES = [
  {
    name: "Character",
    templateData: {
      tags: ["character"],
      description: "A character in the story. Consider their motivations, backstory, appearance, and role.",
      notes: "- Strengths:\n- Weaknesses:\n- Goals:\n- Conflicts:",
      priority: 10,
    }
  },
  {
    name: "Location",
    templateData: {
      tags: ["location"],
      description: "A place where events in the story occur. Think about its atmosphere, significance, and key features.",
      notes: "- Sensory details (sight, sound, smell):\n- History:\n- Importance to plot:",
      priority: 20,
    }
  },
  {
    name: "Item",
    templateData: {
      tags: ["item", "object"],
      description: "A significant object in the story. What is its origin, purpose, or power?",
      notes: "- Appearance:\n- Abilities/Properties:\n- Who possesses it?",
      priority: 30,
    }
  }
  
];
