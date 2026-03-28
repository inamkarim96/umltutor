/**
 * Validator for Tutorial Mode Use Case Diagram
 * Strictly enforces naming and connectivity rules for guided learning.
 */
export const validateUseCaseDiagramTutorial = (nodes, edges, systemName) => {
    // 1. System Name Validation
    const trimmedSystemName = systemName?.trim();
    const systemPlaceholders = ['system', 'system name', 'unnamed system', 'new system', 'boundary'];

    // If systemName from registry is missing, check if there's a systemBoundary node with a label
    let finalSystemName = trimmedSystemName;
    if (!finalSystemName) {
        const systemNode = nodes.find(n => n.type === 'systemBoundary');
        finalSystemName = systemNode?.data?.label?.trim();
    }

    if (!finalSystemName || finalSystemName === '' || systemPlaceholders.includes(finalSystemName.toLowerCase())) {
        return {
            isValid: false,
            message: 'System name is required before proceeding. Please provide a descriptive name for your system.'
        };
    }

    const actors = nodes.filter(n => n.type === 'actor');
    const useCases = nodes.filter(n => n.type === 'usecase' || n.type === 'useCase');

    // 2. Minimum Elements Check
    if (actors.length === 0) {
        return {
            isValid: false,
            message: 'Please add at least one actor to the diagram.'
        };
    }

    if (useCases.length === 0) {
        return {
            isValid: false,
            message: 'Please add at least one use case to the diagram.'
        };
    }

    // 3. Actor Name Validation
    const actorPlaceholders = ['actor', 'unnamed', 'unnamed actor', 'new actor', 'actor name', 'user'];
    for (const actor of actors) {
        const label = actor.data?.label?.trim() || '';
        if (!label || actorPlaceholders.includes(label.toLowerCase())) {
            return {
                isValid: false,
                message: 'One or more actors are unnamed. Please provide proper names for all actors.'
            };
        }
    }

    // 4. Use Case Name Validation
    const useCasePlaceholders = ['use case', 'unnamed', 'unnamed use case', 'new use case', 'use case name', 'action'];
    for (const uc of useCases) {
        const label = uc.data?.label?.trim() || '';
        if (!label || useCasePlaceholders.includes(label.toLowerCase())) {
            return {
                isValid: false,
                message: 'One or more use cases are unnamed. Please provide proper names for all use cases.'
            };
        }
    }

    // 5. Connection Validation (Each actor must have at least one connection)
    for (const actor of actors) {
        const isConnected = edges.some(edge =>
            edge.source === actor.id || edge.target === actor.id
        );
        if (!isConnected) {
            return {
                isValid: false,
                message: `Each actor must be connected to at least one use case. Please connect "${actor.data.label || 'the actor'}".`
            };
        }
    }

    return { isValid: true, message: 'Step Validated Successfully!' };
};
