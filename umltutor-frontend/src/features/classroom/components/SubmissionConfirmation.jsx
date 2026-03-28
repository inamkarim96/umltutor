import React, { useState } from 'react';

const SubmissionConfirmation = ({
  assignment,
  progressData,
  onConfirm,
  onCancel,
  isOpen,
}) => {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);

  if (!isOpen) return null;

  const calculateSummary = () => {
    const diagramUseCases = progressData?.diagramData?.useCases || [];
    const descriptions = progressData.descriptions || [];
    const completedDescriptions = descriptions.filter(desc => 
      diagramUseCases.some((uc) => uc.id === desc.useCaseId)
    ).length;
    
    const diagramsCreated = progressData.diagramData ? 1 : 0;
    const ssdsCreated = progressData?.ssdData?.length || 0;
    const requirementsCompleted = progressData?.completedRequirements?.length || 0;

    return {
      totalUseCases: diagramUseCases.length,
      completedDescriptions,
      diagramsCreated,
      ssdsCreated,
      timeSpent: progressData.timeSpent || 0,
      progressPercentage: assignment.progress || 0,
      requirementsCompleted,
      totalRequirements: assignment.requirements.length,
    };
  };

  const handleConfirm = async () => {
    if (!isConfirmed) {
      setIsConfirmed(true);
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmissionError(null);
      await onConfirm();
    } catch (error) {
      setSubmissionError('Failed to submit assignment. Please try again.');
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isSubmitting) return;
    setIsConfirmed(false);
    setSubmissionError(null);
    onCancel();
  };

  const summary = calculateSummary();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900">Submit Assignment</h2>
          <p className="text-gray-600 mt-1">
            {isConfirmed ? 'Final confirmation' : 'Review your submission'}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {!isConfirmed ? (
            // First step: Review submission
            <div className="space-y-6">
              {/* Assignment Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">{assignment.title}</h3>
                <p className="text-sm text-gray-600">{assignment.description}</p>
                <div className="mt-3 text-sm text-gray-500">
                  Due: {new Date(assignment.dueDate).toLocaleDateString()}
                </div>
              </div>

              {/* Submission Summary */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Submission Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-blue-600">{summary.progressPercentage}%</div>
                    <div className="text-sm text-blue-800">Progress</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-green-600">
                      {summary.requirementsCompleted}/{summary.totalRequirements}
                    </div>
                    <div className="text-sm text-green-800">Requirements</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-purple-600">{summary.totalUseCases}</div>
                    <div className="text-sm text-purple-800">Use Cases</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-orange-600">{summary.timeSpent}m</div>
                    <div className="text-sm text-orange-800">Time Spent</div>
                  </div>
                </div>
              </div>

              {/* Detailed Checklist */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">What's Being Submitted</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      summary.diagramsCreated > 0 ? 'bg-green-500 border-green-500' : 'border-gray-300'
                    }`}>
                      {summary.diagramsCreated > 0 && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Use Case Diagram</div>
                      <div className="text-sm text-gray-600">
                        {summary.diagramsCreated > 0 
                          ? `${summary.totalUseCases} use cases included`
                          : 'No diagram created'
                        }
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      summary.completedDescriptions > 0 ? 'bg-green-500 border-green-500' : 'border-gray-300'
                    }`}>
                      {summary.completedDescriptions > 0 && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Use Case Descriptions</div>
                      <div className="text-sm text-gray-600">
                        {summary.completedDescriptions} of {summary.totalUseCases} descriptions completed
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      summary.ssdsCreated > 0 ? 'bg-green-500 border-green-500' : 'border-gray-300'
                    }`}>
                      {summary.ssdsCreated > 0 && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">System Sequence Diagrams</div>
                      <div className="text-sm text-gray-600">
                        {summary.ssdsCreated} SSD{summary.ssdsCreated !== 1 ? 's' : ''} created
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Important Notice */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <div className="font-medium text-yellow-800">Important Notice</div>
                    <div className="text-sm text-yellow-700 mt-1">
                      Once submitted, you will not be able to make any changes to your assignment. Please review everything carefully before confirming.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Second step: Final confirmation
            <div className="space-y-6">
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Are You Sure?</h3>
                <p className="text-gray-600 mt-2">
                  This is your final chance to review before submitting.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">You're about to submit:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Assignment: {assignment.title}</li>
                  <li>• Progress: {summary.progressPercentage}% complete</li>
                  <li>• Requirements: {summary.requirementsCompleted}/{summary.totalRequirements} completed</li>
                  <li>• Time spent: {summary.timeSpent} minutes</li>
                </ul>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="font-medium text-red-800">This action cannot be undone!</div>
                <div className="text-sm text-red-700 mt-1">
                  After submission, your assignment will be locked for grading.
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {submissionError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
              <div className="text-red-800">{submissionError}</div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex justify-between">
            <button
              onClick={handleCancel}
              disabled={isSubmitting}
              className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {isConfirmed ? 'Go Back' : 'Cancel'}
            </button>

            <div className="flex gap-2">
              {!isConfirmed && (
                <button
                  onClick={() => window.open(`/student/assignments/${assignment.id}`, '_blank')}
                  className="px-6 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
                >
                  Final Review
                </button>
              )}

              <button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className={`px-6 py-2 rounded-lg font-medium disabled:opacity-50 ${
                  isConfirmed
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isSubmitting 
                  ? 'Submitting...' 
                  : isConfirmed 
                    ? 'Yes, Submit Assignment' 
                    : 'Confirm Submission'
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmissionConfirmation;
