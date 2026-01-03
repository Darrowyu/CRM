# Makrite CRM 系统

制造业客户关系管理系统 MVP 版本

## 功能特性

### 客户管理
- 客户录入（手动/Excel批量导入）
- 公海池机制（领取上限50个，30天未跟进自动回退）
- 客户查重（公司名/手机号）
- 手机号脱敏显示

### 销售漏斗
- 5阶段流转：初步接洽 → 需求确认 → 报价/寄样 → 谈判 → 赢单/输单
- 跟进记录（文字+图片）
- 阶段转换验证

### 报价与订单
- 阶梯报价（按数量自动匹配单价）
- 审批流程（低于底价触发审批）
- 合同归档（PDF/图片上传）

### 报表分析
- 销售仪表盘（当月销售额、回款、新客户）
- 转化率分析（按渠道统计）
- 漏斗分析

### 管理后台（企业级增强）
- 用户管理（CRUD、角色分配、密码重置）
- 产品管理（阶梯价格配置）
- 数据字典管理（客户来源、行业、商机阶段等可配置）
- 系统公告管理（发布、定时、优先级）
- 审批流配置（报价审批阈值、审批人设置）
- 角色权限管理（自定义角色、细粒度权限控制）
- 部门/团队管理（组织架构、层级管理）
- 消息模板管理（邮件/短信/站内通知模板）
- 系统监控（API统计、性能监控、数据库健康）
- 数据归档管理（历史数据清理策略）
- 多语言管理（翻译词条在线编辑、导入导出）
- 数据导出（客户/商机/订单/报价 JSON/CSV导出）
- 操作日志审计（全操作记录、筛选查询）
- 数据备份（手动/自动备份）

## 快速开始

```bash
# 安装依赖
npm run install:all

# 运行数据库迁移
npm run migrate

# 初始化种子数据
cd backend && npm run seed

# 启动前后端
npm run dev
```

## 默认账户

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 系统管理员 |
| manager | manager123 | 销售经理 |
| sales | sales123 | 销售代表 |

## 技术栈

- **后端**: Node.js + Express + TypeScript + PostgreSQL
- **前端**: React + TypeScript + Vite + TailwindCSS
- **测试**: Vitest + fast-check (属性测试)

## 项目结构

```
makrite-ai-crm/
├── backend/           # 后端服务
│   ├── src/
│   │   ├── db/        # 数据库连接和迁移
│   │   ├── models/    # 数据模型
│   │   ├── repositories/  # 数据访问层
│   │   ├── routes/    # API路由
│   │   ├── services/  # 业务逻辑
│   │   ├── middleware/  # 中间件
│   │   └── __tests__/ # 属性测试
│   └── scripts/       # 脚本（备份、种子数据）
├── frontend/          # 前端应用
│   ├── components/    # React组件
│   ├── services/      # API服务
│   └── contexts/      # React上下文
└── package.json       # 根目录配置
```

## API 端点

### 任务管理
- `GET /api/tasks` - 任务列表
- `GET /api/tasks/stats` - 任务统计
- `GET /api/tasks/:id` - 任务详情
- `POST /api/tasks` - 创建任务
- `PUT /api/tasks/:id` - 更新任务
- `DELETE /api/tasks/:id` - 删除任务

### 通知中心
- `GET /api/notifications` - 通知列表
- `GET /api/notifications/unread-count` - 未读数量
- `POST /api/notifications/:id/read` - 标记已读
- `POST /api/notifications/read-all` - 全部已读
- `DELETE /api/notifications/:id` - 删除通知

### 销售目标
- `GET /api/targets/my` - 我的目标
- `GET /api/targets/my/yearly` - 年度目标
- `GET /api/targets/team` - 团队目标（经理）
- `POST /api/targets/user` - 设置个人目标（经理）
- `POST /api/targets/team` - 设置团队目标（经理）

### 合同管理
- `GET /api/contracts` - 合同列表
- `GET /api/contracts/expiring` - 即将到期合同
- `POST /api/contracts` - 创建合同
- `PUT /api/contracts/:id` - 更新合同
- `DELETE /api/contracts/:id` - 删除合同

### 回款管理
- `GET /api/payments` - 回款计划列表
- `GET /api/payments/stats` - 回款统计
- `GET /api/payments/overdue` - 逾期回款
- `POST /api/payments` - 创建回款计划
- `POST /api/payments/:id/record` - 记录回款

### 竞争分析
- `GET /api/competitors` - 竞争对手列表
- `POST /api/competitors` - 添加竞争对手（经理）
- `GET /api/competitors/opportunity/:id` - 商机竞争分析
- `POST /api/competitors/opportunity/:id` - 添加商机竞争

### 客户评分与预测
- `GET /api/scoring/scores` - 客户评分列表
- `GET /api/scoring/scores/distribution` - 评分分布
- `POST /api/scoring/scores/calculate` - 计算评分（管理员）
- `GET /api/scoring/forecast/summary` - 预测摘要
- `POST /api/scoring/forecast/generate` - 生成预测

### AI智能服务
- `POST /api/ai/analyze-customer/:id` - 客户智能分析
- `POST /api/ai/predict-win-rate/:id` - 商机赢率预测
- `POST /api/ai/follow-up-suggestion` - 跟进建议生成
- `POST /api/ai/quote-suggestion` - 智能报价建议
- `POST /api/ai/contract-risk/:id` - 合同风险分析
- `POST /api/ai/query` - 自然语言查询
- `POST /api/ai/pipeline-analysis` - 销售管道分析
- `POST /api/ai/generate-email` - 生成跟进邮件
- `POST /api/ai/refine-notes` - 整理会议记录
- `POST /api/ai/ai-score/:id` - AI客户评分

### AI Agent工作流
- `POST /api/agent/workflow` - 执行自定义工作流（管理员）
- `GET /api/agent/workflow/:id` - 获取工作流状态
- `GET /api/agent/workflows` - 列出工作流历史
- `POST /api/agent/stale-customers` - 分析沉睡客户（管理员）
- `POST /api/agent/batch-suggestions` - 批量跟进建议（管理员）
- `GET /api/agent/pipeline-health` - 管道健康检查
- `POST /api/agent/auto-score` - 自动评分客户（管理员）
- `GET /api/agent/at-risk` - 风险商机识别
- `GET /api/agent/daily-summary` - 每日摘要

### 认证
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户

### 客户管理
- `GET /api/customers` - 客户列表（?type=private|public）
- `GET /api/customers/:id` - 客户详情
- `POST /api/customers` - 创建客户
- `PUT /api/customers/:id` - 更新客户
- `POST /api/customers/:id/claim` - 领取客户
- `POST /api/customers/:id/release` - 释放客户

### 联系人
- `GET /api/contacts?customer_id=` - 联系人列表
- `POST /api/contacts` - 创建联系人
- `PUT /api/contacts/:id` - 更新联系人
- `POST /api/contacts/:id/set-primary` - 设为主联系人

### 商机
- `GET /api/opportunities` - 商机列表
- `POST /api/opportunities` - 创建商机
- `PUT /api/opportunities/:id` - 更新商机
- `PUT /api/opportunities/:id/stage` - 更新阶段

### 跟进记录
- `GET /api/follow-ups?customer_id=` - 跟进列表
- `POST /api/follow-ups` - 创建跟进

### 报价单
- `GET /api/quotes` - 报价单列表
- `GET /api/quotes/:id` - 报价单详情
- `POST /api/quotes` - 创建报价单
- `POST /api/quotes/:id/approve` - 审批通过
- `POST /api/quotes/:id/reject` - 审批拒绝

### 订单
- `GET /api/orders` - 订单列表
- `POST /api/orders` - 创建订单
- `POST /api/orders/:id/payment` - 更新付款
- `POST /api/orders/:id/contract` - 上传合同

### 仪表盘
- `GET /api/dashboard/stats` - 统计数据
- `GET /api/dashboard/conversion` - 转化率
- `GET /api/dashboard/funnel` - 漏斗数据

### 管理员
- `GET /api/admin/users` - 用户列表
- `POST /api/admin/users` - 创建用户
- `PUT /api/admin/users/:id` - 更新用户
- `PUT /api/admin/users/:id/password` - 重置密码
- `DELETE /api/admin/users/:id` - 删除用户
- `GET /api/admin/products` - 产品列表
- `POST /api/admin/products` - 创建产品
- `PUT /api/admin/products/:id` - 更新产品
- `DELETE /api/admin/products/:id` - 删除产品
- `GET /api/admin/products/:id/tiers` - 获取阶梯价格
- `POST /api/admin/products/:id/tiers` - 添加阶梯价格
- `DELETE /api/admin/products/:id/tiers/:tierId` - 删除阶梯价格
- `GET /api/admin/stats` - 系统统计
- `GET /api/admin/logs` - 审批日志
- `POST /api/admin/backup` - 触发备份
- `GET /api/admin/settings` - 获取系统设置
- `PUT /api/admin/settings` - 保存系统设置

### 管理后台增强API
- `GET /api/admin/dictionaries` - 数据字典列表
- `POST /api/admin/dictionaries` - 创建字典项
- `PUT /api/admin/dictionaries/:id` - 更新字典项
- `DELETE /api/admin/dictionaries/:id` - 删除字典项
- `GET /api/admin/announcements` - 公告列表
- `POST /api/admin/announcements` - 发布公告
- `PUT /api/admin/announcements/:id` - 更新公告
- `DELETE /api/admin/announcements/:id` - 删除公告
- `GET /api/admin/approval-configs` - 审批配置列表
- `POST /api/admin/approval-configs` - 创建审批配置
- `PUT /api/admin/approval-configs/:id` - 更新审批配置
- `DELETE /api/admin/approval-configs/:id` - 删除审批配置
- `GET /api/admin/operation-logs` - 操作日志查询
- `GET /api/admin/roles` - 角色列表
- `POST /api/admin/roles` - 创建角色
- `PUT /api/admin/roles/:id` - 更新角色
- `DELETE /api/admin/roles/:id` - 删除角色
- `GET /api/admin/permissions` - 权限列表
- `GET /api/admin/roles/:id/permissions` - 获取角色权限
- `PUT /api/admin/roles/:id/permissions` - 更新角色权限
- `GET /api/admin/departments` - 部门列表
- `POST /api/admin/departments` - 创建部门
- `PUT /api/admin/departments/:id` - 更新部门
- `DELETE /api/admin/departments/:id` - 删除部门
- `GET /api/admin/templates` - 消息模板列表
- `POST /api/admin/templates` - 创建模板
- `PUT /api/admin/templates/:id` - 更新模板
- `DELETE /api/admin/templates/:id` - 删除模板
- `GET /api/admin/api-stats` - API调用统计
- `GET /api/admin/system-health` - 系统健康检查
- `GET /api/admin/archive-configs` - 归档配置列表
- `PUT /api/admin/archive-configs/:id` - 更新归档配置
- `POST /api/admin/archive/execute` - 执行数据归档
- `GET /api/admin/translations` - 翻译列表
- `POST /api/admin/translations` - 创建翻译
- `PUT /api/admin/translations/:id` - 更新翻译
- `DELETE /api/admin/translations/:id` - 删除翻译
- `POST /api/admin/translations/batch` - 批量导入翻译
- `GET /api/admin/export/:type` - 数据导出(customers/opportunities/orders/quotes)

## 数据备份

```bash
# 手动备份
cd backend && npm run backup
```

自动备份：每日凌晨 2:00 执行，保留 30 天

## 安全配置

### 环境变量
生产环境必须配置以下环境变量：

```bash
# backend/.env
JWT_SECRET=<YOUR_STRONG_SECRET_KEY_AT_LEAST_32_CHARS>
CORS_ORIGINS=https://your-domain.com
NODE_ENV=production
```

### 密码策略
- 最小长度：8位
- 必须包含：大写字母、小写字母、数字

### 请求限流
- API请求：100次/分钟
- 登录尝试：5次/5分钟

## 更新日志

### v1.4.0 (2025-12) - AI智能化升级
**AI服务层:**
- 🤖 多模型支持：Gemini、OpenAI、DeepSeek 自动切换
- 🔐 API Key后端保护：密钥不再暴露到前端
- 📊 客户智能分析：AI驱动的客户洞察
- 🎯 商机赢率预测：基于AI的成交概率预测
- 💬 跟进建议生成：智能推荐下一步行动
- 💰 智能报价建议：基于历史数据的定价策略
- ⚠️ 合同风险分析：AI识别合同风险点
- 🔍 自然语言查询：用自然语言查询CRM数据
- ⭐ AI客户评分：替代传统RFM规则评分
- 📧 跟进邮件生成：AI起草专业邮件
- 📝 会议记录整理：语音转文字结构化

**AI Agent自动化工作流:**
- 🔄 自定义工作流：组合多个AI任务
- 😴 沉睡客户分析：自动识别需激活客户
- 📋 批量跟进建议：一键生成多客户建议
- 🏥 管道健康检查：自动诊断销售管道问题
- 🎯 自动客户评分：批量AI评分并入库
- ⚡ 风险商机识别：自动预警高风险商机
- 📰 每日摘要：自动生成当日业务简报
- 🌅 晨会简报工作流：一键生成完整晨会材料

### v1.3.0 (2025-12) - 企业级管理后台增强
**方案A - 核心管理增强:**
- 📚 数据字典管理：客户来源、行业、商机阶段等可配置
- 📢 公告管理：系统公告发布、定时、优先级控制
- ⚙️ 审批流配置：报价审批阈值、审批人设置
- 📊 操作日志增强：全操作记录、多维度筛选
- 📤 数据导出：客户/商机/订单/报价 JSON/CSV导出

**方案B - 全面企业级管理:**
- 🔐 角色权限管理：自定义角色、细粒度权限控制
- 🏢 部门/团队管理：组织架构、层级管理
- 📧 消息模板管理：邮件/短信/站内通知模板配置
- 📈 系统监控：API调用统计、性能监控、数据库健康
- 🗄️ 数据归档管理：历史数据清理策略、自动归档
- 🌐 多语言管理：翻译词条在线编辑、JSON导入导出

### v1.2.0 (2025-12) - 方案A核心业务增强
**P0 优先级:**
- ✅ 任务管理：待办事项、跟进提醒、任务统计
- 🔔 通知中心：站内通知、审批提醒、实时未读数
- 🎯 销售目标：个人/团队目标设定、完成率追踪

**P1 优先级:**
- 📄 合同管理：合同全生命周期、到期提醒
- 💰 回款管理：回款计划、逾期预警、回款统计
- 🏆 竞争分析：竞争对手库、商机竞争分析

**P2 优先级:**
- ⭐ 客户评分：RFM模型、客户分级(A/B/C/D)
- 📈 销售预测：基于漏斗的收入预测

### v1.1.0 (2025-12)
- 🔒 安全增强：JWT密钥强制验证、CORS白名单、请求限流
- 🛡️ SQL注入防护：参数化查询、表名/字段名白名单验证
- 🔑 密码强度验证：8位+大小写+数字
- 🎯 前端错误边界：防止白屏崩溃
- 📊 Dashboard真实数据：对接后端API
- 🏗️ 代码重构：CustomerList拆分为子组件
- 📝 类型统一：前后端枚举值保持一致
