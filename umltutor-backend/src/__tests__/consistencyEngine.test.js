"use strict";

const { CheckingEngine } = require('../services/checkingEngine');
const { evaluateFunctionMatch, areSynonyms } = require('../nlp/similarity');

describe('UMLTutor Cross-Diagram Consistency Engine Test Suite', () => {
    const ucId = 'uc-login-123';

    const sampleUseCaseDiagram = {
        nodes: [
            { id: 'sb-1', type: 'systemBoundary', position: { x: 50, y: 50 }, data: { label: 'Online Shopping System', width: 600, height: 600 } },
            { id: ucId, type: 'usecase', parentNode: 'sb-1', position: { x: 150, y: 150 }, data: { label: 'Login User' } },
            { id: 'actor-student', type: 'actor', position: { x: 10, y: 150 }, data: { label: 'Student' } }
        ],
        edges: [
            { id: 'e1', source: 'actor-student', target: ucId }
        ]
    };

    const sampleDescription = {
        [ucId]: {
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
        [ucId]: {
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
        [ucId]: {
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

    test('TEST 1: Valid 5-artifact model produces no false errors', () => {
        const model = {
            diagram: sampleUseCaseDiagram,
            descriptions: sampleDescription,
            ssds: sampleSSD,
            classDiagram: sampleClassDiagram,
            sequenceDiagrams: sampleSequenceDiagram
        };

        const result = CheckingEngine.checkModel(model);
        const errors = result.issues.filter(i => i.severity === 'error');
        expect(errors).toHaveLength(0);
    });

    test('TEST 2: SSD message exists but Class operation missing triggers MISSING_CLASS_OPERATION', () => {
        const incompleteClassDiagram = {
            nodes: [
                { id: 'class-user', type: 'class', data: { label: 'User', methods: ['+ logout()'] } }
            ]
        };

        const model = {
            diagram: sampleUseCaseDiagram,
            descriptions: sampleDescription,
            ssds: sampleSSD,
            classDiagram: incompleteClassDiagram,
            sequenceDiagrams: sampleSequenceDiagram
        };

        const result = CheckingEngine.checkModel(model, 'class-diagram');
        const missingOpIssue = result.issues.find(i => i.code === 'MISSING_CLASS_OPERATION');
        expect(missingOpIssue).toBeDefined();
        expect(missingOpIssue.message).toContain('enterLoginCredentials');
    });

    test('TEST 3: Class operation with normalized synonym name evaluates as strong semantic match', () => {
        const matchRes = evaluateFunctionMatch('registerStudent', 'createStudent');
        expect(matchRes.score).toBeGreaterThanOrEqual(0.7);
        expect(matchRes.matchType).toBe('STRONG');
    });

    test('TEST 4: Sequence object not in Class Diagram triggers SEQUENCE_OBJECT_NOT_DEFINED', () => {
        const badSeqDiagram = {
            [ucId]: {
                lifelines: [
                    { id: 'seq-actor', label: 'Student', type: 'actor' },
                    { id: 'seq-unknown', label: 'UnknownPaymentController', type: 'object' }
                ],
                messages: [
                    { id: 'sm1', order: 1, fromLifelineId: 'seq-actor', toLifelineId: 'seq-unknown', name: 'enterLoginCredentials()', type: 'synchronous' }
                ]
            }
        };

        const model = {
            diagram: sampleUseCaseDiagram,
            descriptions: sampleDescription,
            ssds: sampleSSD,
            classDiagram: sampleClassDiagram,
            sequenceDiagrams: badSeqDiagram
        };

        const result = CheckingEngine.checkModel(model, 'sequence-diagram');
        const issue = result.issues.find(i => i.code === 'SEQUENCE_OBJECT_NOT_DEFINED');
        expect(issue).toBeDefined();
        expect(issue.message).toContain('UnknownPaymentController');
    });

    test('TEST 5: Sequence message not in Class Diagram triggers SEQUENCE_OPERATION_NOT_DEFINED', () => {
        const badSeqMessages = {
            [ucId]: {
                lifelines: [
                    { id: 'seq-actor', label: 'Student', type: 'actor' },
                    { id: 'seq-user', label: 'User', type: 'object' }
                ],
                messages: [
                    { id: 'sm1', order: 1, fromLifelineId: 'seq-actor', toLifelineId: 'seq-user', name: 'nonExistentMethod()', type: 'synchronous' }
                ]
            }
        };

        const model = {
            diagram: sampleUseCaseDiagram,
            descriptions: sampleDescription,
            ssds: sampleSSD,
            classDiagram: sampleClassDiagram,
            sequenceDiagrams: badSeqMessages
        };

        const result = CheckingEngine.checkModel(model, 'sequence-diagram');
        const issue = result.issues.find(i => i.code === 'SEQUENCE_OPERATION_NOT_DEFINED');
        expect(issue).toBeDefined();
        expect(issue.message).toContain('nonExistentMethod');
    });

    test('TEST 6: Sequence internal implementation messages between objects do not trigger extra error', () => {
        const detailedSeqDiagram = {
            [ucId]: {
                lifelines: [
                    { id: 'seq-actor', label: 'Student', type: 'actor' },
                    { id: 'seq-ctrl', label: 'User', type: 'object' },
                    { id: 'seq-svc', label: 'User', type: 'object' }
                ],
                messages: [
                    { id: 'sm1', order: 1, fromLifelineId: 'seq-actor', toLifelineId: 'seq-ctrl', name: 'enterLoginCredentials()', type: 'synchronous' },
                    { id: 'sm2', order: 2, fromLifelineId: 'seq-ctrl', toLifelineId: 'seq-svc', name: 'internalQueryDb()', type: 'synchronous' },
                    { id: 'sm3', order: 3, fromLifelineId: 'seq-ctrl', toLifelineId: 'seq-actor', name: 'displayConfirmation()', type: 'return', isReturn: true }
                ]
            }
        };

        const model = {
            diagram: sampleUseCaseDiagram,
            descriptions: sampleDescription,
            ssds: sampleSSD,
            classDiagram: sampleClassDiagram,
            sequenceDiagrams: detailedSeqDiagram
        };

        const result = CheckingEngine.checkModel(model, 'sequence-diagram');
        const extraErr = result.issues.find(i => i.code === 'SEQ_CONSISTENCY_EXTRA_MESSAGE');
        expect(extraErr).toBeUndefined();
    });

    test('TEST 7: Sequence diagram genuinely with no messages triggers SEQUENCE_NO_MESSAGES', () => {
        const emptySeq = {
            [ucId]: {
                lifelines: [
                    { id: 'seq-actor', label: 'Student', type: 'actor' },
                    { id: 'seq-user', label: 'User', type: 'object' }
                ],
                messages: []
            }
        };

        const model = {
            diagram: sampleUseCaseDiagram,
            descriptions: sampleDescription,
            ssds: sampleSSD,
            classDiagram: sampleClassDiagram,
            sequenceDiagrams: emptySeq
        };

        const result = CheckingEngine.checkModel(model, 'sequence-diagram');
        const noMsgIssue = result.issues.find(i => i.code === 'SEQUENCE_NO_MESSAGES');
        expect(noMsgIssue).toBeDefined();
    });

    test('TEST 8: Sequence diagram with messages in alternate JSON shape is correctly parsed', () => {
        const alternateSeqData = {
            [ucId]: {
                nodes: [
                    { id: 'n1', type: 'actor', data: { label: 'Student', isActor: true } },
                    { id: 'n2', type: 'lifeline', data: { label: 'User' } }
                ],
                edges: [
                    { id: 'e1', source: 'n1', target: 'n2', data: { label: 'enterLoginCredentials()', type: 'sync' } },
                    { id: 'e2', source: 'n2', target: 'n1', data: { label: 'displayConfirmation()', type: 'reply', isReturn: true } }
                ]
            }
        };

        const model = {
            diagram: sampleUseCaseDiagram,
            descriptions: sampleDescription,
            ssds: sampleSSD,
            classDiagram: sampleClassDiagram,
            sequenceDiagrams: alternateSeqData
        };

        const result = CheckingEngine.checkModel(model, 'sequence-diagram');
        const noMsgIssue = result.issues.find(i => i.code === 'SEQUENCE_NO_MESSAGES');
        expect(noMsgIssue).toBeUndefined();
    });

    test('TEST 9: Missing useCaseId fallback uses friendly label instead of raw UUID', () => {
        const model = {
            diagram: { nodes: [], edges: [] },
            descriptions: { 'random-uuid-999': { useCaseName: 'Checkout' } },
            ssds: { 'random-uuid-999': { lifelines: [], messages: [] } }
        };

        const result = CheckingEngine.checkModel(model, 'ssd');
        const issue = result.issues.find(i => i.code === 'SSD_NOT_FOUND' || i.code === 'INCOMPLETE_SSD');
        expect(issue).toBeDefined();
        expect(issue.message).not.toContain('random-uuid-999');
        expect(issue.message).toContain('Checkout');
    });

    test('TEST 10: Multiple use cases with multiple SSDs are isolated without cross-contamination', () => {
        const multiUCDiagram = {
            nodes: [
                { id: 'uc1', type: 'usecase', data: { label: 'Login' } },
                { id: 'uc2', type: 'usecase', data: { label: 'Pay' } }
            ]
        };

        const multiSSDs = {
            'uc1': {
                lifelines: [
                    { id: 'l1', label: 'Student', type: 'actor' },
                    { id: 'l2', label: 'System', type: 'system' }
                ],
                messages: [{ id: 'm1', fromLifelineId: 'l1', toLifelineId: 'l2', name: 'login()', type: 'synchronous' }]
            },
            'uc2': {
                lifelines: [
                    { id: 'l3', label: 'Student', type: 'actor' },
                    { id: 'l4', label: 'System', type: 'system' }
                ],
                messages: [{ id: 'm2', fromLifelineId: 'l3', toLifelineId: 'l4', name: 'pay()', type: 'synchronous' }]
            }
        };

        const model = {
            diagram: multiUCDiagram,
            descriptions: {},
            ssds: multiSSDs
        };

        const result = CheckingEngine.checkModel(model, 'ssd', 'uc1');
        const uc2Issues = result.issues.filter(i => i.relatedId === 'uc2');
        expect(uc2Issues).toHaveLength(0);
    });
});
