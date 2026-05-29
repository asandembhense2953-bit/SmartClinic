const router = require('express').Router();
const { Patients, Doctors, Appointments, Sensors, Queue, Users } = require('../models');

// GET /api/powerbi/data
// Returns a combined JSON payload of primary datasets for Power BI ingestion
router.get('/data', async (req, res, next) => {
  try {
    const [patients, doctors, appointments, sensors, queue, users] = await Promise.all([
      Patients.getAll(),
      Doctors.getAll(),
      Appointments.getAll(),
      Sensors.getAll(200),
      Queue.getActive(),
      Users.getAll(),
    ]);
    res.json({ success: true, data: { patients, doctors, appointments, sensors, queue, users } });
  } catch (err) { next(err); }
});

// GET /api/powerbi/live
// Same as /data but with no-cache headers for Power BI to fetch latest
router.get('/live', async (req, res, next) => {
  try {
    const [patients, doctors, appointments, sensors, queue, users] = await Promise.all([
      Patients.getAll(), Doctors.getAll(), Appointments.getAll(), Sensors.getAll(200), Queue.getActive(), Users.getAll(),
    ]);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json({ success: true, data: { patients, doctors, appointments, sensors, queue, users } });
  } catch (err) { next(err); }
});

// helper: convert array of objects to CSV string
function toCSV(rows){
  if(!rows || !rows.length) return '';
  const keys = Object.keys(rows[0]);
  const esc = v => '"'+String(v===null||v===undefined?'':v).replace(/"/g,'""')+'"';
  const lines = [keys.join(',')].concat(rows.map(r => keys.map(k=>esc(r[k])).join(',')));
  return lines.join('\n');
}

// GET /api/powerbi/csv/:dataset
router.get('/csv/:dataset', async (req, res, next) => {
  try{
    const ds = req.params.dataset;
    let rows = [];
    switch(ds){
      case 'patients': rows = await Patients.getAll(); break;
      case 'doctors': rows = await Doctors.getAll(); break;
      case 'appointments': rows = await Appointments.getAll(); break;
      case 'sensors': rows = await Sensors.getAll(1000); break;
      case 'queue': rows = await Queue.getActive(); break;
      case 'users': rows = await Users.getAll(); break;
      default: return res.status(400).json({ success: false, error: 'unknown dataset' });
    }
    const csv = toCSV(rows);
    res.setHeader('Content-Type','text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${ds}.csv"`);
    res.send(csv);
  }catch(err){ next(err); }
});

module.exports = router;
