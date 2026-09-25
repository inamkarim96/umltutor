"use strict";

/**
 * AIFeedbackService
 *
 * Implements Pillar C: AI UML Tutoring Layer.
 * Synthesizes diagnostic verification results into clear, encouraging,
 * and actionable pedagogical guidance for students.
 */

const https = require('https');

class AIFeedbackService {
  /**
   * Main entry point to generate student feedback
   * @param {object} checkResult - Output from CheckingEngine.checkModel
   * @param {object} requirementModel - Parsed assignment requirement model
   * @returns {Promise<object>}
   */
  static async generateFeedback(checkResult, requirementModel = null) {
    if (!checkResult) return null;

    const structuredData = this.prepareDiagnosticData(checkResult, requirementModel);

    // 1. Try Gemini API if key is present
    if (process.env.GEMINI_API_KEY) {
      try {
        const geminiResult = await this.callGemini(structuredData);
        if (geminiResult) return geminiResult;
      } catch (err) {
        console.warn('[AIFeedbackService] Gemini call failed, falling back to synthesizer:', err.message);
      }
    }

    // 2. Try OpenAI API if key is present
    if (process.env.OPENAI_API_KEY) {
      try {
        const openAIResult = await this.callOpenAI(structuredData);
        if (openAIResult) return openAIResult;
      } catch (err) {
        console.warn('[AIFeedbackService] OpenAI call failed, falling back to synthesizer:', err.message);
      }
    }

    // 3. Fallback to Local Pedagogical Synthesizer (reliable, instant, offline)
    return this.synthesizeLocalFeedback(structuredData);
  }

  /**
   * Distill check issues and case-study reports into structured tutor data.
   * Supports all 5 UML phases: Use Case, Description, SSD, Class Diagram, Sequence Diagram.
   */
  static prepareDiagnosticData(checkResult, requirementModel) {
    const issues = checkResult.issues || [];
    const cs = checkResult.caseStudyReport || {};

    // Phase 1: Use Case Diagram
    const verifiedUseCases = (cs.useCaseStatus || [])
      .filter((u) => u.status === 'found')
      .map((u) => ({ useCase: u.useCase, matched: u.submitted, actor: u.primaryActor }));

    const missingUseCases = (cs.useCaseStatus || [])
      .filter((u) => u.status === 'missing')
      .map((u) => u.useCase);

    const actorTypos = (cs.actorStatus || [])
      .filter((a) => a.status === 'typo')
      .map((a) => ({ expected: a.actor, submitted: a.submitted || a.actor }));

    const actorMatches = (cs.actorStatus || [])
      .filter((a) => a.status === 'found')
      .map((a) => a.actor);

    const systemNameIssue = issues.find((i) => i.code?.includes('SYSTEM_NAME'));
    const systemExpected = cs.systemName?.expected || (cs.expected?.systemCandidates || [])[0] || 'System Name';
    const systemStatus = cs.systemName?.status || (systemNameIssue ? 'missing' : 'valid');

    // Phase-grouped issue extraction
    const byLocation = (loc) => issues.filter((i) => {
      const l = (i.location || '').toLowerCase();
      return l === loc || l.includes(loc);
    });

    const descriptionIssues = byLocation('description');
    const ssdIssues = byLocation('ssd');
    const classDiagramIssues = byLocation('class-diagram');
    const sequenceIssues = byLocation('sequence-diagram');

    // Phase 2: Description
    const descErrors = descriptionIssues.filter((i) => i.severity === 'error');
    const descWarnings = descriptionIssues.filter((i) => i.severity === 'warning');

    // Phase 3: SSD
    const ssdErrors = ssdIssues.filter((i) => i.severity === 'error');
    const ssdConsistencyErrors = ssdIssues.filter((i) => i.type === 'consistency' && i.severity === 'error');

    // Phase 4: Class Diagram
    const classErrors = classDiagramIssues.filter((i) => i.severity === 'error');
    const classEntitySuggestions = classDiagramIssues.filter((i) => i.code === 'CLASS_ENTITY_SUGGESTION');

    // New detailed class diagram findings
    const classAttrVerified = classDiagramIssues.filter((i) => i.code === 'CLASS_ATTRIBUTE_VERIFIED');
    const classAttrMissing = classDiagramIssues.filter((i) => i.code === 'CLASS_ATTRIBUTE_MISSING');
    const classAssocVerified = classDiagramIssues.filter((i) => i.code === 'CLASS_ASSOCIATION_VERIFIED');
    const classAssocMissing = classDiagramIssues.filter((i) => i.code === 'CLASS_ASSOCIATION_MISSING');
    const classInheritVerified = classDiagramIssues.filter((i) => i.code === 'CLASS_INHERITANCE_VERIFIED');
    const classInheritMissing = classDiagramIssues.filter((i) => i.code === 'CLASS_INHERITANCE_MISSING');
    const classInheritRedundant = classDiagramIssues.filter((i) => i.code === 'CLASS_INHERITANCE_REDUNDANT_ATTR');
    const classGenOpportunity = classDiagramIssues.filter((i) => i.code === 'CLASS_GENERALIZATION_OPPORTUNITY');

    // Phase 5: Sequence Diagram
    const seqErrors = sequenceIssues.filter((i) => i.severity === 'error');
    const seqOperationMissing = sequenceIssues.filter((i) => i.code === 'SEQUENCE_OPERATION_NOT_DEFINED');

    const syntaxErrors = issues.filter(
      (i) => i.severity === 'error' && !i.code?.startsWith('CASE_STUDY_')
    );
    const syntaxWarnings = issues.filter(
      (i) => i.severity === 'warning' && !i.code?.startsWith('CASE_STUDY_')
    );

    // Determine active phases from available issues
    const activePhases = [];
    if (verifiedUseCases.length || missingUseCases.length || actorMatches.length || actorTypos.length || systemStatus !== 'valid') activePhases.push('usecase');
    if (descriptionIssues.length) activePhases.push('description');
    if (ssdIssues.length) activePhases.push('ssd');
    if (classDiagramIssues.length) activePhases.push('class-diagram');
    if (sequenceIssues.length) activePhases.push('sequence-diagram');

    return {
      // Phase 1
      systemStatus, systemExpected,
      verifiedUseCases, missingUseCases,
      actorTypos, actorMatches,
      // Phase 2
      descErrorCount: descErrors.length,
      descWarningCount: descWarnings.length,
      // Phase 3
      ssdErrorCount: ssdErrors.length,
      ssdConsistencyErrorCount: ssdConsistencyErrors.length,
      // Phase 4
      classErrorCount: classErrors.length,
      classEntitySuggestionCount: classEntitySuggestions.length,
      classAttrVerified,
      classAttrMissing,
      classAssocVerified,
      classAssocMissing,
      classInheritVerified,
      classInheritMissing,
      classInheritRedundant,
      classGenOpportunity,
      // Phase 5
      seqErrorCount: seqErrors.length,
      seqOperationMissingCount: seqOperationMissing.length,
      // Summary
      syntaxErrorsCount: syntaxErrors.length,
      syntaxWarningsCount: syntaxWarnings.length,
      totalFindings: issues.length,
      activePhases,
    };
  }

  /**
   * Local High-Quality Pedagogical Synthesizer — Phase-Aware
   * Produces contextual guidance based on which UML phases have findings.
   */
  static synthesizeLocalFeedback(data) {
    const strengths = [];
    const remediations = [];

    const phases = data.activePhases || [];
    const hasPhase = (p) => phases.includes(p);

    // Phase 1: Use Case Diagram
    if (data.verifiedUseCases.length > 0) {
      const ucList = data.verifiedUseCases.map((u) => `"${u.useCase}"`).join(', ');
      strengths.push(`Successfully identified core use cases: ${ucList}.`);
    }
    if (data.actorMatches.length > 0) {
      strengths.push(`Correctly defined key domain actors: ${data.actorMatches.join(', ')}.`);
    } else if (data.actorTypos.length > 0) {
      strengths.push('Understands the required participant roles in the assignment domain.');
    }
    if (data.systemStatus === 'valid') {
      strengths.push('System boundary properly named and scoped.');
    }
    if (data.systemStatus !== 'valid') {
      remediations.push(`Name your system boundary after the domain topic, e.g. "${data.systemExpected}".`);
    }
    if (data.actorTypos.length > 0) {
      const typoDescriptions = data.actorTypos.map((t) => `"${t.submitted}" → "${t.expected}"`).join(', ');
      remediations.push(`Use exact role names from the assignment for clarity (${typoDescriptions}).`);
    }
    if (data.missingUseCases.length > 0) {
      const missingList = data.missingUseCases.map((u) => `"${u}"`).join(', ');
      remediations.push(`Add the missing required use case(s): ${missingList}.`);
    }

    // Phase 2: Use Case Description
    if (hasPhase('description')) {
      if (data.descErrorCount === 0) {
        strengths.push('Use Case Descriptions are structurally complete with name, actor, pre/postconditions, and main flow.');
      } else {
        remediations.push(`Fix ${data.descErrorCount} error(s) in Use Case Descriptions: ensure each has a name, primary actor, pre/postconditions, and a fully populated main flow.`);
      }
      if (data.descWarningCount > 0) {
        remediations.push(`Review ${data.descWarningCount} warning(s) in descriptions — check step sentence quality and scenario completeness.`);
      }
    }

    // Phase 3: System Sequence Diagram
    if (hasPhase('ssd')) {
      if (data.ssdErrorCount === 0) {
        strengths.push('SSD messages are structurally valid and aligned with the description steps.');
      } else {
        if (data.ssdConsistencyErrorCount > 0) {
          remediations.push(`Align SSD messages with the Main Success Scenario: ${data.ssdConsistencyErrorCount} step(s) are missing a matching message. Use concise camelCase names like updateMemberInfo() or displayUserList().`);
        }
        const structuralErrors = data.ssdErrorCount - data.ssdConsistencyErrorCount;
        if (structuralErrors > 0) {
          remediations.push(`Fix ${structuralErrors} structural SSD error(s): verify lifelines are Actor and System only, and message types (call/return/self-loop) match step semantics.`);
        }
      }
    }

    // Phase 4: Class Diagram
    if (hasPhase('class-diagram')) {
      // Attribute verification
      if (data.classAttrVerified && data.classAttrVerified.length > 0) {
        strengths.push(`Class attributes verified: ${data.classAttrVerified.length} attribute(s) match expected domain data from descriptions/SSDs.`);
      }
      if (data.classAttrMissing && data.classAttrMissing.length > 0) {
        remediations.push(`Add ${data.classAttrMissing.length} missing class attribute(s) identified from use case descriptions and SSD parameters.`);
      }

      // Association verification
      if (data.classAssocVerified && data.classAssocVerified.length > 0) {
        strengths.push(`Class associations verified: ${data.classAssocVerified.length} relationship(s) between collaborating classes confirmed.`);
      }
      if (data.classAssocMissing && data.classAssocMissing.length > 0) {
        remediations.push(`Add ${data.classAssocMissing.length} missing association line(s) between classes that collaborate in use cases/SSDs.`);
      }

      // Inheritance verification
      if (data.classInheritVerified && data.classInheritVerified.length > 0) {
        strengths.push(`Inheritance hierarchies verified: ${data.classInheritVerified.length} generalization relationship(s) match requirements.`);
      }
      if (data.classInheritMissing && data.classInheritMissing.length > 0) {
        remediations.push(`Add ${data.classInheritMissing.length} missing inheritance relationship(s) (generalization arrows) for "is-a" hierarchies.`);
      }
      if (data.classInheritRedundant && data.classInheritRedundant.length > 0) {
        remediations.push(`Remove ${data.classInheritRedundant.length} redundant attribute(s) in subclass(es) that are already inherited from parent class(es).`);
      }
      if (data.classGenOpportunity && data.classGenOpportunity.length > 0) {
        remediations.push(`Consider abstracting shared attributes into a common superclass for ${data.classGenOpportunity.length} class pair(s).`);
      }

      if (data.classErrorCount === 0) {
        strengths.push('Class Diagram is well-formed: classes, attributes, operations, and relationships are correctly structured.');
      } else {
        remediations.push(`Resolve ${data.classErrorCount} Class Diagram error(s): ensure classes have typed attributes, public operations mapped to SSD messages, and valid multiplicities.`);
      }
      if (data.classEntitySuggestionCount > 0) {
        remediations.push(`Consider adding ${data.classEntitySuggestionCount} domain class(es) suggested from use case descriptions.`);
      }
    }

    // Phase 5: Sequence Diagram
    if (hasPhase('sequence-diagram')) {
      if (data.seqErrorCount === 0) {
        strengths.push('Sequence Diagrams correctly map participant lifelines and message calls to Class Diagram operations.');
      } else {
        if (data.seqOperationMissingCount > 0) {
          remediations.push(`Define ${data.seqOperationMissingCount} missing operation(s) on the appropriate class(es) to match Sequence Diagram message calls.`);
        }
        const otherSeqErrors = data.seqErrorCount - data.seqOperationMissingCount;
        if (otherSeqErrors > 0) {
          remediations.push(`Fix ${otherSeqErrors} Sequence Diagram error(s): verify lifeline labels match class names, message order matches the main flow, and call/return pairs are properly structured.`);
        }
      }
    }

    let summary = '';
    if (remediations.length === 0) {
      summary = 'Outstanding work! Your UML model fully aligns with the assignment specifications across all phases.';
    } else if (strengths.length > 0) {
      summary = `Good progress on your UML model. Address the ${remediations.length} item(s) below to achieve full consistency.`;
    } else {
      summary = 'Your UML model is in early stages. Review the recommendations below to build a complete and consistent multi-phase model.';
    }

    return {
      source: 'local-synthesizer',
      summary,
      strengths,
      remediations,
      guidanceText: [
        summary,
        strengths.length > 0 ? `• Strengths: ${strengths.join(' ')}` : '',
        remediations.length > 0 ? `• Action Items: ${remediations.join(' | ')}` : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
    };
  }

  /**
   * Gemini API call (Tier 1)
   */
  static async callGemini(data) {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const phaseLabels = {
      'usecase': 'Phase 1: Use Case Diagram',
      'description': 'Phase 2: Use Case Description',
      'ssd': 'Phase 3: System Sequence Diagram',
      'class-diagram': 'Phase 4: Class Diagram',
      'sequence-diagram': 'Phase 5: Sequence Diagram',
    };
    const activePhaseNames = (data.activePhases || ['usecase']).map((p) => phaseLabels[p] || p).join(', ');

    const prompt = `You are a friendly, encouraging university Software Engineering Professor reviewing a student's UML model across these phases: ${activePhaseNames}.
Diagnostic findings:
${JSON.stringify(data, null, 2)}

Provide your response strictly as valid JSON in this format:
{
  "summary": "1 encouraging summary sentence highlighting their overall progress",
  "strengths": ["1-3 concise bullet points of what they did well per phase"],
  "remediations": ["1-4 prioritized, non-duplicate bullet points explaining exactly what to fix in each relevant phase"]
}`;

    const payload = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    return new Promise((resolve) => {
      const req = https.request(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
          timeout: 5000,
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            try {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                const parsed = JSON.parse(body);
                const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  const json = JSON.parse(text);
                  resolve({
                    source: 'gemini',
                    summary: json.summary,
                    strengths: json.strengths || [],
                    remediations: json.remediations || [],
                  });
                  return;
                }
              }
              resolve(null);
            } catch (e) {
              resolve(null);
            }
          });
        }
      );
      req.on('error', () => resolve(null));
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
      req.write(payload);
      req.end();
    });
  }

  /**
   * OpenAI API call (Tier 1 alternative)
   */
  static async callOpenAI(data) {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const url = 'https://api.openai.com/v1/chat/completions';

    const prompt = `You are a friendly university Software Engineering Professor reviewing a student's UML diagram.
Diagnostic findings:
${JSON.stringify(data, null, 2)}

Return strictly valid JSON:
{
  "summary": "1 encouraging sentence",
  "strengths": ["concise list of what they got right"],
  "remediations": ["prioritized, non-duplicate list of fixes"]
}`;

    const payload = JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 300,
    });

    return new Promise((resolve) => {
      const req = https.request(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'Content-Length': Buffer.byteLength(payload),
          },
          timeout: 5000,
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            try {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                const parsed = JSON.parse(body);
                const text = parsed?.choices?.[0]?.message?.content;
                if (text) {
                  const json = JSON.parse(text);
                  resolve({
                    source: 'openai',
                    summary: json.summary,
                    strengths: json.strengths || [],
                    remediations: json.remediations || [],
                  });
                  return;
                }
              }
              resolve(null);
            } catch (e) {
              resolve(null);
            }
          });
        }
      );
      req.on('error', () => resolve(null));
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
      req.write(payload);
      req.end();
    });
  }
}

module.exports = AIFeedbackService;
