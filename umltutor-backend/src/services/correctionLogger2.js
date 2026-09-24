"use strict";

const prisma = require("../utils/prisma").default;

class CorrectionLogger {
  static async logCorrection({ original, corrected, type, teacherId, submissionId, context = {} }) {
    try {
      return await prisma.correctionLog.create({
        data: {
          original: typeof original === "object" ? JSON.stringify(original) : original,
          corrected: typeof corrected === "object" ? JSON.stringify(corrected) : corrected,
          type,
          teacherId: Number(teacherId),
          submissionId: submissionId ? Number(submissionId) : null,
          context: typeof context === "object" ? JSON.stringify(context) : context,
          createdAt: new Date()
        }
      });
    } catch (err) {
      console.error("[CorrectionLogger] Failed to log correction:", err.message);
      return null;
    }
  }

  static async generateSynonymSuggestions() {
    const corrections = await prisma.correctionLog.findMany({
      where: { type: "ACTOR_RENAME" },
      orderBy: { createdAt: "desc" },
      take: 500
    });

    const synonymPairs = new Map();
    
    corrections.forEach(c => {
      try {
        const orig = typeof c.original === "string" ? c.original : JSON.parse(c.original);
        const corr = typeof c.corrected === "string" ? c.corrected : JSON.parse(c.corrected);
        
        const key = [orig, corr].sort().join("|");
        const count = (synonymPairs.get(key) || 0) + 1;
        synonymPairs.set(key, { original: orig, corrected: corr, count });
      } catch (e) {
        // Skip malformed entries
      }
    });

    return Array.from(synonymPairs.values())
      .filter(p => p.count >= 3)
      .sort((a, b) => b.count - a.count);
  }

  static async generateUseCaseDedupSuggestions() {
    const corrections = await prisma.correctionLog.findMany({
      where: { type: "USE_CASE_RENAME" },
      orderBy: { createdAt: "desc" },
      take: 500
    });

    const pairs = new Map();
    
    corrections.forEach(c => {
      try {
        const orig = typeof c.original === "string" ? c.original : JSON.parse(c.original);
        const corr = typeof c.corrected === "string" ? c.corrected : JSON.parse(c.corrected);
        
        const key = [orig, corr].sort().join("|");
        const count = (pairs.get(key) || 0) + 1;
        pairs.set(key, { original: orig, corrected: corr, count });
      } catch (e) {
        // Skip
      }
    });

    return Array.from(pairs.values())
      .filter(p => p.count >= 3)
      .sort((a, b) => b.count - a.count);
  }

  static async getCorrectionStats() {
    const byType = await prisma.correctionLog.groupBy({
      by: ["type"],
      _count: { type: true }
    });

    const total = await prisma.correctionLog.count();

    const recent = await prisma.correctionLog.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      })
    });

    return {
      total,
      recentWeek: recent,
      byType: byType.map(t => ({ type: t.type, count: t._count.type }))
    };
  }
}

module.exports = { CorrectionLogger };
