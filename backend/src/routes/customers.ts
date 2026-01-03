import { Router, Response } from 'express';
import { customerRepository } from '../repositories/CustomerRepository.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { UserRole } from '../types/index.js';

const router = Router();
router.use(authMiddleware); // 所有路由需要认证

router.get('/', async (req: AuthRequest, res: Response) => { // 获取客户列表
  try {
    const { type = 'private', limit = 100, offset = 0 } = req.query;
    let customers;
    if (type === 'public') {
      customers = await customerRepository.findPublicPool(Number(limit), Number(offset));
    } else {
      customers = await customerRepository.findByOwner(req.user!.userId, Number(limit), Number(offset));
    }
    customers = customerRepository.maskPhoneForRole(customers, req.user!.role as UserRole);
    return res.json(customers);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => { // 获取单个客户
  try {
    const customer = await customerRepository.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'NOT_FOUND', message: '客户不存在' });
    return res.json(customer);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

router.get('/:id/detail', async (req: AuthRequest, res: Response) => { // 获取客户360度视图
  try {
    const customer = await customerRepository.findWithRelations(req.params.id);
    if (!customer) return res.status(404).json({ error: 'NOT_FOUND', message: '客户不存在' });
    return res.json(customer);
  } catch (error) {
    console.error('Get customer detail error:', error);
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

router.post('/batch-claim', async (req: AuthRequest, res: Response) => { // 批量领取
  try {
    const { ids } = req.body;
    if (!ids?.length) return res.status(400).json({ error: 'VALIDATION_ERROR', message: '请选择客户' });
    const count = await customerRepository.countByOwner(req.user!.userId);
    const available = 50 - count;
    let success = 0, failed = 0;
    for (const id of ids.slice(0, available)) {
      const result = await customerRepository.claimCustomer(id, req.user!.userId);
      result ? success++ : failed++;
    }
    failed += Math.max(0, ids.length - available);
    return res.json({ success, failed });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

router.post('/batch-release', async (req: AuthRequest, res: Response) => { // 批量释放
  try {
    const { ids, reason } = req.body;
    if (!ids?.length) return res.status(400).json({ error: 'VALIDATION_ERROR', message: '请选择客户' });
    let success = 0, failed = 0;
    for (const id of ids) {
      const result = await customerRepository.releaseCustomerByOwner(id, req.user!.userId, req.user!.role as UserRole, reason); // 验证owner权限
      result ? success++ : failed++;
    }
    return res.json({ success, failed });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

router.post('/check-duplicate', async (req: AuthRequest, res: Response) => { // 查重
  try {
    const { company_name, phone } = req.body;
    const result = await customerRepository.checkDuplicate(company_name, phone);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

router.post('/batch-import', async (req: AuthRequest, res: Response) => { // 批量导入客户
  try {
    const { customers } = req.body;
    if (!Array.isArray(customers) || !customers.length) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: '无有效数据' });
    }
    let success = 0, failed = 0;
    const errors: string[] = [];
    for (const row of customers) {
      const { company_name, contact_name, contact_role, email, phone, industry, region, source } = row;
      if (!company_name) { failed++; errors.push(`第${success + failed + 1}行: 公司名为空`); continue; }
      if (phone) { // 有电话时检查重复
        const dup = await customerRepository.checkDuplicate(company_name, phone);
        if (dup.exists) { failed++; errors.push(`${company_name}: 已存在`); continue; }
      } else { // 无电话时只检查公司名
        const companyDup = await customerRepository.checkDuplicate(company_name, '');
        if (companyDup.exists && companyDup.field === 'company_name') { failed++; errors.push(`${company_name}: 公司已存在`); continue; }
      }
      try {
        await customerRepository.createWithContact({ company_name, contact_name: contact_name || '', phone: phone || '', email: email || '', industry: industry || '', region: region || '', source: source || undefined, contact_role: contact_role || '' }, req.user!.userId);
        success++;
      } catch { failed++; errors.push(`${company_name}: 创建失败`); }
    }
    return res.json({ success, failed, errors: errors.slice(0, 10) });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '导入失败' });
  }
});

router.get('/export', async (req: AuthRequest, res: Response) => { // 导出客户数据
  try {
    const { type = 'private' } = req.query;
    let customers;
    if (type === 'public') {
      customers = await customerRepository.findPublicPool(1000, 0);
    } else if (type === 'all' && req.user!.role === 'admin') {
      customers = await customerRepository.findAll();
    } else {
      customers = await customerRepository.findByOwner(req.user!.userId, 1000, 0);
    }
    return res.json(customers);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '导出失败' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => { // 创建客户
  try {
    const { company_name, contact_name, phone, email, industry, region, source, contact_role } = req.body;
    if (!company_name || !contact_name || !phone) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: '公司名、联系人、电话为必填' });
    }
    const dup = await customerRepository.checkDuplicate(company_name, phone);
    if (dup.exists) return res.status(409).json({ error: 'DUPLICATE', field: dup.field, message: '客户已存在' });
    
    const customer = await customerRepository.createWithContact(
      { company_name, contact_name, phone, email, industry, region, source, contact_role },
      req.user!.userId
    );
    return res.status(201).json(customer);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});


router.post('/:id/claim', async (req: AuthRequest, res: Response) => { // 领取客户
  try {
    const count = await customerRepository.countByOwner(req.user!.userId);
    if (count >= 50) return res.status(400).json({ error: 'LIMIT_EXCEEDED', message: '私海客户已达上限50个' });
    const customer = await customerRepository.claimCustomer(req.params.id, req.user!.userId);
    if (!customer) return res.status(400).json({ error: 'CLAIM_FAILED', message: '领取失败，客户可能已被领取' });
    return res.json(customer);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

router.post('/:id/release', async (req: AuthRequest, res: Response) => { // 释放客户到公海
  try {
    const customer = await customerRepository.releaseCustomerByOwner(req.params.id, req.user!.userId, req.user!.role as UserRole, req.body.reason); // 验证owner权限
    if (!customer) return res.status(404).json({ error: 'FORBIDDEN', message: '客户不存在或无权限释放' });
    return res.json(customer);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => { // 更新客户
  try {
    const { company_name, industry, region, source, last_contact_date } = req.body; // 只取有效字段
    const updateData: Record<string, any> = {};
    if (company_name) updateData.company_name = company_name;
    if (industry) updateData.industry = industry;
    if (region) updateData.region = region;
    if (source) updateData.source = source;
    if (last_contact_date) updateData.last_contact_date = last_contact_date;
    if (Object.keys(updateData).length === 0) return res.status(400).json({ error: 'VALIDATION_ERROR', message: '无有效更新字段' });
    const customer = await customerRepository.update(req.params.id, updateData);
    if (!customer) return res.status(404).json({ error: 'NOT_FOUND', message: '客户不存在' });
    return res.json(customer);
  } catch (error) {
    console.error('Update customer error:', error);
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

router.get('/:id/check-relations', async (req: AuthRequest, res: Response) => { // 检查客户关联数据
  try {
    const result = await customerRepository.checkRelations(req.params.id);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => { // 删除客户
  try {
    const { force } = req.query;
    const result = await customerRepository.deleteCustomerByOwner(req.params.id, req.user!.userId, req.user!.role as UserRole, force === 'true'); // 验证owner权限
    if (result === 'forbidden') return res.status(403).json({ error: 'FORBIDDEN', message: '无权限删除此客户' });
    if (!result) return res.status(400).json({ error: 'HAS_RELATIONS', message: '客户存在关联的商机、报价或订单，无法删除' });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

router.post('/batch-delete', async (req: AuthRequest, res: Response) => { // 批量删除客户
  try {
    const { ids, force } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'VALIDATION_ERROR', message: '请选择客户' });
    let success = 0, failed = 0;
    const errors: string[] = [];
    for (const id of ids) {
      try {
        const result = await customerRepository.deleteCustomerByOwner(id, req.user!.userId, req.user!.role as UserRole, force === true); // 验证owner权限
        if (result === 'forbidden') { failed++; errors.push(`ID ${id}: 无权限删除`); }
        else if (result) { success++; } else { failed++; errors.push(`ID ${id}: 存在关联数据`); }
      } catch { failed++; }
    }
    return res.json({ success, failed, errors: errors.slice(0, 5) });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '批量删除失败' });
  }
});

export default router;
