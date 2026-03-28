"use strict";Object.defineProperty(exports, "__esModule", {value: true});// Validator utility functions for UML diagrams and descriptions
var _zod = require('zod');
// Re-export Zod for convenience
exports.z = _zod;

/**
 * UML model validation schema
 */
const umlModelSchema = _zod.z.object({
  id: _zod.z.string().optional(),
  diagram: _zod.z.any().optional(),
  descriptions: _zod.z.any().optional(),
  ssds: _zod.z.any().optional()
}); exports.umlModelSchema = umlModelSchema;










































/**
 * Validate a use case diagram structure
 */
 const validateDiagram = (diagramData) => {
  const errors = [];
  const { nodes, edges } = diagramData;

  // Check if diagram has at least one actor
  const actors = nodes.filter(node => node.type === 'actor');
  if (actors.length === 0) {
    errors.push('Diagram must have at least one actor');
  }

  // Check if diagram has at least one use case
  const useCases = nodes.filter(node => node.type === 'useCase');
  if (useCases.length === 0) {
    errors.push('Diagram must have at least one use case');
  }

  // Check if all edge connections are valid
  const nodeIds = new Set(nodes.map(node => node.id));
  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge connects to non-existent source node: ${edge.source}`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge connects to non-existent target node: ${edge.target}`);
    }
  }

  // Check for duplicate node IDs
  const duplicateIds = nodes
    .map(node => node.id)
    .filter((id, index, arr) => arr.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    errors.push(`Duplicate node IDs: ${duplicateIds.join(', ')}`);
  }

  // Check for empty node names
  const emptyNames = nodes.filter(node => !node.data.name || node.data.name.trim() === '');
  if (emptyNames.length > 0) {
    errors.push(`Nodes with empty names: ${emptyNames.map(n => n.id).join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}; exports.validateDiagram = validateDiagram;

/**
 * Check consistency between diagram and use case descriptions
 */
 const checkConsistency = (
  diagramData,
  descriptions
) => {
  const errors = [];
  const useCaseNodes = diagramData.nodes.filter(node => node.type === 'useCase');

  // Check if all use cases in diagram have descriptions
  for (const useCase of useCaseNodes) {
    const hasDescription = descriptions.some(desc => desc.useCaseNodeId === useCase.id);
    if (!hasDescription) {
      errors.push(`Use case "${useCase.data.name}" has no description`);
    }
  }

  // Check if all descriptions correspond to existing use cases
  for (const description of descriptions) {
    const existsInDiagram = useCaseNodes.some(node => node.id === description.useCaseNodeId);
    if (!existsInDiagram) {
      errors.push(`Description for "${description.name}" has no corresponding use case in diagram`);
    }
  }

  // Check for name consistency
  for (const description of descriptions) {
    const correspondingNode = useCaseNodes.find(node => node.id === description.useCaseNodeId);
    if (correspondingNode && correspondingNode.data.name !== description.name) {
      errors.push(`Name mismatch: diagram has "${correspondingNode.data.name}" but description has "${description.name}"`);
    }
  }

  return {
    consistent: errors.length === 0,
    errors,
  };
}; exports.checkConsistency = checkConsistency;

/**
 * Validate a use case description
 */
 const validateDescription = (description) => {
  const errors = [];

  // Check if name is provided
  if (!description.name || description.name.trim() === '') {
    errors.push('Use case name is required');
  }

  // Check if main flow is provided and not empty
  if (!description.mainFlow || description.mainFlow.length === 0) {
    errors.push('Main flow cannot be empty');
  }

  // Check if main flow steps are not empty strings
  if (description.mainFlow) {
    const emptySteps = description.mainFlow.filter(step => !step || step.trim() === '');
    if (emptySteps.length > 0) {
      errors.push('Main flow contains empty steps');
    }
  }

  // Check alternative flows
  if (description.alternativeFlows) {
    for (const altFlow of description.alternativeFlows) {
      if (!altFlow.condition || altFlow.condition.trim() === '') {
        errors.push('Alternative flow must have a condition');
      }

      if (!altFlow.flow || altFlow.flow.length === 0) {
        errors.push(`Alternative flow "${altFlow.condition}" cannot be empty`);
      }

      // Check if alternative flow steps are not empty strings
      if (altFlow.flow) {
        const emptySteps = altFlow.flow.filter(step => !step || step.trim() === '');
        if (emptySteps.length > 0) {
          errors.push(`Alternative flow "${altFlow.condition}" contains empty steps`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}; exports.validateDescription = validateDescription;
