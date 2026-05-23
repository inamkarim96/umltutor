import React, { useState, useEffect } from 'react';

const SubmissionChecker = ({
  assignment,
  progressData,
  onCheckComplete,
  onProceedAnyway,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [showProceedAnyway, setShowProceedAnyway] = useState(false);

  useEffect(() => {
    runSubmissionCheck();
  }, [assignment, progressData]);

  const runSubmissionCheck = async () => {
    setIsChecking(true);
    try {
      const result = await performSubmissionCheck();
      setCheckResult(result);
      onCheckComplete(result);
    } catch (error) {
      console.error('Submission check failed:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const performSubmissionCheck = async () => {
    const warnings = [];
    const errors = [];
    const checklist = [];

    // Check 1: Use Case Diagram created
    const diagramData = progressData.useCaseDiagram || progressData.diagramData || progressData.useCaseDiagramData;
    const hasDiagram = diagramData && (diagramData.nodes?.length > 0 || diagramData.useCases?.length > 0);
    checklist.push({
      id: 'diagram-created',
      title: 'Use Case Diagram Created',
      description: 'A use case diagram must be created',
      completed: !!hasDiagram,
      required: true,
      category: 'diagram',
      details: hasDiagram ? 'Diagram contains elements' : 'No diagram data found',
    });

    if (!hasDiagram) {
      errors.push({
        id: 'missing-diagram',
        type: 'error',
        message: 'Use case diagram is required but not found',
        category: 'diagram',
        severity: 'critical',
        blocking: true,
      });
    }

    // Check 2: All use cases have descriptions
    const diagramUseCases = diagramData?.useCases || [];
    const descriptions = progressData.useCaseDescription || progressData.descriptions || [];
    const useCasesWithDescriptions = Array.isArray(descriptions) ? descriptions.filter((desc) =>
      diagramUseCases.some((uc) => uc.id === desc.useCaseId)
    ).length : Object.keys(descriptions).length; // Handle object format if needed

    const allUseCasesHaveDescriptions = diagramUseCases.length === 0 || useCasesWithDescriptions >= diagramUseCases.length;
    checklist.push({
      id: 'descriptions-complete',
      title: 'All Use Cases Have Descriptions',
      description: 'Every use case in the diagram must have a description',
      completed: allUseCasesHaveDescriptions,
      required: true,
      category: 'description',
      details: `${useCasesWithDescriptions} of ${diagramUseCases.length} use cases have descriptions`,
    });

    if (!allUseCasesHaveDescriptions) {
      const missingCount = Math.max(0, diagramUseCases.length - useCasesWithDescriptions);
      errors.push({
        id: 'missing-descriptions',
        type: 'error',
        message: `${missingCount} use case(s) missing descriptions`,
        category: 'description',
        severity: 'critical',
        blocking: true,
      });
    } else if (diagramUseCases.length > 0 && Array.isArray(descriptions)) {
      // Check description quality
      const incompleteDescriptions = descriptions.filter((desc) =>
        !desc.scenario || desc.scenario.length < 50 || !desc.preconditions
      );

      if (incompleteDescriptions.length > 0) {
        warnings.push({
          id: 'incomplete-descriptions',
          type: 'warning',
          message: `${incompleteDescriptions.length} description(s) may be incomplete`,
          category: 'description',
          severity: 'medium',
        });
      }
    }

    // Check 3: SSDs created for required use cases
    const ssdData = progressData.systemSequenceDiagram || progressData.ssdData;
    const requiredSSDs = assignment.requirements.filter(req => req.type === 'ssd' && !req.optional);
    const hasRequiredSSDs = requiredSSDs.length === 0 || (ssdData && ssdData.length >= requiredSSDs.length);

    checklist.push({
      id: 'ssds-complete',
      title: 'Required SSDs Created',
      description: 'System Sequence Diagrams for required use cases',
      completed: hasRequiredSSDs,
      required: requiredSSDs.length > 0,
      category: 'ssd',
      details: requiredSSDs.length > 0
        ? `${ssdData?.length || 0} of ${requiredSSDs.length} required SSDs created`
        : 'No SSDs required for this assignment',
    });

    if (!hasRequiredSSDs && requiredSSDs.length > 0) {
      errors.push({
        id: 'missing-ssds',
        type: 'error',
        message: `${requiredSSDs.length} required SSD(s) missing`,
        category: 'ssd',
        severity: 'critical',
        blocking: true,
      });
    }

    // Check 4: Assignment requirements completion
    const completedRequirements = progressData.completedRequirements || [];
    const requiredAssignmentReqs = assignment.requirements.filter(req => !req.optional);
    const allRequiredCompleted = requiredAssignmentReqs.every(req =>
      completedRequirements.includes(req.id)
    );

    checklist.push({
      id: 'requirements-complete',
      title: 'All Required Requirements Completed',
      description: 'All mandatory assignment requirements must be completed',
      completed: allRequiredCompleted,
      required: true,
      category: 'validation',
      details: `${completedRequirements.length} of ${assignment.requirements.length} requirements completed`,
    });

    if (!allRequiredCompleted) {
      const missingReqs = requiredAssignmentReqs.filter(req => !completedRequirements.includes(req.id));
      errors.push({
        id: 'missing-requirements',
        type: 'error',
        message: `${missingReqs.length} required assignment requirement(s) not completed`,
        category: 'general',
        severity: 'critical',
        blocking: true,
      });
    }

    // Check 6: Time spent (warning if too low)
    const minTimeSpent = 15; // 15 minutes minimum
    if (progressData.timeSpent < minTimeSpent) {
      warnings.push({
        id: 'low-time-spent',
        type: 'warning',
        message: `Very little time spent (${progressData.timeSpent} minutes). Consider reviewing your work.`,
        category: 'general',
        severity: 'medium',
      });
    }

    // Check 7: Progress percentage
    const progressPercentage = assignment.progress || 0;
    if (progressPercentage < 80) {
      errors.push({
        id: 'low-progress',
        type: 'error',
        message: `Assignment progress is ${progressPercentage}%. Minimum 80% required to submit.`,
        category: 'general',
        severity: 'critical',
        blocking: true,
      });
    }

    const blockingErrors = errors.filter(err => err.blocking);
    const canSubmit = blockingErrors.length === 0;

    const summary = {
      totalRequirements: assignment.requirements.length,
      completedRequirements: completedRequirements.length,
      criticalErrors: blockingErrors.length,
      warnings: warnings.length,
      readyToSubmit: canSubmit,
    };

    return {
      canSubmit,
      warnings,
      errors,
      checklist,
      summary,
    };
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'text-status-red bg-status-red/10 border-status-red/20';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-muted bg-surface-3 border-black/10';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'diagram':
        return '📊';
      case 'description':
        return '📝';
      case 'ssd':
        return '🔄';
      case 'general':
      case 'validation':
        return '⚠️';
      default:
        return '📋';
    }
  };

  if (isChecking) {
    return (
      <div className="bg-white rounded-lg shadow-card border border-black/10 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-muted">Running submission checks...</span>
        </div>
      </div>
    );
  }

  if (!checkResult) {
    return (
      <div className="bg-white rounded-lg shadow-card border border-black/10 p-6">
        <div className="text-center text-muted py-8">Failed to run submission checks</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-card border border-black/10 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-ink mb-2">Submission Readiness Check</h3>
        <p className="text-muted">Review the checklist below before submitting your assignment</p>
      </div>

      {/* Summary */}
      <div className={`rounded-lg p-4 mb-6 ${checkResult.canSubmit
          ? 'bg-status-green/10 border border-green-200'
          : 'bg-status-red/10 border border-status-red/20'
        }`}>
        <div className="flex items-center justify-between">
          <div>
            <div className={`font-semibold ${checkResult.canSubmit ? 'text-status-green' : 'text-red-800'}`}>
              {checkResult.canSubmit ? '✅ Ready to Submit' : '❌ Cannot Submit Yet'}
            </div>
            <div className="text-sm text-muted mt-1">
              {checkResult.summary.completedRequirements} of {checkResult.summary.totalRequirements} requirements completed
            </div>
          </div>
          <div className="text-right">
            {checkResult.summary.criticalErrors > 0 && (
              <div className="text-sm font-medium text-status-red">
                {checkResult.summary.criticalErrors} critical error{checkResult.summary.criticalErrors > 1 ? 's' : ''}
              </div>
            )}
            {checkResult.summary.warnings > 0 && (
              <div className="text-sm font-medium text-yellow-600">
                {checkResult.summary.warnings} warning{checkResult.summary.warnings > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="mb-6">
        <h4 className="font-medium text-ink mb-3">Submission Checklist</h4>
        <div className="space-y-2">
          {checkResult.checklist.map((item) => (
            <div
              key={item.id}
              className={`flex items-start gap-3 p-3 rounded-lg border ${item.completed
                  ? 'bg-status-green/10 border-green-200'
                  : item.required
                    ? 'bg-status-red/10 border-status-red/20'
                    : 'bg-surface-3 border-black/10'
                }`}
            >
              <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${item.completed
                  ? 'bg-status-green/100 border-status-green'
                  : item.required
                    ? 'border-red-300 bg-red-100'
                    : 'border-gray-300 bg-surface-3'
                }`}>
                {item.completed && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getCategoryIcon(item.category)}</span>
                  <span className={`font-medium ${item.completed ? 'text-status-green' : item.required ? 'text-red-800' : 'text-gray-700'}`}>
                    {item.title}
                  </span>
                  {item.required && !item.completed && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">Required</span>
                  )}
                </div>
                <div className="text-sm text-muted mt-1">{item.description}</div>
                {item.details && (
                  <div className="text-xs text-muted mt-1">{item.details}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Errors and Warnings */}
      {(checkResult.errors.length > 0 || checkResult.warnings.length > 0) && (
        <div className="mb-6">
          <h4 className="font-medium text-ink mb-3">Issues Found</h4>
          <div className="space-y-2">
            {checkResult.errors.map((error) => (
              <div
                key={error.id}
                className={`p-3 rounded-lg border ${getSeverityColor(error.severity)}`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg">{getCategoryIcon(error.category)}</span>
                  <div className="flex-1">
                    <div className="font-medium">{error.message}</div>
                    {error.blocking && (
                      <div className="text-sm mt-1">This issue must be resolved before submission.</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {checkResult.warnings.map((warning) => (
              <div
                key={warning.id}
                className={`p-3 rounded-lg border ${getSeverityColor(warning.severity)}`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg">{getCategoryIcon(warning.category)}</span>
                  <div className="flex-1">
                    <div className="font-medium">{warning.message}</div>
                    <div className="text-sm mt-1">This is a warning and won't prevent submission.</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-black/10">
        <div>
          {!checkResult.canSubmit && (
            <div>
              <button
                onClick={() => setShowProceedAnyway(!showProceedAnyway)}
                className="text-sm text-muted hover:text-ink underline"
              >
                I understand and want to submit anyway
              </button>
              {showProceedAnyway && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="text-sm text-yellow-800">
                    <strong>Warning:</strong> You're submitting with unresolved issues. This may affect your grade. Are you sure?
                  </div>
                  <button
                    onClick={onProceedAnyway}
                    className="mt-2 px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                  >
                    Yes, Submit Anyway
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={runSubmissionCheck}
            className="px-4 py-2 text-muted border border-gray-300 rounded hover:bg-surface-3"
          >
            Re-run Check
          </button>
          {checkResult.canSubmit && (
            <button
              onClick={() => onCheckComplete(checkResult)}
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
            >
              Proceed to Submit
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubmissionChecker;
