import { checkConsistency } from '../checking/ConsistencyChecker';

/**
 * Validator for SSD in Tutorial Mode.
 */
export const validateSSDTutorial = (model, useCaseId) => {
    const ssd = model.ssds ? model.ssds[useCaseId] : null;
    const description = model.descriptions ? model.descriptions[useCaseId] : null;

    if (!ssd || !ssd.lifelines || ssd.lifelines.length < 2) {
        return {
            isValid: false,
            message: 'SSD must have at least two lifelines (Actor and System).'
        };
    }

    if (!ssd.messages || ssd.messages.length === 0) {
        return {
            isValid: false,
            message: 'SSD must contain messages representing the scenario.'
        };
    }

    if (!description || !description.mainFlow || description.mainFlow.length === 0) {
        return {
            isValid: false,
            message: 'Main Success Scenario is missing in Use Case Description.'
        };
    }

    // Perform Consistency Checking
    const diagramActors = model.diagram?.nodes
        ?.filter(n => n.type === 'actor')
        ?.map(n => n.data?.label)
        .filter(Boolean) || [];

    const ssdMessagesWithLabels = ssd.messages.map(msg => {
        const senderNode = ssd.lifelines?.find(l => l.id === msg.fromLifelineId);
        return {
            ...msg,
            text: msg.name || msg.text || msg.label || '',
            senderLabel: senderNode ? (senderNode.label || senderNode.name) : ''
        };
    });

    const consistencyIssues = checkConsistency(
        description.mainFlow,
        ssdMessagesWithLabels,
        diagramActors
    );

    const errors = consistencyIssues.filter(i => i.type === 'error');
    if (errors.length > 0) {
        return {
            isValid: false,
            message: `Consistency Error: ${errors[0].message}`
        };
    }

    return { isValid: true, message: 'SSD is consistent!' };
};

/**
 * Validates all SSDs (for all use cases).
 */
export const validateAllSSDsTutorial = (model) => {
    const useCaseNodes = model.diagram?.nodes?.filter(n => n.type === 'usecase') || [];

    for (const node of useCaseNodes) {
        const validation = validateSSDTutorial(model, node.id);
        if (!validation.isValid) {
            return {
                isValid: false,
                message: `[${node.data?.label || 'Unnamed'}] ${validation.message}`
            };
        }
    }

    return { isValid: true, message: 'All SSDs are consistent!' };
};
