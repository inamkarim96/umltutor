import React from 'react';

const SequenceMarkers = () => {
    return (
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
            <defs>
                {/* Synchronous Message: Solid Arrowhead */}
                <marker
                    id="sequence-sync-arrow"
                    viewBox="0 0 10 10"
                    refX="10"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#1f2937" />
                </marker>

                {/* Asynchronous Message / Reply: Open Arrowhead */}
                <marker
                    id="sequence-open-arrow"
                    viewBox="0 0 10 10"
                    refX="10"
                    refY="5"
                    markerWidth="8"
                    markerHeight="8"
                    orient="auto-start-reverse"
                >
                    <path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="#1f2937" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </marker>

                {/* Delete Message: X Termination */}
                <marker
                    id="sequence-delete-x"
                    viewBox="0 0 10 10"
                    refX="5"
                    refY="5"
                    markerWidth="8"
                    markerHeight="8"
                    orient="auto"
                >
                    <path d="M 0 0 L 10 10 M 10 0 L 0 10" stroke="#ef4444" strokeWidth="2" />
                </marker>
            </defs>
        </svg>
    );
};

export default SequenceMarkers;
