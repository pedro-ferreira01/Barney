import { Router } from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import { prisma } from '../config/prisma.js';
import { requireActiveSubscription, requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 5 },
  fileFilter(req, file, cb) {
    const allowed = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/pdf',
      'image/png',
      'image/jpeg'
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    return cb(new Error('Tipo de arquivo não permitido'));
  }
});

function parseNumber(value) {
  if (typeof value === 'number') return value;
  const cleaned = String(value ?? '')
    .replace(/R\$/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function analyzeWorksheet(buffer) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const first = workbook.SheetNames[0];
  const rows = xlsx.utils.sheet_to_json(workbook.Sheets[first], { header: 1, defval: '' });
  const categories = new Map();
  let total = 0;
  let count = 0;

  for (const row of rows.slice(1)) {
    if (!Array.isArray(row) || row.length === 0) continue;
    const values = row.map(parseNumber).filter((n) => Math.abs(n) > 0);
    const amount = values.length ? values.reduce((a, b) => Math.abs(a) > Math.abs(b) ? a : b, 0) : 0;
    if (!amount) continue;
    const category = String(row.find((cell) => typeof cell === 'string' && cell.length > 2) || 'Não categorizado').slice(0, 60);
    total += amount;
    count += 1;
    categories.set(category, (categories.get(category) || 0) + Math.abs(amount));
  }

  const dominantCategory = [...categories.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  return { rowsDetected: count, totalCents: Math.round(total * 100), dominantCategory, categories: Object.fromEntries(categories) };
}

router.post('/analyze', requireAuth, requireActiveSubscription, upload.array('files', 5), asyncHandler(async (req, res) => {
  const files = req.files || [];
  const analyses = [];

  for (const file of files) {
    let summary = { rowsDetected: 0, totalCents: 0, dominantCategory: null, categories: {} };
    if (file.mimetype.includes('spreadsheet') || file.mimetype.includes('excel') || file.mimetype === 'text/csv') {
      summary = analyzeWorksheet(file.buffer);
    }

    const saved = await prisma.fileAnalysis.create({
      data: {
        userId: req.user.id,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        rowsDetected: summary.rowsDetected,
        totalCents: summary.totalCents,
        dominantCategory: summary.dominantCategory,
        summaryJson: JSON.stringify(summary)
      }
    });

    analyses.push({
      id: saved.id,
      originalName: saved.originalName,
      rowsDetected: saved.rowsDetected,
      total: saved.totalCents / 100,
      dominantCategory: saved.dominantCategory,
      categories: summary.categories
    });
  }

  res.status(201).json({ analyses });
}));

router.get('/analyses', requireAuth, requireActiveSubscription, asyncHandler(async (req, res) => {
  const analyses = await prisma.fileAnalysis.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50
  });
  res.json({
    analyses: analyses.map((item) => ({
      id: item.id,
      originalName: item.originalName,
      mimeType: item.mimeType,
      sizeBytes: item.sizeBytes,
      rowsDetected: item.rowsDetected,
      total: item.totalCents / 100,
      dominantCategory: item.dominantCategory,
      createdAt: item.createdAt
    }))
  });
}));

export default router;
