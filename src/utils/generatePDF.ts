/**
 * generatePDF.ts — Client-side PDF export for RoboFinancer
 * Uses jsPDF (v4) + jspdf-autotable (v5). Runs entirely in the browser.
 * No server calls. Triggers browser download automatically.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ReportData {
  reportName: string;
  reportDate: string;

  grossSalary: number;
  filingStatus: string;
  state: string;

  trad401k: number;
  employerMatch: number;
  rothIRA: number;

  federalAGI: number;
  standardDeduction: number;
  federalTaxableIncome: number;
  federalTax: number;
  socialSecurity: number;
  medicare: number;
  stateTax: number;
  caSDI: number;
  totalTaxes: number;
  annualTakeHome: number;

  monthlyTakeHome: number;
  rent: number;
  groceries: number;
  commute: number;
  otherFixed: number;

  effectiveFederalRate: number;
  effectiveTotalRate: number;
  marginalBracket: string;
  monthlySurplus: number;
  totalToRetirement: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

// RGB tuples
type RGB = [number, number, number];
const C = {
  emerald:  [16, 185, 129]   as RGB,
  coral:    [181, 69, 27]    as RGB,  // #B5451B — deductions
  green:    [10, 92, 54]     as RGB,  // #0A5C36 — positive/take-home
  greenBg:  [240, 251, 245]  as RGB,  // #F0FBF5
  blue:     [29, 78, 216]    as RGB,  // #1D4ED8
  purple:   [124, 58, 237]   as RGB,  // #7C3AED
  teal:     [20, 184, 166]   as RGB,
  text:     [26, 26, 26]     as RGB,
  muted:    [102, 102, 102]  as RGB,
  border:   [220, 220, 220]  as RGB,
  lightGray:[245, 245, 245]  as RGB,
  white:    [255, 255, 255]  as RGB,
};

// ── Section header helper ─────────────────────────────────────────────────────

function sectionHeader(doc: jsPDF, label: string, x: number, y: number, w: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  doc.text(label, x, y);
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(x, y + 2, x + w, y + 2);
  return y + 7;
}

// ── Cards helper ──────────────────────────────────────────────────────────────

function drawCards(
  doc: jsPDF,
  cards: Array<{ label: string; value: string; sub: string; color: RGB }>,
  x: number,
  y: number,
  totalW: number,
  cardH: number,
  cols: number,
): number {
  const gap = 4;
  const cardW = (totalW - gap * (cols - 1)) / cols;
  const rows = Math.ceil(cards.length / cols);

  cards.forEach((card, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = x + col * (cardW + gap);
    const cy = y + row * (cardH + gap);

    doc.setFillColor(...C.lightGray);
    doc.roundedRect(cx, cy, cardW, cardH, 2, 2, 'F');
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.2);
    doc.roundedRect(cx, cy, cardW, cardH, 2, 2, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.text(card.label, cx + 3.5, cy + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...card.color);
    doc.text(card.value, cx + 3.5, cy + 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.muted);
    doc.text(card.sub, cx + 3.5, cy + 18.5, { maxWidth: cardW - 5 });
  });

  return y + rows * (cardH + gap) + 2;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function generateFinancialReport(data: ReportData): void {
  const doc = new jsPDF({ format: 'letter', orientation: 'portrait', unit: 'mm' });

  const PAGE_W = 215.9;
  const ML = 15;
  const MR = 15;
  const CW = PAGE_W - ML - MR; // 185.9 mm

  // ═══════════════════════════════════════════════════════
  // PAGE 1
  // ═══════════════════════════════════════════════════════
  let y = 15;

  // ── Header ─────────────────────────────────────────────
  doc.setFillColor(...C.emerald);
  doc.roundedRect(ML, y, 7, 7, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...C.text);
  doc.text('Personal Financial Breakdown', ML + 10, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.muted);
  const subLine = `Prepared for: ${data.reportName}   ·   ${data.reportDate}   ·   ${data.state}   ·   Filing: ${data.filingStatus.charAt(0).toUpperCase() + data.filingStatus.slice(1)}`;
  doc.text(subLine, ML, y + 13);

  y += 19;
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(ML, y, PAGE_W - MR, y);
  y += 8;

  // ── Income Overview (2×2 cards) ────────────────────────
  y = sectionHeader(doc, 'INCOME OVERVIEW', ML, y, CW);
  y = drawCards(doc, [
    { label: 'Gross Salary',           value: fmt(data.grossSalary),            sub: 'Before anything',          color: C.text },
    { label: 'Taxable Income (fed)',    value: fmt(data.federalTaxableIncome),   sub: 'After 401k + std deduction', color: C.text },
    { label: 'Total Taxes Paid',        value: fmt(data.totalTaxes),             sub: 'Fed + State + FICA',       color: C.coral },
    { label: 'Annual Take-Home',        value: fmt(data.annualTakeHome),         sub: 'After all deductions',     color: C.green },
  ], ML, y, CW, 22, 2);
  y += 2;

  // ── Tax Breakdown table ─────────────────────────────────
  y = sectionHeader(doc, 'TAX BREAKDOWN', ML, y, CW);

  type TaxRow = { label: string; value: string; isBold?: boolean; bg?: RGB; color?: RGB; indent?: boolean };

  const taxRows: TaxRow[] = [
    { label: 'Gross salary',                                         value: fmt(data.grossSalary) },
    { label: 'Traditional 401k contribution',                        value: data.trad401k > 0 ? `-${fmt(data.trad401k)}` : '—', color: data.trad401k > 0 ? C.coral : C.muted },
    { label: 'Federal AGI',                                          value: fmt(data.federalAGI), bg: C.lightGray, color: C.muted, indent: true },
    { label: 'Standard deduction',                                   value: `-${fmt(data.standardDeduction)}`, color: C.coral },
    { label: 'Federal taxable income',                               value: fmt(data.federalTaxableIncome), bg: C.lightGray, color: C.muted, indent: true },
    { label: 'Federal income tax',                                   value: `-${fmt(data.federalTax)}`, color: C.coral },
    { label: 'Social Security (6.2%)',                               value: `-${fmt(data.socialSecurity)}`, color: C.coral },
    { label: 'Medicare (1.45%)',                                     value: `-${fmt(data.medicare)}`, color: C.coral },
    { label: `${data.state} state income tax`,                       value: `-${fmt(data.stateTax)}`, color: C.coral },
    ...(data.caSDI > 0 ? [{ label: 'CA SDI (1.1%)', value: `-${fmt(data.caSDI)}`, color: C.coral }] : []),
    { label: 'Total taxes',                                          value: `-${fmt(data.totalTaxes)}`, isBold: true, color: C.coral },
    { label: 'Annual take-home',                                     value: fmt(data.annualTakeHome), isBold: true, bg: C.greenBg, color: C.green },
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: MR },
    tableWidth: CW,
    head: [],
    body: taxRows.map((r) => [r.indent ? `    ${r.label}` : r.label, r.value]),
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 2.5, bottom: 2.5, left: 3.5, right: 3.5 },
      lineColor: C.border,
      lineWidth: 0.15,
      textColor: C.text,
    },
    columnStyles: {
      0: { cellWidth: CW * 0.72 },
      1: { cellWidth: CW * 0.28, halign: 'right' },
    },
    didParseCell: (hookData) => {
      const row = taxRows[hookData.row.index];
      if (!row) return;
      if (row.bg) hookData.cell.styles.fillColor = row.bg as any;
      if (row.color) hookData.cell.styles.textColor = row.color as any;
      if (row.isBold) hookData.cell.styles.fontStyle = 'bold';
    },
    theme: 'plain',
  });

  y = (doc as any).lastAutoTable.finalY + 7;

  // ── Effective rates summary bar ─────────────────────────
  doc.setFillColor(...C.lightGray);
  doc.roundedRect(ML, y, CW, 14, 2, 2, 'F');

  const rateItems = [
    { label: 'Effective Federal Rate', value: pct(data.effectiveFederalRate) },
    { label: 'Effective Total Rate',   value: pct(data.effectiveTotalRate) },
    { label: 'Marginal Bracket',       value: data.marginalBracket },
  ];
  rateItems.forEach((item, i) => {
    const cx = ML + (i * CW) / 3 + 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.text(item.label, cx, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...C.text);
    doc.text(item.value, cx, y + 11.5);
  });

  // ═══════════════════════════════════════════════════════
  // PAGE 2
  // ═══════════════════════════════════════════════════════
  doc.addPage();
  y = 15;

  // ── Where Your Money Goes ──────────────────────────────
  y = sectionHeader(doc, 'WHERE YOUR MONEY GOES (ANNUAL)', ML, y, CW);

  const barItems = [
    { label: 'Take-home pay',  value: data.annualTakeHome, color: C.emerald,  positive: false },
    { label: 'Total taxes',    value: data.totalTaxes,     color: C.coral,    positive: false },
    { label: 'Your 401k',      value: data.trad401k,       color: C.blue,     positive: false },
    { label: 'Roth IRA',       value: data.rothIRA,        color: C.purple,   positive: false },
    { label: 'Company match',  value: data.employerMatch,  color: C.teal,     positive: true  },
  ].filter((b) => b.value > 0);

  const totalBarBase = data.grossSalary + data.employerMatch;
  const BAR_LABEL_W = 36;
  const BAR_TRACK_W = CW - BAR_LABEL_W - 32;
  const BAR_H = 5.5;
  const BAR_GAP = 3.5;

  barItems.forEach((item) => {
    const barFrac = Math.max(0.01, item.value / totalBarBase);
    const filledW = Math.max(3, barFrac * BAR_TRACK_W);
    const barPct = Math.round(barFrac * 100);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.text);
    doc.text(item.label, ML, y + BAR_H - 1);

    doc.setFillColor(...C.lightGray);
    doc.roundedRect(ML + BAR_LABEL_W, y, BAR_TRACK_W, BAR_H, 1.2, 1.2, 'F');

    doc.setFillColor(...item.color);
    doc.roundedRect(ML + BAR_LABEL_W, y, filledW, BAR_H, 1.2, 1.2, 'F');

    if (filledW > 14) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(...C.white);
      doc.text(`${barPct}%`, ML + BAR_LABEL_W + 2.5, y + BAR_H - 1.2);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C.text);
    const prefix = item.positive ? '+' : '';
    doc.text(`${prefix}${fmt(item.value)}`, ML + BAR_LABEL_W + BAR_TRACK_W + 3, y + BAR_H - 1);

    y += BAR_H + BAR_GAP;
  });

  y += 5;
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(ML, y, PAGE_W - MR, y);
  y += 8;

  // ── Monthly Budget ─────────────────────────────────────
  y = sectionHeader(doc, 'MONTHLY BUDGET (FROM TAKE-HOME)', ML, y, CW);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  doc.text(`Monthly take-home: ${fmt(data.monthlyTakeHome)}/mo`, ML, y);
  y += 6;

  const rothMonthly = Math.round(data.rothIRA / 12);
  const totalFixed = data.rent + data.groceries + data.commute + rothMonthly + data.otherFixed;

  type BudgetRow = { cells: [string, string]; bold?: boolean; color?: RGB; bg?: RGB; muted?: boolean };

  const budgetRows: BudgetRow[] = [
    { cells: ['Rent',                     `-${fmt(data.rent)}`]           },
    { cells: ['Groceries',                `-${fmt(data.groceries)}`]      },
    { cells: ['Commute (ferry/transport)', `-${fmt(data.commute)}`]       },
    { cells: ['Roth IRA (monthly)',        `-${fmt(rothMonthly)}`]        },
    ...(data.otherFixed > 0 ? [{ cells: ['Other fixed', `-${fmt(data.otherFixed)}`] as [string, string] }] : []),
    { cells: ['Total fixed outflows',     `-${fmt(totalFixed)}`],  muted: true                        },
    { cells: ['Monthly surplus (discretionary)', fmt(data.monthlySurplus)], bold: true, bg: C.greenBg, color: C.green },
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: MR },
    tableWidth: CW,
    head: [],
    body: budgetRows.map((r) => r.cells),
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 2.5, bottom: 2.5, left: 3.5, right: 3.5 },
      lineColor: C.border,
      lineWidth: 0.15,
      textColor: C.text,
    },
    columnStyles: {
      0: { cellWidth: CW * 0.72 },
      1: { cellWidth: CW * 0.28, halign: 'right' },
    },
    didParseCell: (hookData) => {
      const row = budgetRows[hookData.row.index];
      if (!row) return;
      if (row.bg)    hookData.cell.styles.fillColor = row.bg as any;
      if (row.color) hookData.cell.styles.textColor = row.color as any;
      if (row.bold)  hookData.cell.styles.fontStyle = 'bold';
      if (row.muted) hookData.cell.styles.textColor = C.muted as any;
      // Color deduction amounts coral (col 1, non-summary rows)
      const isSurplus = hookData.row.index === budgetRows.length - 1;
      const isTotal   = hookData.row.index === budgetRows.length - 2;
      if (hookData.column.index === 1 && !isSurplus && !isTotal) {
        hookData.cell.styles.textColor = C.coral as any;
      }
    },
    theme: 'plain',
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Retirement Picture (4 cards) ───────────────────────
  y = sectionHeader(doc, 'RETIREMENT PICTURE (ANNUAL)', ML, y, CW);

  y = drawCards(doc, [
    { label: 'Your 401k',         value: fmt(data.trad401k),          sub: 'Pre-tax, max contribution',   color: C.blue   },
    { label: 'Company match',     value: `+${fmt(data.employerMatch)}`, sub: 'Free money on top',         color: C.teal   },
    { label: 'Roth IRA',          value: fmt(data.rothIRA),            sub: 'Post-tax, tax-free growth',   color: C.purple },
    { label: 'Total to retirement', value: fmt(data.totalToRetirement), sub: 'Combined annual savings',   color: C.green  },
  ], ML, y, CW, 22, 4);

  y += 6;

  // ── Disclaimer footnote ────────────────────────────────
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(ML, y, PAGE_W - MR, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...C.muted);
  doc.text(
    'RoboFinancer provides estimates and educational information only. Tax brackets based on IRS 2024 tables. ' +
    'This is not financial, tax, or legal advice. Consult a licensed professional before making financial decisions. ' +
    'Generated by robo-financer.vercel.app',
    ML, y,
    { maxWidth: CW }
  );

  doc.save('financial_breakdown.pdf');
}
