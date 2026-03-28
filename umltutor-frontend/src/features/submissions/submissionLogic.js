import submissionService from '../../services/submissionService';

/**
 * Loads submission details and initial remarks.
 */
export const loadSubmissionLogic = async (submissionId) => {
    try {
        const data = await submissionService.getSubmissionDetail(submissionId);
        return {
            submission: data,
            remarks: data?.evaluation?.remarks || data?.teacherFeedback || '',
            validationReport: data?.validationReport || data?.evaluation?.validationReport || null
        };
    } catch (error) {
        console.error('Error in loadSubmissionLogic:', error);
        throw error;
    }
};

/**
 * Runs the consistency check on a submission.
 */
export const runSubmissionCheckLogic = async (submissionId, { section, targetId } = {}) => {
    try {
        const report = await submissionService.runSubmissionCheck(submissionId, { section, targetId });
        return report;
    } catch (error) {
        console.error('Error in runSubmissionCheckLogic:', error);
        throw error;
    }
};

/**
 * Saves teacher feedback/remarks for a submission.
 */
export const saveSubmissionFeedbackLogic = async (submissionId, { checkReport, remarks, marks, currentSubmission, isDraft }) => {
    try {
        const saved = await submissionService.saveSubmissionFeedback(submissionId, {
            report: checkReport,
            remarks,
            score: marks,
            isDraft
        });

        return {
            teacherFeedback: remarks,
            score: saved?.evaluation?.totalScore ?? currentSubmission?.score,
            evaluation: saved?.evaluation,
            validationReport: saved?.evaluation?.validationReport ? JSON.parse(saved.evaluation.validationReport) : checkReport
        };
    } catch (error) {
        console.error('Error in saveSubmissionFeedbackLogic:', error);
        throw error;
    }
};
