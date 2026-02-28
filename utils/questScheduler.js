// ═══════════════════════════════════════════════════════════════
//  Quest Scheduler — lightweight
//
//  Daily/weekly quest resets are now handled lazily in
//  questSystem.js (getQuestProgress). This scheduler is kept
//  for optional batch-cleanup but is NOT required for the
//  quest system to function.
// ═══════════════════════════════════════════════════════════════

class QuestScheduler {
    constructor() {
        // No-op — resets are handled lazily on access in getQuestProgress()
        console.log('[QuestScheduler] Using lazy quest resets (no cron needed).');
    }
}

module.exports = new QuestScheduler();