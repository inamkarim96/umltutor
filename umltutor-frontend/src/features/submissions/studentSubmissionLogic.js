import assignmentService from '../../services/assignmentService';
import submissionService from '../../services/submissionService';

/**
 * Fetches the current workflow progress for an assignment, including prefilling from existing submissions.
 */
export const fetchWorkflowProgressLogic = async (assignmentId) => {
    try {
        const progress = await assignmentService.getAssignmentProgress(assignmentId);
        
        try {
            const submission = await submissionService.getMySubmission(assignmentId);
            
            if (submission) {
                const safeParse = (val) => {
                    if (!val) return null;
                    if (typeof val === 'object') return val;
                    try { return JSON.parse(val); } catch { return val; }
                };
                
                return {
                    ...progress,
                    useCaseDiagramData: progress?.useCaseDiagramData ?? safeParse(submission.useCaseDiagram),
                    descriptions: progress?.descriptions ?? safeParse(submission.useCaseDescription),
                    sequenceDiagramData: progress?.sequenceDiagramData ?? safeParse(submission.systemSequenceDiagram),
                    classDiagramData: progress?.classDiagramData ?? safeParse(submission.classDiagram),
                    sequenceData: progress?.sequenceData ?? safeParse(submission.sequenceDiagram),
                };
            }
        } catch (e) {
            console.warn('No submission found for prefilling workflow');
        }
        
        return progress;
    } catch (error) {
        console.error('Error in fetchWorkflowProgressLogic:', error);
        throw error;
    }
};

/**
 * Saves progress for a specific section of the workflow.
 */
export const saveSectionProgressLogic = async (assignmentId, activeTab, data) => {
    try {
        const updatedProgress = await assignmentService.saveAssignmentSection(assignmentId, activeTab, data);
        return updatedProgress;
    } catch (error) {
        console.error('Error in saveSectionProgressLogic:', error);
        throw error;
    }
};

/**
 * Submits the assignment.
 */
export const submitAssignmentLogic = async (assignmentId, workflowProgress) => {
    try {
        if (!workflowProgress) throw new Error('No progress to submit');
        
        const response = await submissionService.submitAssignment(assignmentId, {
            type: 'UML_WORKFLOW',
            content: JSON.stringify({
                diagramData: workflowProgress.useCaseDiagramData,
                descriptions: workflowProgress.descriptions,
                ssdData: workflowProgress.sequenceDiagramData,
                classDiagramData: workflowProgress.classDiagramData,
                sequenceData: workflowProgress.sequenceData,
            }),
        });
        return response;
    } catch (error) {
        console.error('Error in submitAssignmentLogic:', error);
        throw error;
    }
};
