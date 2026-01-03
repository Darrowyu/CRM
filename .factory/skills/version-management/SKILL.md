---
name: version-management
description: 在提交和推送代码时自动更新版本号。当用户请求 git commit/push 操作时使用。
---

## 版本管理 Skill

### 概述

本项目使用语义化版本控制（SemVer），在提交时自动更新版本号。版本信息显示在前端侧边栏底部。

### 版本来源

- **主要来源**: `/package.json` - 版本号唯一真实来源
- **API 接口**: `GET /api/system/version` - 返回版本号 + Git 信息

### 版本更新规则

#### 何时更新版本

| 变更类型 | 版本升级 | 示例 |
|----------|----------|------|
| Bug 修复、小改动 | `patch` | 2.1.0 -> 2.1.1 |
| 新功能、增强功能 | `minor` | 2.1.0 -> 2.2.0 |
| 破坏性变更、大重构 | `major` | 2.1.0 -> 3.0.0 |

#### 自动版本更新流程

**在创建提交之前**，判断是否需要更新版本：

1. **分析变更** - 使用 `git diff --cached` 查看暂存的文件
2. **确定升级类型**：
   - `patch`: Bug 修复、拼写修正、依赖更新、小重构
   - `minor`: 新功能、新 API 端点、新 UI 组件
   - `major`: 破坏性 API 变更、数据库结构变更、大规模重写
3. **更新版本** - 修改 `/package.json`
4. **将版本变更包含在提交中**

### 版本更新命令

```bash
# 更新补丁版本 (2.1.0 -> 2.1.1)
npm version patch --no-git-tag-version

# 更新次版本 (2.1.0 -> 2.2.0)
npm version minor --no-git-tag-version

# 更新主版本 (2.1.0 -> 3.0.0)
npm version major --no-git-tag-version
```

注意: 使用 `--no-git-tag-version` 防止 npm 自动创建提交。

### 执行步骤

当用户请求 commit/push 时：

```
1. 执行: git diff --cached --name-only
2. 分析变更文件，确定版本升级类型
3. 如需更新版本:
   - 执行: npm version <patch|minor|major> --no-git-tag-version
   - 暂存更新的文件: git add package.json
4. 创建描述性的提交信息
5. 如果请求则推送
```

### 版本显示位置

版本信息显示在：
- **侧边栏底部**: 显示 `v{version}` 和 `{gitCommit}`
- **API 响应**: 完整版本详情 `/api/system/version`

### API 响应格式

```json
{
  "success": true,
  "data": {
    "version": "2.1.0",
    "name": "makrite-application-system",
    "gitCommit": "c17584d",
    "gitBranch": "develop",
    "buildTime": "2025-12-29T10:30:00Z",
    "nodeVersion": "v20.10.0",
    "environment": "development"
  }
}
```

### 提交信息格式

版本升级时在提交信息中包含版本号：

```
feat: 添加用户导出功能

- 添加用户列表 Excel 导出
- 添加 CSV 导出选项
- 更新 API 文档

Version: 2.2.0 (minor)

Co-authored-by: factory-droid[bot] <138933559+factory-droid[bot]@users.noreply.github.com>
```

### 跳过版本更新的情况

以下变更不需要更新版本：
- 纯文档变更（README、注释）
- 仅测试文件变更
- CI/CD 配置变更
- Git 忽略/配置文件变更

### 相关文件位置

```
/package.json                              # 版本来源（根目录）
/backend/routes/system/versionRoutes.js    # 版本 API 端点
/frontend/components/common/Sidebar.js     # 版本显示组件
```
