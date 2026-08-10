"use strict";
Object.defineProperty(exports, "__esModule", { value: true });


const prisma = require('../config/prisma');
const { parseRequirementText } = require('../nlp/promptRequirementParser');

class RequirementService {

  parse(text) {
    return parseRequirementText(text);
  }

  /**
   * Resolve the requirement text that should drive a submission's check.
   * Priority: assignment.requirementText → assignment.textContent → null.
   * @param {number} assignmentId
   */
  async getRequirementTextForAssignment(assignmentId) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: Number(assignmentId) },
      select: { id: true, requirementText: true, textContent: true },
    });
    if (!assignment) return null;
    if (assignment.requirementText && assignment.requirementText.trim()) {
      return assignment.requirementText;
    }
    if (assignment.textContent && assignment.textContent.trim()) {
      return assignment.textContent;
    }
    return null;
  }

  /**
   * Resolve the requirement model that should drive a submission's check.
   * The assignment's case-study text is parsed on demand (no snapshot cache).
   * @param {number} submissionId
   * @returns {Promise<{model, assignmentId, source}>}
   */
  async getRequirementModelForSubmission(submissionId) {
    const submission = await prisma.submission.findUnique({
      where: { id: Number(submissionId) },
      select: { id: true, assignmentId: true },
    });
    if (!submission) return { model: null, assignmentId: null };

    const requirementText = await this.getRequirementTextForAssignment(submission.assignmentId);
    if (!requirementText) {
      return { model: null, assignmentId: submission.assignmentId, source: 'none' };
    }

    const model = parseRequirementText(requirementText);
    return { model, assignmentId: submission.assignmentId, source: 'assignment' };
  }
}

exports.default = new RequirementService();
