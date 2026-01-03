import { Request, Response, NextFunction } from 'express';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isValidUUID = (id: string): boolean => UUID_REGEX.test(id);

export const validateUUID = (paramName = 'id') => (req: Request, res: Response, next: NextFunction): void => {
  const id = req.params[paramName];
  if (!id || !isValidUUID(id)) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: `无效的${paramName}格式` });
    return;
  }
  next();
};

export const validateAmount = (value: number | string | undefined, fieldName: string): { valid: boolean; message?: string } => {
  if (value === undefined || value === null || value === '') return { valid: true };
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return { valid: false, message: `${fieldName}必须是数字` };
  if (num < 0) return { valid: false, message: `${fieldName}不能为负数` };
  return { valid: true };
};

export const validateDate = (value: string | undefined, fieldName: string, options?: { allowPast?: boolean; allowFuture?: boolean }): { valid: boolean; message?: string } => {
  if (!value) return { valid: true };
  const date = new Date(value);
  if (isNaN(date.getTime())) return { valid: false, message: `${fieldName}日期格式无效` };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (options?.allowPast === false && date < today) return { valid: false, message: `${fieldName}不能是过去日期` };
  if (options?.allowFuture === false && date > today) return { valid: false, message: `${fieldName}不能是未来日期` };
  return { valid: true };
};

export const validateDateRange = (startDate: string | undefined, endDate: string | undefined): { valid: boolean; message?: string } => {
  if (!startDate || !endDate) return { valid: true };
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return { valid: false, message: '日期格式无效' };
  if (end < start) return { valid: false, message: '结束日期不能早于开始日期' };
  return { valid: true };
};

export const validateStringLength = (value: string | undefined, fieldName: string, maxLength: number): { valid: boolean; message?: string } => {
  if (!value) return { valid: true };
  if (value.length > maxLength) return { valid: false, message: `${fieldName}不能超过${maxLength}个字符` };
  return { valid: true };
};

export const validateRequired = (fields: Record<string, any>, required: string[]): { valid: boolean; message?: string } => {
  for (const field of required) {
    if (fields[field] === undefined || fields[field] === null || fields[field] === '') {
      return { valid: false, message: `${field}为必填项` };
    }
  }
  return { valid: true };
};
