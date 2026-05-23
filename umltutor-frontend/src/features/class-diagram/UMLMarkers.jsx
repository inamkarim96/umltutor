import React from 'react';

const UMLMarkers = () => {
    return (
        <svg style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0 }}>
            <defs>
                {/* Inheritance/Realization hollow triangle */}
                <marker
                    id="inheritance-arrow"
                    viewBox="0 0 10 10"
                    refX="10"
                    refY="5"
                    markerWidth="8"
                    markerHeight="8"
                    orient="auto-start-reverse"
                >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="white" stroke="#374151" strokeWidth="1" />
                </marker>

                {/* Composition filled diamond */}
                <marker
                    id="composition-diamond"
                    viewBox="0 0 12 12"
                    refX="12"
                    refY="6"
                    markerWidth="10"
                    markerHeight="10"
                    orient="auto-start-reverse"
                >
                    <path d="M 0 6 L 6 0 L 12 6 L 6 12 z" fill="#374151" />
                </marker>

                {/* Aggregation hollow diamond */}
                <marker
                    id="aggregation-diamond"
                    viewBox="0 0 12 12"
                    refX="12"
                    refY="6"
                    markerWidth="10"
                    markerHeight="10"
                    orient="auto-start-reverse"
                >
                    <path d="M 0 6 L 6 0 L 12 6 L 6 12 z" fill="white" stroke="#374151" strokeWidth="1" />
                </marker>

                {/* Dependency/Directed Association open arrowhead */}
                <marker
                    id="dependency-arrow"
                    viewBox="0 0 10 10"
                    refX="10"
                    refY="5"
                    markerWidth="8"
                    markerHeight="8"
                    orient="auto-start-reverse"
                >
                    <path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </marker>
            </defs>
        </svg>
    );
};

export default UMLMarkers;
