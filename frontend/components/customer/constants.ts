export const REGION_COUNTRIES: Record<string, { value: string; label: string }[]> = { // 市场区域-国家映射
  asia: [{ value: 'CN', label: '中国' }, { value: 'JP', label: '日本' }, { value: 'KR', label: '韩国' }, { value: 'SG', label: '新加坡' }, { value: 'MY', label: '马来西亚' }, { value: 'TH', label: '泰国' }, { value: 'VN', label: '越南' }, { value: 'ID', label: '印度尼西亚' }, { value: 'IN', label: '印度' }, { value: 'TW', label: '台湾' }, { value: 'HK', label: '香港' }],
  europe: [{ value: 'DE', label: '德国' }, { value: 'FR', label: '法国' }, { value: 'GB', label: '英国' }, { value: 'IT', label: '意大利' }, { value: 'ES', label: '西班牙' }, { value: 'NL', label: '荷兰' }],
  north_america: [{ value: 'US', label: '美国' }, { value: 'CA', label: '加拿大' }, { value: 'MX', label: '墨西哥' }],
  south_america: [{ value: 'BR', label: '巴西' }, { value: 'AR', label: '阿根廷' }, { value: 'CL', label: '智利' }],
  oceania: [{ value: 'AU', label: '澳大利亚' }, { value: 'NZ', label: '新西兰' }],
  middle_east: [{ value: 'AE', label: '阿联酋' }, { value: 'SA', label: '沙特阿拉伯' }, { value: 'TR', label: '土耳其' }],
  africa: [{ value: 'ZA', label: '南非' }, { value: 'NG', label: '尼日利亚' }],
};

export const MARKET_REGIONS = [{ value: 'asia', label: '亚洲' }, { value: 'europe', label: '欧洲' }, { value: 'north_america', label: '北美' }, { value: 'south_america', label: '南美' }, { value: 'oceania', label: '大洋洲' }, { value: 'middle_east', label: '中东' }, { value: 'africa', label: '非洲' }];
export const SOURCE_OPTIONS = [{ value: 'website', label: '官网' }, { value: 'exhibition', label: '展会' }, { value: 'referral', label: '转介绍' }, { value: 'other', label: '其他' }];
export const SOURCE_MAP: Record<string, string> = { website: '官网', exhibition: '展会', referral: '转介绍', other: '其他' };
export const INDUSTRY_OPTIONS = [{ value: '制造业', label: '制造业' }, { value: '医疗', label: '医疗' }, { value: '零售', label: '零售' }, { value: '科技', label: '科技' }, { value: '贸易', label: '贸易' }, { value: '物流', label: '物流' }];
export const FOLLOW_TYPE_OPTIONS = [{ value: 'call', label: '电话' }, { value: 'visit', label: '拜访' }, { value: 'email', label: '邮件' }, { value: 'other', label: '其他' }];
export const FOLLOW_TYPE_MAP: Record<string, string> = { call: '电话', visit: '拜访', email: '邮件', other: '其他' };
export const STAGE_MAP: Record<string, string> = { prospecting: '初步接触', qualification: '需求确认', proposal: '方案报价', negotiation: '商务谈判', closed_won: '成交', closed_lost: '丢单' };
export const MARKET_REGION_MAP: Record<string, string> = { asia: '亚洲', europe: '欧洲', north_america: '北美', south_america: '南美', oceania: '大洋洲', middle_east: '中东', africa: '非洲' };

export const getRegionLabel = (code?: string): string => { // 国家代码转中文
  if (!code) return '-';
  for (const countries of Object.values(REGION_COUNTRIES)) {
    const found = countries.find(c => c.value === code);
    if (found) return found.label;
  }
  return code;
};

export const getMarketByCountry = (code?: string): string => { // 根据国家获取市场区域
  if (!code) return '';
  for (const [market, countries] of Object.entries(REGION_COUNTRIES)) {
    if (countries.some(c => c.value === code)) return market;
  }
  return '';
};

export const getCountryCode = (label?: string): string => { // 中文国家名转代码
  if (!label) return '';
  for (const countries of Object.values(REGION_COUNTRIES)) {
    const found = countries.find(c => c.label === label);
    if (found) return found.value;
  }
  return label;
};
