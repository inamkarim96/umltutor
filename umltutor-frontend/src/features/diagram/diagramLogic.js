import assignmentService from '../../services/assignmentService';
import { createEmptyModel } from '../../types/umlModel';

/**
 * Adapts raw model data from API to the application format
 */
export const adaptModel = (loadedModel, assignmentId) => {
    // If it's a student assignment, UML data is inside submission.umlData
    const submission = loadedModel.submission;
    const artifacts = loadedModel.artifacts || submission?.artifacts || submission?.umlData;

    const useCaseDiagramRaw = artifacts?.useCaseDiagram || loadedModel.useCaseDiagram || loadedModel.diagramData || loadedModel.diagramJson;
    const useCaseDescriptionRaw = artifacts?.useCaseDescription || artifacts?.descriptions || loadedModel.useCaseDescription || loadedModel.descriptions;
    const ssdRaw = artifacts?.systemSequenceDiagram || artifacts?.sequenceDiagram || loadedModel.systemSequenceDiagram || loadedModel.ssdData;
    const classDiagramRaw = artifacts?.classDiagram || loadedModel.classDiagram;
    const sequenceDiagramsRaw = artifacts?.sequenceDiagrams || artifacts?.sequenceDiagram || loadedModel.sequenceDiagrams;

    const safeParse = (val, defaultValue) => {
        if (!val) return defaultValue;
        if (typeof val === 'object') return val;
        try { return JSON.parse(val); } catch { return defaultValue; }
    };

    return {
        id: (loadedModel.id || assignmentId).toString(),
        title: loadedModel.title || loadedModel.assignment?.title,
        description: loadedModel.description || loadedModel.assignment?.description,
        diagram: safeParse(useCaseDiagramRaw, { nodes: [], edges: [] }),
        descriptions: safeParse(useCaseDescriptionRaw, {}),
        ssds: safeParse(ssdRaw, {}),
        classDiagram: safeParse(classDiagramRaw, { nodes: [], edges: [] }),
        sequenceDiagrams: safeParse(sequenceDiagramsRaw, {}),
        updatedAt: loadedModel.updatedAt,
        version: 1,
        assignmentType: loadedModel.assignmentType || loadedModel.assignment?.type,
        textContent: loadedModel.textContent,
        assignmentFileUrl: loadedModel.assignmentFileUrl || loadedModel.assignment?.fileUrl,
        assignmentFileName: loadedModel.assignmentFileName || loadedModel.assignment?.fileName,
        
        // Metadata for professional export - Comprehensive database lookups
        studentName: loadedModel.student?.name || loadedModel.user?.name || 
                    (loadedModel.student?.firstName ? `${loadedModel.student.firstName} ${loadedModel.student.lastName || ''}` : '') ||
                    loadedModel.submission?.studentName || loadedModel.submission?.student?.name || '',
        
        teacherName: (loadedModel.class?.teacher?.firstName ? `${loadedModel.class.teacher.firstName} ${loadedModel.class.teacher.lastName || ''}` : '') ||
                    loadedModel.teacher?.name || loadedModel.assignment?.teacherName || loadedModel.assignment?.teacher?.name || 
                    loadedModel.assignment?.createdBy?.name || loadedModel.createdBy?.name || '',
        
        className: loadedModel.class?.name || loadedModel.assignment?.className || loadedModel.assignment?.class?.name || 
                   loadedModel.classroom?.name || loadedModel.assignment?.class_name || '',
        
        classCode: loadedModel.class?.code || loadedModel.assignment?.classCode || loadedModel.assignment?.class_code || '',

        rawSubmission: submission
            ? {
                  ...submission,
                  assignmentId: Number(assignmentId),
                  fullReport: submission.evaluation?.validationReport
                      ? (typeof submission.evaluation.validationReport === 'string'
                            ? (() => { try { return JSON.parse(submission.evaluation.validationReport); } catch { return null; } })()
                            : submission.evaluation.validationReport)
                      : submission.fullReport || null,
              }
            : null,
    };
};

/**
 * Fetches and adapts a model based on assignmentId (Students/Teachers work through Assignments/Submissions)
 */
export const fetchModelLogic = async ({ assignmentId }) => {
    if (!assignmentId || assignmentId === 'guest-default') {
        return adaptModel(createEmptyModel('new', 'New Project'), 'new');
    }

    try {
        const response = await assignmentService.getStudentAssignment(assignmentId);
        if (response) {
            const model = adaptModel(response, assignmentId);
            if (response.submissionLoadWarning) {
                model.loadWarning = response.submissionLoadWarning;
            }
            return model;
        }
        const empty = adaptModel(createEmptyModel(assignmentId), assignmentId);
        empty.loadWarning = 'No previous saved work found.';
        return empty;
    } catch (err) {
        const status = err.status ?? err.response?.status;
        if (status === 404) {
            const e = new Error('Assignment not found');
            e.status = 404;
            throw e;
        }
        if (status === 403) {
            const e = new Error('You do not have access to this assignment');
            e.status = 403;
            throw e;
        }
        if (status === 401) {
            const e = new Error('Unauthorized access');
            e.status = 401;
            throw e;
        }
        const empty = adaptModel(createEmptyModel(assignmentId), assignmentId);
        empty.loadWarning =
            status >= 500
                ? 'Server error while loading saved work. You can continue with a blank workspace.'
                : err.message || 'No previous saved work found.';
        return empty;
    }
};
