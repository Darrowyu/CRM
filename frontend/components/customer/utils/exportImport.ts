import ExcelJS from 'exceljs';
import dayjs from 'dayjs';
import api from '../../../services/api';
import { Customer } from '../../../services/customerService';
import { SOURCE_MAP, MARKET_REGION_MAP, getMarketByCountry, getRegionLabel, getCountryCode } from '../constants';

// CSV解析，处理引号和逗号
export const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; } // 转义引号
      else inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

// 导出模板
export const exportTemplate = async (t: (key: string) => string): Promise<void> => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(t('cust_import_customer'));
  ws.addRow([t('cust_company'), t('cust_contact'), t('cust_role'), t('cust_email'), t('cust_phone'), t('cust_industry'), t('cust_market_region'), t('cust_country'), t('cust_source')]);
  ws.addRow(['Example Co.', 'John', 'Manager', 'test@example.com', '13800138000', 'Manufacturing', 'Asia', 'China', 'Exhibition']);
  ws.columns = [{ width: 22 }, { width: 12 }, { width: 14 }, { width: 28 }, { width: 16 }, { width: 12 }, { width: 12 }, { width: 14 }, { width: 12 }];
  ws.getRow(1).font = { bold: true };
  for (let i = 2; i <= 500; i++) {
    ws.getCell(`F${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"制造业,医疗,零售,科技,贸易,物流"'] };
    ws.getCell(`G${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"亚洲,欧洲,北美,南美,大洋洲,中东,非洲"'] };
    ws.getCell(`I${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"官网,展会,转介绍,其他"'] };
  }
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${t('cust_download_template')}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
};

// 导出客户数据
export const exportCustomerData = async (view: 'private' | 'public_pool', t: (key: string) => string): Promise<{ success: boolean; count: number }> => {
  const { data } = await api.get(`/customers/export?type=${view}`);
  const headers = [t('cust_company'), t('cust_contact'), t('cust_role'), t('cust_email'), t('cust_phone'), t('cust_industry'), t('cust_market_region'), t('cust_country'), t('cust_source')];
  const rows = data.map((c: Customer) => {
    const contact = c.contacts?.[0] || { name: '', role: '', email: '', phone: '' };
    const market = getMarketByCountry(c.region);
    return [c.company_name, contact.name || '', contact.role || '', contact.email || '', contact.phone || '', c.industry || '', MARKET_REGION_MAP[market] || '', getRegionLabel(c.region), SOURCE_MAP[c.source || ''] || ''].map(v => `"${v}"`).join(',');
  });
  const csv = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${t('cust_export_list')}_${dayjs().format('YYYYMMDD')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  return { success: true, count: data.length };
};

export interface ImportRow {
  key: number;
  company_name: string;
  contact_name: string;
  contact_role: string;
  email: string;
  phone: string;
  industry: string;
  source: string;
  market_region: string;
  region: string;
}

// 解析导入数据
export const parseImportData = (headers: string[], rows: string[][], t: (key: string) => string): { data: ImportRow[] | null; error: string | null } => {
  const colMap: Record<string, number> = {};
  ['公司', '联系人', '职位', '邮箱', '电话', '行业', '市场区域', '国家/地区', '来源'].forEach(h => {
    const idx = headers.indexOf(h);
    if (idx >= 0) colMap[h] = idx;
  });
  if (colMap['公司'] === undefined) {
    return { data: null, error: t('cust_missing_company') };
  }
  const parsed = rows.map((cols, idx) => {
    const getValue = (key: string) => (colMap[key] !== undefined ? (cols[colMap[key]] || '') : '').toString().trim();
    const regionLabel = getValue('国家/地区');
    const sourceLabel = getValue('来源');
    const sourceCode = Object.entries(SOURCE_MAP).find(([, v]) => v === sourceLabel)?.[0] || '';
    return {
      key: idx,
      company_name: getValue('公司'),
      contact_name: getValue('联系人'),
      contact_role: getValue('职位'),
      email: getValue('邮箱'),
      phone: getValue('电话'),
      industry: getValue('行业'),
      source: sourceCode,
      market_region: getValue('市场区域'),
      region: getCountryCode(regionLabel)
    };
  }).filter(r => r.company_name);
  if (!parsed.length) {
    return { data: null, error: t('cust_no_valid_data') };
  }
  return { data: parsed, error: null };
};

// 解析Excel文件
export const parseExcelFile = async (file: File, t: (key: string) => string): Promise<{ data: ImportRow[] | null; error: string | null }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(evt.target?.result as ArrayBuffer);
        const ws = wb.worksheets[0];
        const rows: string[][] = [];
        ws.eachRow((row) => {
          const vals = row.values as (string | number | null | undefined)[];
          rows.push(vals.slice(1).map(v => (v ?? '').toString()));
        });
        if (rows.length < 2) {
          resolve({ data: null, error: t('cust_file_empty') });
          return;
        }
        resolve(parseImportData(rows[0], rows.slice(1), t));
      } catch {
        resolve({ data: null, error: t('cust_import_failed') });
      }
    };
    reader.readAsArrayBuffer(file);
  });
};

// 解析CSV文件
export const parseCSVFile = (file: File, t: (key: string) => string): Promise<{ data: ImportRow[] | null; error: string | null }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        let text = evt.target?.result as string;
        text = text.replace(/^\uFEFF/, '');
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) {
          resolve({ data: null, error: t('cust_file_empty') });
          return;
        }
        resolve(parseImportData(parseCSVLine(lines[0]), lines.slice(1).map(line => parseCSVLine(line)), t));
      } catch {
        resolve({ data: null, error: t('cust_import_failed') });
      }
    };
    reader.readAsText(file, 'UTF-8');
  });
};

// 执行导入
export const importCustomers = async (data: ImportRow[]): Promise<{ success: number; failed: number; errors?: string[] }> => {
  const { data: result } = await api.post('/customers/batch-import', { customers: data });
  return result;
};
