"use strict";

/**
 * RequirementExtractorLLM
 *
 * Implements Pillar D: Few-Shot Requirement Extraction.
 * Extracts actors, system name candidates, and use cases with primary/secondary actor mappings
 * using structured JSON prompting, with caching and deterministic fallback.
 */

const https = require('https');
const crypto = require('crypto');
const { parseRequirementText } = require('./promptRequirementParser');

// In-memory cache for parsed requirement models to avoid redundant LLM calls
const extractionCache = new Map();

class RequirementExtractorLLM {
  /**
   * Parse assignment requirement text into a structured requirement model
   * @param {string} text - Raw assignment prompt text
   * @returns {Promise<object>}
   */
  static async extractRequirementsAsync(text) {
    if (!text || typeof text !== 'string' || !text.trim()) {
      return parseRequirementText(text);
    }

    const trimmed = text.trim();
    const hash = crypto.createHash('sha256').update(trimmed).digest('hex').slice(0, 16);

    if (extractionCache.has(hash)) {
      return extractionCache.get(hash);
    }

    // Baseline deterministic parse
    const baseModel = parseRequirementText(trimmed);

    // 1. Try Gemini if configured
    if (process.env.GEMINI_API_KEY) {
      try {
        const llmResult = await this.callGeminiExtraction(trimmed);
        if (llmResult) {
          const merged = this.mergeModelWithLLM(baseModel, llmResult);
          extractionCache.set(hash, merged);
          return merged;
        }
      } catch (err) {
        console.warn('[RequirementExtractorLLM] Gemini extraction failed:', err.message);
      }
    }

    // 2. Try OpenAI if configured
    if (process.env.OPENAI_API_KEY) {
      try {
        const llmResult = await this.callOpenAIExtraction(trimmed);
        if (llmResult) {
          const merged = this.mergeModelWithLLM(baseModel, llmResult);
          extractionCache.set(hash, merged);
          return merged;
        }
      } catch (err) {
        console.warn('[RequirementExtractorLLM] OpenAI extraction failed:', err.message);
      }
    }

    // 3. Fallback to base deterministic model
    extractionCache.set(hash, baseModel);
    return baseModel;
  }

  /**
   * Merge LLM structured output with deterministic model for maximum fidelity
   */
  static mergeModelWithLLM(baseModel, llmResult) {
    const merged = { ...baseModel };

    // Merge system candidates
    if (Array.isArray(llmResult.systemCandidates) && llmResult.systemCandidates.length > 0) {
      const existing = new Set(merged.systemCandidates || []);
      llmResult.systemCandidates.forEach((s) => {
        if (typeof s === 'string' && s.trim()) existing.add(s.trim());
      });
      merged.systemCandidates = Array.from(existing);
    }

    // Merge actors
    if (Array.isArray(llmResult.actors) && llmResult.actors.length > 0) {
      const existingActors = new Set((merged.actors || []).map((a) => a.toLowerCase()));
      llmResult.actors.forEach((act) => {
        if (typeof act === 'string' && act.trim() && !existingActors.has(act.toLowerCase())) {
          merged.actors.push(act.trim());
          existingActors.add(act.toLowerCase());
        }
      });
    }

    // Enrich use cases with primaryActor if missing or refined by LLM
    if (Array.isArray(llmResult.useCases) && llmResult.useCases.length > 0) {
      llmResult.useCases.forEach((luc) => {
        if (!luc.name) return;
        const match = (merged.useCases || []).find(
          (muc) => muc.name.toLowerCase() === luc.name.toLowerCase()
        );
        if (match) {
          if (luc.primaryActor && !match.primaryActor) {
            match.primaryActor = luc.primaryActor;
          }
          if (Array.isArray(luc.secondaryActors)) {
            match.secondaryActors = luc.secondaryActors;
          }
        } else if (luc.name && luc.primaryActor) {
          merged.useCases.push({
            name: luc.name,
            primaryActor: luc.primaryActor,
            secondaryActors: luc.secondaryActors || [],
            confidence: 0.85,
            sourceSentence: luc.rationale || '',
          });
        }
      });
    }

    return merged;
  }

  /**
   * Call Gemini with Few-Shot structured extraction
   */
  static async callGeminiExtraction(text) {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `You are a software engineering requirements analyst. Extract the UML Use Case specifications from the following assignment description.

Return strictly valid JSON in this schema:
{
  "systemCandidates": ["Notices Management System", "Department Notices System"],
  "actors": ["Administrator", "Staff", "Faculty", "Student"],
  "useCases": [
    {
      "name": "Maintain Members",
      "primaryActor": "Administrator",
      "secondaryActors": [],
      "rationale": "Administrator maintains registered members list"
    }
  ]
}

Assignment Text:
${text}`;

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
          timeout: 7000,
        },
        (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => {
            try {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                const parsed = JSON.parse(body);
                const txt = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (txt) resolve(JSON.parse(txt));
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
   * Call OpenAI with Few-Shot structured extraction
   */
  static async callOpenAIExtraction(text) {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const url = 'https://api.openai.com/v1/chat/completions';

    const prompt = `Extract UML Use Case specifications from the text.
Return strictly valid JSON:
{
  "systemCandidates": ["System Name 1"],
  "actors": ["Actor 1"],
  "useCases": [{"name": "Action Verb Object", "primaryActor": "Actor 1", "secondaryActors": []}]
}

Assignment:
${text}`;

    const payload = JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 600,
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
          timeout: 7000,
        },
        (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => {
            try {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                const parsed = JSON.parse(body);
                const txt = parsed?.choices?.[0]?.message?.content;
                if (txt) resolve(JSON.parse(txt));
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

module.exports = RequirementExtractorLLM;
