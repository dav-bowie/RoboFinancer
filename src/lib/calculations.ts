// Tax calculation utilities for RoboFinancer

import { IRS_401K_ELECTIVE_DEFERRAL_2026 } from "./contributionLimits";
import { calcFullBreakdown } from "../utils/taxEngine";
import {
  FEDERAL_BRACKETS_MARRIED_2024,
  FEDERAL_BRACKETS_SINGLE_2024,
} from "../data/taxBrackets";

export interface TaxBreakdown {
  gross: number;
  federalTax: number;
  stateTax: number;
  socialSecurity: number;
  medicare: number;
  retirement401k: number;
  caSDI?: number;
  netTakeHome: number;
}

export function calcTakeHome(
  gross: number,
  filingStatus: 'single' | 'married',
  stateCode: string,
  retirementRate: number,
  retirementType: 'traditional' | 'roth' = 'traditional',
  hsaContrib: number = 0,
  k401Limit: number = IRS_401K_ELECTIVE_DEFERRAL_2026,
): TaxBreakdown {
  const contribution401k = Math.min(gross * (retirementRate / 100), k401Limit, gross);
  const traditional401k = retirementType === 'traditional' ? contribution401k : 0;
  const roth401k = retirementType === 'roth' ? contribution401k : 0;

  const result = calcFullBreakdown({
    gross,
    filingStatus,
    state: stateCode,
    traditional401k,
    roth401k,
    hsaContrib,
  });

  return {
    gross: result.gross,
    federalTax: result.federalTax,
    stateTax: result.stateTax,
    socialSecurity: result.socialSecurity,
    medicare: result.medicare,
    retirement401k: contribution401k,
    caSDI: result.sdi,
    netTakeHome: result.netTakeHome,
  };
}

// Market compensation data (total comp) by role and level
export interface MarketData {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

const BASE_MARKET_DATA: Record<string, Record<string, MarketData>> = {
  'Software Engineer': {
    'L3 / Junior': { p25: 110000, p50: 135000, p75: 162000, p90: 192000 },
    'L4 / Mid-Level': { p25: 148000, p50: 178000, p75: 212000, p90: 248000 },
    'L5 / Senior': { p25: 198000, p50: 242000, p75: 288000, p90: 340000 },
    'L6 / Staff': { p25: 265000, p50: 322000, p75: 385000, p90: 465000 },
    'L7 / Principal': { p25: 340000, p50: 425000, p75: 520000, p90: 640000 },
    'L8 / Distinguished': { p25: 480000, p50: 600000, p75: 750000, p90: 950000 },
  },
  'Product Manager': {
    'APM': { p25: 108000, p50: 130000, p75: 158000, p90: 188000 },
    'PM': { p25: 145000, p50: 178000, p75: 215000, p90: 258000 },
    'Senior PM': { p25: 192000, p50: 235000, p75: 280000, p90: 335000 },
    'Group PM / PM II': { p25: 255000, p50: 310000, p75: 370000, p90: 445000 },
    'Director of Product': { p25: 320000, p50: 395000, p75: 470000, p90: 565000 },
  },
  'Data Scientist': {
    'Junior': { p25: 102000, p50: 125000, p75: 150000, p90: 178000 },
    'Mid-Level': { p25: 138000, p50: 168000, p75: 200000, p90: 238000 },
    'Senior': { p25: 182000, p50: 222000, p75: 265000, p90: 315000 },
    'Staff / Lead': { p25: 238000, p50: 292000, p75: 350000, p90: 420000 },
    'Principal': { p25: 305000, p50: 380000, p75: 458000, p90: 555000 },
  },
  'Designer': {
    'Junior': { p25: 78000, p50: 95000, p75: 115000, p90: 138000 },
    'Mid-Level': { p25: 108000, p50: 132000, p75: 158000, p90: 190000 },
    'Senior': { p25: 148000, p50: 180000, p75: 215000, p90: 255000 },
    'Staff / Lead': { p25: 195000, p50: 238000, p75: 285000, p90: 340000 },
    'Principal': { p25: 252000, p50: 308000, p75: 368000, p90: 445000 },
  },
  'Engineering Manager': {
    'Manager L1': { p25: 195000, p50: 240000, p75: 288000, p90: 345000 },
    'Senior Manager': { p25: 255000, p50: 312000, p75: 375000, p90: 450000 },
    'Director of Engineering': { p25: 325000, p50: 400000, p75: 480000, p90: 580000 },
    'VP of Engineering': { p25: 425000, p50: 530000, p75: 650000, p90: 800000 },
  },
  'Data Engineer': {
    'Junior': { p25: 98000, p50: 120000, p75: 145000, p90: 172000 },
    'Mid-Level': { p25: 132000, p50: 160000, p75: 192000, p90: 228000 },
    'Senior': { p25: 175000, p50: 212000, p75: 255000, p90: 302000 },
    'Staff / Lead': { p25: 228000, p50: 278000, p75: 332000, p90: 398000 },
  },
  'DevOps / SRE': {
    'Junior': { p25: 100000, p50: 122000, p75: 148000, p90: 175000 },
    'Mid-Level': { p25: 135000, p50: 165000, p75: 198000, p90: 235000 },
    'Senior': { p25: 180000, p50: 218000, p75: 260000, p90: 308000 },
    'Staff / Lead': { p25: 235000, p50: 285000, p75: 340000, p90: 408000 },
  },
};

// City multipliers relative to national average
export const CITY_MULTIPLIERS: Record<string, number> = {
  'San Francisco, CA': 1.38,
  'San Jose, CA': 1.32,
  'New York, NY': 1.28,
  'Seattle, WA': 1.20,
  'Boston, MA': 1.12,
  'Los Angeles, CA': 1.10,
  'San Diego, CA': 1.05,
  'Austin, TX': 0.98,
  'Denver, CO': 0.97,
  'Chicago, IL': 1.00,
  'Atlanta, GA': 0.88,
  'Miami, FL': 0.90,
  'Dallas, TX': 0.92,
  'Portland, OR': 1.02,
  'Washington, DC': 1.15,
  'Raleigh, NC': 0.85,
  'Phoenix, AZ': 0.88,
  'Nashville, TN': 0.87,
  'Minneapolis, MN': 0.95,
  'Remote': 1.00,
};

export const COST_OF_LIVING_INDEX: Record<string, number> = {
  'San Francisco, CA': 190,
  'San Jose, CA': 178,
  'New York, NY': 185,
  'Seattle, WA': 155,
  'Boston, MA': 162,
  'Los Angeles, CA': 168,
  'San Diego, CA': 162,
  'Austin, TX': 128,
  'Denver, CO': 138,
  'Chicago, IL': 118,
  'Atlanta, GA': 108,
  'Miami, FL': 125,
  'Dallas, TX': 115,
  'Portland, OR': 145,
  'Washington, DC': 158,
  'Raleigh, NC': 108,
  'Phoenix, AZ': 110,
  'Nashville, TN': 115,
  'Minneapolis, MN': 120,
  'Remote': 100,
};

export function getMarketData(role: string, level: string, city: string): MarketData | null {
  const roleData = BASE_MARKET_DATA[role];
  if (!roleData) return null;
  const baseData = roleData[level];
  if (!baseData) return null;
  const multiplier = CITY_MULTIPLIERS[city] || 1.0;
  return {
    p25: Math.round(baseData.p25 * multiplier),
    p50: Math.round(baseData.p50 * multiplier),
    p75: Math.round(baseData.p75 * multiplier),
    p90: Math.round(baseData.p90 * multiplier),
  };
}

export function getPercentile(totalComp: number, marketData: MarketData): number {
  if (totalComp <= marketData.p25) {
    return Math.round((totalComp / marketData.p25) * 25);
  } else if (totalComp <= marketData.p50) {
    const fraction = (totalComp - marketData.p25) / (marketData.p50 - marketData.p25);
    return Math.round(25 + fraction * 25);
  } else if (totalComp <= marketData.p75) {
    const fraction = (totalComp - marketData.p50) / (marketData.p75 - marketData.p50);
    return Math.round(50 + fraction * 25);
  } else if (totalComp <= marketData.p90) {
    const fraction = (totalComp - marketData.p75) / (marketData.p90 - marketData.p75);
    return Math.round(75 + fraction * 15);
  } else {
    return Math.min(99, Math.round(90 + ((totalComp - marketData.p90) / marketData.p90) * 9));
  }
}

export function getMarginalBracket(taxableIncome: number, filingStatus: 'single' | 'married'): string {
  const brackets = filingStatus === 'married' ? FEDERAL_BRACKETS_MARRIED_2024 : FEDERAL_BRACKETS_SINGLE_2024;
  for (const { limit, rate } of brackets) {
    if (taxableIncome <= limit) return `${(rate * 100).toFixed(0)}%`;
  }
  return '37%';
}

export const ROLES = Object.keys(BASE_MARKET_DATA);

export const LEVELS_BY_ROLE: Record<string, string[]> = Object.fromEntries(
  Object.entries(BASE_MARKET_DATA).map(([role, levels]) => [role, Object.keys(levels)])
);

export const CITIES = Object.keys(CITY_MULTIPLIERS);

export const STATE_OPTIONS = [
  { code: 'CA', name: 'California' },
  { code: 'NY', name: 'New York' },
  { code: 'WA', name: 'Washington' },
  { code: 'TX', name: 'Texas' },
  { code: 'FL', name: 'Florida' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'IL', name: 'Illinois' },
  { code: 'CO', name: 'Colorado' },
  { code: 'GA', name: 'Georgia' },
  { code: 'OR', name: 'Oregon' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'NV', name: 'Nevada' },
  { code: 'DC', name: 'Washington, DC' },
  { code: 'UT', name: 'Utah' },
  { code: 'MI', name: 'Michigan' },
  { code: 'VA', name: 'Virginia' },
  { code: 'MD', name: 'Maryland' },
];

export function fmt(n: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}
