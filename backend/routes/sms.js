const router = require('express').Router();

// Placeholder SMS route
router.post('/fallback', (req, res) => {
  res.json({ success: true, message: 'SMS fallback noted' });
});

module.exports = router;