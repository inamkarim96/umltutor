// UML System Sequence Diagram Semantic Model
// This defines the MEANING, not the visual representation

// Conversion functions between semantic and visualization models
export const semanticToVisualization = (ssd) => {
    const nodes = [];
    const edges = [];

    // Create lifeline nodes (position calculated)
    ssd.lifelines.forEach((lifeline, index) => {
        nodes.push({
            id: `lifeline-${lifeline.id}`,
            type: 'lifeline',
            position: {
                x: 100 + (index * 200), // Horizontal spacing
                y: 50
            },
            data: {
                participantId: lifeline.id,
                label: lifeline.label,
                lifelineType: lifeline.type
            }
        });
    });

    // Create message edges (position calculated from order)
    const sortedMessages = [...ssd.messages].sort((a, b) => (a.order || 0) - (b.order || 0));
    sortedMessages.forEach((message, messageIndex) => {
        const fromLifelineId = `lifeline-${message.fromLifelineId}`;
        const toLifelineId = `lifeline-${message.toLifelineId}`;

        edges.push({
            id: message.id,
            source: fromLifelineId,
            target: toLifelineId,
            type: message.type === 'return' ? 'smoothstep' : 'straight',
            label: message.guard ? `${message.name} [${message.guard}]` : message.name,
            data: {
                messageId: message.id,
                messageType: message.type,
                guard: message.guard,
                yPosition: message.positionY, // Restore yPosition to edge data
                order: message.order
            },
            style: getMessageStyle(message.type)
        });
    });

    return { nodes, edges, fragments: ssd.fragments };
};

export const visualizationToSemantic = (
    nodes,
    edges,
    fragments
) => {
    const lifelines = nodes.map(node => ({
        id: node.data.participantId,
        label: node.data.label,
        type: node.data.lifelineType
    }));

    const messages = edges
        .filter(edge => edge && edge.data) // Protect against malformed edges
        .map(edge => ({
            id: edge.data?.messageId || edge.id,
            order: edge.data?.order ?? 0,
            fromLifelineId: lifelines.find(l => `lifeline-${l.id}` === edge.source)?.id || '',
            toLifelineId: lifelines.find(l => `lifeline-${l.id}` === edge.target)?.id || '',
            name: (typeof edge.label === 'string' ? edge.label : '').replace(/\s*\[.*?\]\s*$/, '') || 'message()',
            type: edge.data?.messageType || 'synchronous',
            guard: edge.data?.guard,
            isReturn: edge.data?.messageType === 'return',
            returnToMessageId: edge.data?.returnToMessageId,
            positionY: edge.data?.yPosition || edge.data?.timestamp // capture yPosition from edge data
        }))
        .filter(msg => msg.fromLifelineId && msg.toLifelineId)
        .sort((a, b) => a.order - b.order);

    return {
        lifelines,
        messages,
        fragments
    };
};
