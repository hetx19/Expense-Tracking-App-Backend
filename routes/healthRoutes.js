const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.get('/ready', (req, res) => {
  const dbOk = mongoose.connection.readyState === 1;
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ready' : 'not ready',
    db: dbOk,
  });
});

module.exports = router;
