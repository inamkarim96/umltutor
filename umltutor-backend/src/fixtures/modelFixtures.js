"use strict";

// Shared test fixtures for the UML Tutor cross-diagram consistency engine.
// These represent the 5 artifacts (UCD, description, SSD, class, sequence)
// consistently for one login use case, plus variants used by later phases.

const UC_ID = 'uc-login-123';

const sampleUseCaseDiagram = {
    nodes: [
        { id: 'sb-1', type: 'systemBoundary', position: { x: 50, y: 50 }, data: { label: 'Online Shopping System', width: 600, height: 600 } },
        { id: UC_ID, type: 'usecase', parentNode: 'sb-1', position: { x: 150, y: 150 }, data: { label: 'Login User' } },
        { id: 'actor-student', type: 'actor', position: { x: 10, y: 150 }, data: { label: 'Student' } }
    ],
    edges: [
        { id: 'e1', source: 'actor-student', target: UC_ID }
    ]
};

const sampleDescription = {
    [UC_ID]: {
        useCaseName: 'Login',
        primaryActor: 'Student',
        preconditions: 'Student is on the login page.',
        postconditions: 'Student is logged in successfully.',
        mainFlow: [
            { step: 1, action: 'Student enters login credentials' },
            { step: 2, action: 'System validates credentials' },
            { step: 3, action: 'System displays confirmation' }
        ]
    }
};

const sampleSSD = {
    [UC_ID]: {
        lifelines: [
            { id: 'lifeline-student', label: 'Student', type: 'actor' },
            { id: 'lifeline-system', label: 'System', type: 'system' }
        ],
        messages: [
            { id: 'm1', order: 1, fromLifelineId: 'lifeline-student', toLifelineId: 'lifeline-system', name: 'enterLoginCredentials()', type: 'synchronous' },
            { id: 'm2', order: 2, fromLifelineId: 'lifeline-student', toLifelineId: 'lifeline-system', name: 'validateCredentials()', type: 'synchronous' },
            { id: 'm3', order: 3, fromLifelineId: 'lifeline-system', toLifelineId: 'lifeline-student', name: 'displayConfirmation()', type: 'return', isReturn: true }
        ]
    }
};

const sampleClassDiagram = {
    nodes: [
        {
            id: 'class-user',
            type: 'class',
            data: {
                label: 'User',
                methods: ['+ enterLoginCredentials()', '+ validateCredentials()', '+ displayConfirmation()']
            }
        }
    ],
    edges: []
};

const sampleSequenceDiagram = {
    [UC_ID]: {
        lifelines: [
            { id: 'seq-actor', label: 'Student', type: 'actor' },
            { id: 'seq-user', label: 'User', type: 'object' }
        ],
        messages: [
            { id: 'sm1', order: 1, fromLifelineId: 'seq-actor', toLifelineId: 'seq-user', name: 'enterLoginCredentials()', type: 'synchronous' },
            { id: 'sm2', order: 2, fromLifelineId: 'seq-user', toLifelineId: 'seq-user', name: 'validateCredentials()', type: 'synchronous' },
            { id: 'sm3', order: 3, fromLifelineId: 'seq-user', toLifelineId: 'seq-actor', name: 'displayConfirmation()', type: 'return', isReturn: true }
        ]
    }
};

const buildValidModel = () => JSON.parse(JSON.stringify({
    diagram: sampleUseCaseDiagram,
    descriptions: sampleDescription,
    ssds: sampleSSD,
    classDiagram: sampleClassDiagram,
    sequenceDiagrams: sampleSequenceDiagram
}));

module.exports = {
    UC_ID,
    sampleUseCaseDiagram,
    sampleDescription,
    sampleSSD,
    sampleClassDiagram,
    sampleSequenceDiagram,
    buildValidModel
};
