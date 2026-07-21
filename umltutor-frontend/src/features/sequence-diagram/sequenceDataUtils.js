const mapLegacyMessageType = (type) => {
    if (type === 'reply') return 'return';
    if (type === 'async') return 'asynchronous';
    if (type === 'self') return 'self';
    if (type === 'create') return 'create';
    if (type === 'delete') return 'delete';
    return 'synchronous';
};

export const normalizeSequenceData = (raw) => {
    if (!raw) return { lifelines: [], messages: [], activations: [] };

    if (raw.lifelines) {
        return {
            lifelines: raw.lifelines || [],
            messages: raw.messages || [],
            activations: raw.activations || [],
            useCaseId: raw.useCaseId,
        };
    }

    if (raw.nodes || raw.edges) {
        const lifelines = (raw.nodes || []).map((node, index) => ({
            id: node.id,
            label: node.data?.label || `Lifeline ${index + 1}`,
            type: node.data?.lifelineType
                || (node.data?.isActor || node.type === 'actor' ? 'actor' : 'object'),
            x: node.position?.x,
            y: node.position?.y,
            height: node.data?.height || 150,
            iconSize: node.data?.iconSize || 24,
        }));

        const messages = (raw.edges || []).map((edge, index) => {
            const legacyType = edge.data?.messageType || edge.data?.type || 'sync';
            const mappedType = mapLegacyMessageType(legacyType);
            const labelValue = edge.data?.text || edge.data?.label || edge.label || '';
            return {
                id: edge.id,
                type: mappedType,
                fromLifelineId: edge.data?.fromLifelineId || edge.source,
                toLifelineId: edge.data?.toLifelineId || edge.target,
                name: labelValue,
                text: labelValue,
                label: labelValue,
                order: edge.data?.order ?? index,
                positionY: edge.data?.y,
                isReturn: mappedType === 'return' || !!edge.data?.isReturn,
                attachedActivationId: edge.data?.attachedActivationId,
            };
        });

        return { lifelines, messages, activations: raw.activations || [], useCaseId: raw.useCaseId };
    }

    return { lifelines: [], messages: [], activations: [], useCaseId: raw.useCaseId };
};

export const getSequenceLifelineCount = (raw) => normalizeSequenceData(raw).lifelines.length;

export const getSequenceMessageCount = (raw) => normalizeSequenceData(raw).messages.length;

export const getSequenceMessagesForValidation = (raw, lifelines) => {
    const data = normalizeSequenceData(raw);
    const ll = lifelines || data.lifelines;
    return data.messages.map((msg, idx) => {
        const from = ll.find((l) => l.id === msg.fromLifelineId);
        return {
            text: msg.text || msg.name || msg.label || '',
            order: msg.order ?? idx + 1,
            senderLabel: from?.label || '',
            senderType: from?.type === 'actor' ? 'actor' : 'object',
        };
    });
};
