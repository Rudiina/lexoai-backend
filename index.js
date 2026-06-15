 const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
require('dotenv').config();

const app = express();
const upload = multer({ dest: 'uploads/' });
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(cors());
app.use(express.json());

app.post('/evaluate', upload.single('file'), async (req, res) => {
  try {
    const lang = req.body.lang || 'en';
    const text = req.body.text || '';

    const systemPrompt = lang === 'sq'
      ? `Ti je një vlerësues ekspert i planeve mësimore për kurset universitare të metodikës së mësimdhënies së gjuhës. Vlerëso planin mësimor sipas pesë kritereve dhe kthe VETËM një objekt JSON të vlefshëm pa tekst shtesë, pa backtick, pa markdown. Formati: {"score": 7, "clarity": "...", "methods": "...", "structure": "...", "missing": "...", "suggestions": "..."} Rezultati duhet të jetë numër i plotë nga 1 deri në 10.`
      : `You are an expert evaluator of lesson plans for university language teaching methodology courses. Evaluate the lesson plan on five criteria and return ONLY a valid JSON object with no extra text, no backticks, no markdown. Format: {"score": 7, "clarity": "...", "methods": "...", "structure": "...", "missing": "...", "suggestions": "..."} Score must be an integer from 1 to 10.`;

    let messages = [];

   const pdfBase64 = req.body.pdfBase64 || '';

    if (pdfBase64) {
      const userText = lang === 'sq'
        ? 'Vlerëso këtë plan mësimor nga skedari PDF.'
        : 'Evaluate this lesson plan from the attached PDF.';

      messages = [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
          { type: 'text', text: userText }
        ]
      }];
    } else {
      const userPrompt = lang === 'sq'
        ? `Vlerëso këtë plan mësimor:\n\n${text}`
        : `Evaluate this lesson plan:\n\n${text}`;

      messages = [{ role: 'user', content: userPrompt }];
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: systemPrompt,
      messages
    });

    const raw = response.content.map(i => i.text || '').join('').trim();
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    res.json({ success: true, result: parsed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Evaluation failed' });
  }
});

app.get('/', (req, res) => {
  res.json({ status: 'LexoAI backend running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`LexoAI backend running on port ${PORT}`));