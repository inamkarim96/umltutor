/**
 * Validator for Use Case Descriptions in Tutorial Mode.
 * Aligned with the simplified UML structure.
 */
export const validateUseCaseDescriptionTutorial = (description) => {
    // 1. Use Case Name Validation
    if (!description?.useCaseName || description.useCaseName.trim() === '') {
        return {
            isValid: false,
            message: 'Use case must be selected.'
        };
    }

    // 2. Primary Actor Validation
    if (!description?.primaryActor || description.primaryActor.trim() === '') {
        return {
            isValid: false,
            message: `Primary Actor must be selected for "${description.useCaseName}".`
        };
    }

    // 3. Preconditions / Postconditions (Basic presence checks)
    if (!description?.preconditions || description.preconditions.trim().length === 0) {
        return {
            isValid: false,
            message: `Preconditions are required for "${description.useCaseName}".`
        };
    }

    if (!description?.postconditions || description.postconditions.trim().length === 0) {
        return {
            isValid: false,
            message: `Postconditions are required for "${description.useCaseName}".`
        };
    }

    // 3. Main Success Scenario Validation
    const steps = description?.mainFlow || [];
    if (steps.length === 0) {
        return {
            isValid: false,
            message: `Main Success Scenario for "${description.useCaseName}" must contain at least one step.`
        };
    }

    const hasValidStep = steps.some(step => step.action && step.action.trim().length > 0);
    if (!hasValidStep) {
        return {
            isValid: false,
            message: `The Main Success Scenario for "${description.useCaseName}" cannot be empty.`
        };
    }

    return { isValid: true, message: 'Description Validated!' };
};

/**
 * Validates that ALL use cases from the diagram have descriptions.
 */
export const validateAllDescriptionsTutorial = (useCaseNodes, descriptions) => {
    if (!useCaseNodes || useCaseNodes.length === 0) return { isValid: true };

    for (const node of useCaseNodes) {
        const desc = descriptions[node.id];
        if (!desc) {
            return {
                isValid: false,
                message: `The Use Case "${node.data?.label || 'Unnamed'}" is missing its description.`
            };
        }

        const validation = validateUseCaseDescriptionTutorial(desc);
        if (!validation.isValid) {
            return {
                isValid: false,
                message: `[${node.data?.label || 'Unnamed'}] ${validation.message}`
            };
        }
    }

    return { isValid: true, message: 'All descriptions are complete!' };
};
