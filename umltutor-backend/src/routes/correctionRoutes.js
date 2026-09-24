"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
var _express = require('express');
var _routeMiddleware = require('../middleware/routeMiddleware');
var _correctionLogger = require('../services/correctionLogger');
var _correctionLogger2 = _interopRequireDefault(_correctionLogger);

const router = _express.Router.call(void 0, );

router.use(_routeMiddleware.requestLogger);
router.use(_routeMiddleware.authenticate);
router.use(_routeMiddleware.authorize('TEACHER'));

router.post('/log', async (req, res) => {
  try {
    const { original, corrected, type, submissionId, context } = req.body;
    
    if (!original || !corrected || !type) {
      return res.status(400).json({ success: false, error: { message: 'Missing required fields' } });
    }

    const log = await _correctionLogger2.default.logCorrection({
      original,
      corrected,
      type,
      teacherId: req.user.id,
      submissionId,
      context
    });

    res.json({ success: true, data: log });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

router.get('/synonyms', async (req, res) => {
  try {
    const suggestions = await _correctionLogger2.default.generateSynonymSuggestions();
    res.json({ success: true, data: suggestions });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

router.get('/use-case-dedup', async (req, res) => {
  try {
    const suggestions = await _correctionLogger2.default.generateUseCaseDedupSuggestions();
    res.json({ success: true, data: suggestions });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await _correctionLogger2.default.getCorrectionStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

exports.default = router;