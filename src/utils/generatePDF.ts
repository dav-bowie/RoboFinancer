/**
 * generatePDF.ts — Client-side PDF export for RoboFinancer
 * Uses jsPDF (v4) + jspdf-autotable (v5). Runs entirely in the browser.
 * No server calls. Triggers browser download automatically.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface CashFlowReportData {
  grossSalary: number;
  k401Annual: number;
  hsaAnnual: number;
  taxesAnnual: number;
  monthlyTakeHome: number;
  necessaryMonthly: number;
  lifestyleMonthly: number;
  savingsMonthly: number;
  givingMonthly?: number;
  surplusMonthly: number;
  k401Monthly: number;
  hsaMonthly: number;
  monthlyTaxes: number;
  lineItems: Array<{ group: string; label: string; monthly: number }>;
}

export interface ReportData {
  reportName: string;
  reportDate: string;

  grossSalary: number;
  filingStatus: string;
  state: string;

  trad401k: number;
  hsa: number;
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
  /** Full net before post-tax Roth IRA — shown in tax table only */
  netTakeHomeBeforeRoth?: number;
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
  cashFlow?: CashFlowReportData;
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

function drawFlowBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  value: string,
  sub?: string,
  fill: RGB = C.lightGray,
  stroke: RGB = C.border,
  titleColor: RGB = C.muted,
  valueColor: RGB = C.text,
) {
  doc.setFillColor(...fill);
  doc.setDrawColor(...stroke);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...titleColor);
  doc.text(title, x + 3, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...valueColor);
  doc.text(value, x + 3, y + 11.5, { maxWidth: w - 6 });
  if (sub) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.muted);
    doc.text(sub, x + 3, y + h - 3, { maxWidth: w - 6 });
  }
}

function drawArrow(doc: jsPDF, x1: number, y1: number, x2: number, y2: number, label?: string) {
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.35);
  doc.line(x1, y1, x2, y2);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const size = 1.8;
  doc.line(x2, y2, x2 - size * Math.cos(angle - 0.4), y2 - size * Math.sin(angle - 0.4));
  doc.line(x2, y2, x2 - size * Math.cos(angle + 0.4), y2 - size * Math.sin(angle + 0.4));
  if (label) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.muted);
    doc.text(label, (x1 + x2) / 2 + 1, (y1 + y2) / 2 - 1);
  }
}

function drawCashFlowDiagramPage(doc: jsPDF, cf: CashFlowReportData, ML: number, MR: number, CW: number): number {
  doc.addPage();
  let y = 15;
  y = sectionHeader(doc, 'MONTHLY CASH FLOW DIAGRAM', ML, y, CW);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  doc.text(
    'How gross income flows through pre-tax deductions, take-home pay, spending tiers, and surplus — based on your inputs.',
    ML,
    y,
    { maxWidth: CW },
  );
  y += 10;

  const boxW = 52;
  const boxH = 16;
  const centerX = ML + CW / 2;

  // Row 1: Gross income
  drawFlowBox(doc, centerX - boxW / 2, y, boxW, boxH, 'Gross Income', fmt(cf.grossSalary), `${fmt(cf.grossSalary / 12)}/mo`, C.white, C.blue, C.muted, C.blue);
  const grossBottom = y + boxH;
  y += boxH + 10;

  // Row 2: Deductions
  const deductions = [
    { label: '401(k) Pre-Tax', monthly: cf.k401Monthly, color: C.blue as RGB },
    { label: 'HSA Pre-Tax', monthly: cf.hsaMonthly, color: C.teal as RGB },
    { label: 'Taxes & FICA', monthly: cf.monthlyTaxes, color: C.coral as RGB },
  ].filter((d) => d.monthly > 0);

  const dedGap = 6;
  const dedTotalW = deductions.length * boxW + (deductions.length - 1) * dedGap;
  let dedX = centerX - dedTotalW / 2;
  const dedY = y;

  deductions.forEach((d) => {
    drawArrow(doc, centerX, grossBottom, dedX + boxW / 2, dedY, fmt(d.monthly));
    drawFlowBox(doc, dedX, dedY, boxW, boxH, d.label, fmt(d.monthly * 12), `${fmt(d.monthly)}/mo`, C.lightGray, d.color, C.muted, C.text);
    dedX += boxW + dedGap;
  });

  y = dedY + boxH + 10;

  // Row 3: Take-home hub
  drawFlowBox(
    doc,
    centerX - boxW / 2,
    y,
    boxW,
    boxH,
    'Monthly Take-Home',
    fmt(cf.monthlyTakeHome),
    `${fmt(cf.monthlyTakeHome * 12)}/yr spendable`,
    C.greenBg,
    C.green,
    C.muted,
    C.green,
  );
  deductions.forEach((_, i) => {
    const dedCenter = centerX - dedTotalW / 2 + i * (boxW + dedGap) + boxW / 2;
    drawArrow(doc, dedCenter, dedY + boxH, centerX, y);
  });
  if (deductions.length === 0) {
    drawArrow(doc, centerX, grossBottom, centerX, y);
  }

  const takeHomeBottom = y + boxH;
  y += boxH + 10;

  // Row 4: Spending tiers
  const tiers = [
    ...(cf.givingMonthly && cf.givingMonthly > 0
      ? [{ label: 'Faith & Giving', monthly: cf.givingMonthly, color: [245, 158, 11] as RGB }]
      : []),
    { label: 'Necessary & Essential', monthly: cf.necessaryMonthly, color: C.purple as RGB },
    { label: 'Lifestyle', monthly: cf.lifestyleMonthly, color: [245, 158, 11] as RGB },
    { label: 'Savings & Risk', monthly: cf.savingsMonthly, color: C.emerald as RGB },
  ];
  const tierGap = 6;
  const tierTotalW = tiers.length * boxW + (tiers.length - 1) * tierGap;
  let tierX = centerX - tierTotalW / 2;
  const tierY = y;

  tiers.forEach((t) => {
    drawArrow(doc, centerX, takeHomeBottom, tierX + boxW / 2, tierY, fmt(t.monthly));
    drawFlowBox(doc, tierX, tierY, boxW, boxH, t.label, fmt(t.monthly), `${fmt(t.monthly * 12)}/yr`, C.lightGray, t.color, C.muted, C.text);
    tierX += boxW + tierGap;
  });

  y = tierY + boxH + 10;

  // Row 5: Surplus
  const surplusPositive = cf.surplusMonthly >= 0;
  drawFlowBox(
    doc,
    centerX - boxW / 2,
    y,
    boxW,
    boxH,
    surplusPositive ? 'Monthly Surplus' : 'Monthly Shortage',
    fmt(Math.abs(cf.surplusMonthly)),
    surplusPositive ? 'Unallocated cash flow' : 'Over budget',
    surplusPositive ? C.greenBg : [254, 242, 242] as RGB,
    surplusPositive ? C.green : C.coral,
    C.muted,
    surplusPositive ? C.green : C.coral,
  );
  drawArrow(doc, centerX, tierY + boxH, centerX, y);

  y += boxH + 12;

  // Line-item detail table
  if (cf.lineItems.length > 0) {
    y = sectionHeader(doc, 'SPENDING LINE ITEMS (MONTHLY)', ML, y, CW);
    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: MR },
      tableWidth: CW,
      head: [['Category', 'Line Item', 'Monthly']],
      body: cf.lineItems.map((item) => [item.group, item.label, fmt(item.monthly)]),
      styles: {
        fontSize: 8,
        cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
        lineColor: C.border,
        lineWidth: 0.15,
        textColor: C.text,
      },
      headStyles: {
        fillColor: C.lightGray,
        textColor: C.muted,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: CW * 0.22 },
        1: { cellWidth: CW * 0.58 },
        2: { cellWidth: CW * 0.2, halign: 'right' },
      },
      theme: 'plain',
    });
    return (doc as any).lastAutoTable.finalY + 8;
  }

  return y;
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
    { label: 'Annual Spendable Take-Home', value: fmt(data.annualTakeHome),         sub: 'After taxes & post-tax Roth IRA', color: C.green },
  ], ML, y, CW, 22, 2);
  y += 2;

  // ── Tax Breakdown table ─────────────────────────────────
  y = sectionHeader(doc, 'TAX BREAKDOWN', ML, y, CW);

  type TaxRow = { label: string; value: string; isBold?: boolean; bg?: RGB; color?: RGB; indent?: boolean };

  const taxRows: TaxRow[] = [
    { label: 'Gross salary',                                         value: fmt(data.grossSalary) },
    { label: 'Traditional 401k contribution',                        value: data.trad401k > 0 ? `-${fmt(data.trad401k)}` : '—', color: data.trad401k > 0 ? C.coral : C.muted },
    ...(data.hsa > 0 ? [{ label: 'HSA contribution', value: `-${fmt(data.hsa)}`, color: C.teal }] : []),
    { label: 'Federal AGI',                                          value: fmt(data.federalAGI), bg: C.lightGray, color: C.muted, indent: true },
    { label: 'Standard deduction',                                   value: `-${fmt(data.standardDeduction)}`, color: C.coral },
    { label: 'Federal taxable income',                               value: fmt(data.federalTaxableIncome), bg: C.lightGray, color: C.muted, indent: true },
    { label: 'Federal income tax',                                   value: `-${fmt(data.federalTax)}`, color: C.coral },
    { label: 'Social Security (6.2%)',                               value: `-${fmt(data.socialSecurity)}`, color: C.coral },
    { label: 'Medicare (1.45%)',                                     value: `-${fmt(data.medicare)}`, color: C.coral },
    { label: `${data.state} state income tax`,                       value: `-${fmt(data.stateTax)}`, color: C.coral },
    ...(data.caSDI > 0 ? [{ label: 'CA SDI (1.1%)', value: `-${fmt(data.caSDI)}`, color: C.coral }] : []),
    { label: 'Total taxes',                                          value: `-${fmt(data.totalTaxes)}`, isBold: true, color: C.coral },
    ...(data.netTakeHomeBeforeRoth != null && data.netTakeHomeBeforeRoth !== data.annualTakeHome
      ? [{ label: 'Net before post-tax Roth IRA', value: fmt(data.netTakeHomeBeforeRoth), indent: true }]
      : []),
    { label: 'Post-tax Roth IRA',                                    value: data.rothIRA > 0 ? `-${fmt(data.rothIRA)}` : '—', color: data.rothIRA > 0 ? C.purple : C.muted },
    { label: 'Spendable take-home',                                  value: fmt(data.annualTakeHome), isBold: true, bg: C.greenBg, color: C.green },
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

  const totalBarBase = data.grossSalary;
  const BAR_LABEL_W = 36;
  const BAR_PCT_W = 14;
  const BAR_VALUE_W = 28;
  const BAR_TRACK_W = CW - BAR_LABEL_W - BAR_PCT_W - BAR_VALUE_W - 4;
  const BAR_H = 5.5;
  const BAR_GAP = 3.5;

  barItems.forEach((item) => {
    const barFrac = totalBarBase > 0 ? item.value / totalBarBase : 0;
    const filledW = Math.max(2, Math.min(BAR_TRACK_W, barFrac * BAR_TRACK_W));
    const barPct = totalBarBase > 0 ? Math.round(barFrac * 100) : 0;
    const trackX = ML + BAR_LABEL_W;
    const pctX = trackX + BAR_TRACK_W + 2;
    const valueX = pctX + BAR_PCT_W;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.text);
    doc.text(item.label, ML, y + BAR_H - 1);

    doc.setFillColor(...C.lightGray);
    doc.roundedRect(trackX, y, BAR_TRACK_W, BAR_H, 1.2, 1.2, 'F');

    if (barFrac > 0) {
      doc.setFillColor(...item.color);
      doc.roundedRect(trackX, y, filledW, BAR_H, 1.2, 1.2, 'F');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...C.text);
    doc.text(`${barPct}%`, pctX, y + BAR_H - 1.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C.text);
    const prefix = item.positive ? '+' : '';
    doc.text(`${prefix}${fmt(item.value)}`, valueX, y + BAR_H - 1);

    y += BAR_H + BAR_GAP;
  });

  y += 5;
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(ML, y, PAGE_W - MR, y);
  y += 8;

  // ── Monthly Budget ─────────────────────────────────────
  y = sectionHeader(doc, 'MONTHLY BUDGET (FROM SPENDABLE TAKE-HOME)', ML, y, CW);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  doc.text(`Spendable take-home: ${fmt(data.monthlyTakeHome)}/mo (after post-tax Roth IRA)`, ML, y);
  y += 6;

  type BudgetRow = { cells: [string, string]; bold?: boolean; color?: RGB; bg?: RGB; muted?: boolean };

  let budgetRows: BudgetRow[];

  if (data.cashFlow && data.cashFlow.lineItems.length > 0) {
    const totalOutflows = data.cashFlow.lineItems.reduce((sum, item) => sum + item.monthly, 0);
    budgetRows = [
      ...data.cashFlow.lineItems.map((item) => ({
        cells: [`${item.group}: ${item.label}`, `-${fmt(item.monthly)}`] as [string, string],
      })),
      { cells: ['Total monthly outflows', `-${fmt(totalOutflows)}`], muted: true },
      {
        cells: ['Monthly surplus (discretionary)', fmt(data.cashFlow.surplusMonthly)],
        bold: true,
        bg: C.greenBg,
        color: data.cashFlow.surplusMonthly >= 0 ? C.green : C.coral,
      },
    ];
  } else {
    const rothMonthly = Math.round(data.rothIRA / 12);
    const totalFixed = data.rent + data.groceries + data.commute + rothMonthly + data.otherFixed;

    budgetRows = [
      { cells: ['Rent',                     `-${fmt(data.rent)}`]           },
      { cells: ['Groceries',                `-${fmt(data.groceries)}`]      },
      { cells: ['Commute (ferry/transport)', `-${fmt(data.commute)}`]       },
      { cells: ['Roth IRA (monthly)',        `-${fmt(rothMonthly)}`]        },
      ...(data.otherFixed > 0 ? [{ cells: ['Other fixed', `-${fmt(data.otherFixed)}`] as [string, string] }] : []),
      { cells: ['Total fixed outflows',     `-${fmt(totalFixed)}`],  muted: true                        },
      { cells: ['Monthly surplus (discretionary)', fmt(data.monthlySurplus)], bold: true, bg: C.greenBg, color: C.green },
    ];
  }

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

  if (data.cashFlow) {
    y = drawCashFlowDiagramPage(doc, data.cashFlow, ML, MR, CW);
  } else {
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.line(ML, y, PAGE_W - MR, y);
    y += 5;
  }

  // ── Disclaimer footnote (last page) ────────────────────
  const lastPage = doc.getNumberOfPages();
  doc.setPage(lastPage);
  if (data.cashFlow) {
    y = Math.max(y, 255);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...C.muted);
  doc.text(
    'RoboFinancer provides estimates and educational information only. Tax brackets based on IRS 2024 tables. ' +
    'This is not financial, tax, or legal advice. Consult a licensed professional before making financial decisions. ' +
    'Generated by robo-financer.vercel.app',
    ML,
    y,
    { maxWidth: CW },
  );

  doc.save('financial_breakdown.pdf');
}
