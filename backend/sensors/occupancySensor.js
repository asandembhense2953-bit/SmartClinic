// sensors/occupancySensor.js
// ── SENSOR 2 — ActiveQueueOccupancy ──────────
// setInterval every 60s, counts CheckedIn queue
// entries, writes to sensor_readings table
// ─────────────────────────────────────────────
const { Queue, Sensors } = require('../models');

const INTERVAL_MS = 60 * 1000; // 60 seconds (1 minute)
const THRESHOLD   = 8;

let interval = null;

const tick = async () => {
  try {
    const count = await Queue.countActive();
    await Sensors.write({
      sensor_type:     'ActiveQueueOccupancy',
      source:          'setInterval_Auto',
      patient_id:      null,
      occupancy_level: count,
    });
    if (count >= THRESHOLD) {
      console.warn(`⚠️  [Sensor 2] Alert: ${count} patients active (threshold: ${THRESHOLD})`);
    } else {
      console.log(`📡 [Sensor 2] Tick: ${count} active — ${new Date().toLocaleTimeString('en-ZA')}`);
    }
  } catch (err) {
    console.error('❌ [Sensor 2] Error:', err.message);
  }
};

exports.start = () => {
  console.log(`📡 Sensor 2 started — polling every ${INTERVAL_MS / 1000}s`);
  interval = setInterval(tick, INTERVAL_MS);
};

exports.stop = () => {
  if (interval) { clearInterval(interval); interval = null; }
};
