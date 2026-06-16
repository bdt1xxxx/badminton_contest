const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const collection = db.collection('matches');
const _ = db.command;

const DEFAULT_KEEP_DAYS = 7;
const BATCH_SIZE = 100;

async function fetchExpiredMatchIds(cutoffTs) {
  const res = await collection
    .where({
      updatedAt: _.lte(cutoffTs)
    })
    .field({
      _id: true,
      matchId: true,
      updatedAt: true
    })
    .limit(BATCH_SIZE)
    .get();

  const list = (res && res.data) || [];
  return list.map((item) => item._id || item.matchId).filter(Boolean);
}

exports.main = async (event = {}) => {
  const keepDays = Number.isFinite(Number(event.keepDays)) ? Number(event.keepDays) : DEFAULT_KEEP_DAYS;
  const dryRun = !!event.dryRun;
  const now = Date.now();
  const cutoffTs = now - keepDays * 24 * 60 * 60 * 1000;

  let totalDeleted = 0;
  let batchCount = 0;

  while (true) {
    const ids = await fetchExpiredMatchIds(cutoffTs);
    if (ids.length === 0) {
      break;
    }

    batchCount += 1;

    if (dryRun) {
      totalDeleted += ids.length;
      if (ids.length < BATCH_SIZE) {
        break;
      }
      continue;
    }

    const tasks = ids.map((id) => collection.doc(id).remove());
    await Promise.all(tasks);
    totalDeleted += ids.length;

    if (ids.length < BATCH_SIZE) {
      break;
    }
  }

  return {
    ok: true,
    dryRun,
    keepDays,
    cutoffTs,
    batchCount,
    deletedCount: totalDeleted
  };
};
