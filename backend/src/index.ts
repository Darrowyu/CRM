import express from 'express'; // Express框架
import cors from 'cors'; // 跨域支持
import dotenv from 'dotenv'; // 环境变量
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './utils/logger.js';
import { pool, testConnection } from './db/connection.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import customerRoutes from './routes/customers.js';
import contactRoutes from './routes/contacts.js';
import opportunityRoutes from './routes/opportunities.js';
import followUpRoutes from './routes/followups.js';
import quoteRoutes from './routes/quotes.js';
import orderRoutes from './routes/orders.js';
import dashboardRoutes from './routes/dashboard.js';
import profileRoutes from './routes/profile.js';
import uploadRoutes from './routes/upload.js';
import taskRoutes from './routes/tasks.js';
import notificationRoutes from './routes/notifications.js';
import targetRoutes from './routes/targets.js';
import contractRoutes from './routes/contracts.js';
import paymentRoutes from './routes/payments.js';
import competitorRoutes from './routes/competitors.js';
import scoringRoutes from './routes/scoring.js';
import adminEnhancedRoutes from './routes/adminEnhanced.js';
import adminEnhanced2Routes from './routes/adminEnhanced2.js';
import aiRoutes from './routes/ai.js';
import agentRoutes from './routes/agent.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const CORS_WHITELIST = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(','); // CORS白名单
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || CORS_WHITELIST.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions)); // CORS配置
app.use(express.json({ limit: '10mb' })); // JSON解析（限制10MB）
app.use('/uploads', express.static(path.join(__dirname, '../uploads'))); // 静态文件服务
app.use('/api', apiLimiter); // API限流

app.use('/api/auth', authRoutes); // 路由
app.use('/api/admin', adminRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/follow-ups', followUpRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/targets', targetRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/competitors', competitorRoutes);
app.use('/api/scoring', scoringRoutes);
app.use('/api/admin', adminEnhancedRoutes); // 管理后台增强API
app.use('/api/admin', adminEnhanced2Routes); // 管理后台增强API2
app.use('/api/ai', aiRoutes); // AI智能服务
app.use('/api/agent', agentRoutes); // AI Agent自动化工作流

app.get('/api/health', async (req, res) => { // 健康检查接口
  try {
    const dbResult = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', timestamp: new Date().toISOString(), database: 'connected', dbTime: dbResult.rows[0].now });
  } catch (error) {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), database: 'disconnected' });
  }
});

app.use(notFoundHandler); // 404处理
app.use(errorHandler); // 全局错误处理

const startServer = async () => {
  await testConnection(); // 测试数据库连接
  app.listen(PORT, () => logger.info(`Backend server running on http://localhost:${PORT}`));
};

startServer();
export { app };
