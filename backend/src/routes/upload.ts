import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true }); // 确保目录存在

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`)
});

const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 }, fileFilter: (_, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  cb(null, allowed.includes(file.mimetype));
}});

const router = Router();
router.use(authMiddleware);

router.post('/avatar', upload.single('file'), async (req: AuthRequest, res: Response) => { // 上传头像
  try {
    if (!req.file) return res.status(400).json({ error: 'VALIDATION_ERROR', message: '请选择图片文件' });
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    return res.json({ url: avatarUrl });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '上传失败' });
  }
});

export default router;
