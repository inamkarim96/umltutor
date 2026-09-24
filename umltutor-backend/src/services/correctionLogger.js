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
    return corrections.map(c => c.original);
  }

  static async generateUseCaseDedupSuggestions() {
    const corrections = await prisma.correctionLog.findMany({
      where: { type: "USE_CASE_DEDUP" },
      orderBy: { createdAt: "desc" },
      take: 500
    });
    return corrections.map(c => c.original);
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
      }
    });

    return {
      total,
      recentWeek: recent,
      byType: byType.map(t => ({ type: t.type, count: t._count.type }))
    };
  }
}

module.exports = { CorrectionLogger };