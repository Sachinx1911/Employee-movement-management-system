import "server-only";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { formatDateKey, formatDateTime, formatTimeReport } from "@/lib/date-utils";
import { formatDuration, formatDurationReport } from "@/lib/duration-utils";
import { purposeKind, PURPOSE_KIND_ARGB } from "@/lib/purpose-highlight";
import type { MonthlyReport } from "@/lib/queries/monthly";
import type { DailyReport } from "@/lib/queries/reports";
import { ROLE_LABEL } from "@/lib/roles";

const NAVY: [number, number, number] = [23, 54, 93];
const BLUE_ARGB = "FF2563EB";

type FlatRow = {
  sr: number;
  employee: string;
  department: string;
  location: string;
  purpose: string;
  authorizedBy: string;
  out: string;
  in: string;
  duration: string;
  status: string;
};

function flatten(report: DailyReport): FlatRow[] {
  const out: FlatRow[] = [];
  let sr = 0;
  for (const emp of report.employees) {
    for (const e of emp.entries) {
      out.push({
        sr: ++sr,
        employee: emp.name,
        department: emp.department ?? "",
        location: e.location,
        purpose: e.purpose ?? "-",
        authorizedBy: e.authorizedBy ?? "NIL",
        out: formatTimeReport(new Date(e.outTime)),
        in: e.inTime ? formatTimeReport(new Date(e.inTime)) : "Pending",
        duration: e.inTime ? formatDurationReport(e.durationMinutes) : "IN Pending",
        status: e.status === "OUTSIDE" ? "Pending IN" : "Completed",
      });
    }
  }
  return out;
}

const HEADERS = ["Sr.", "Employee", "Department", "Location / Place", "Purpose", "Authorized By", "Out Time", "In Time", "Duration", "Status"];

export function dailyCsv(report: DailyReport): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = flatten(report).map((r) => [r.sr, r.employee, r.department, r.location, r.purpose, r.authorizedBy, r.out, r.in, r.duration, r.status]);
  return "﻿" + [HEADERS, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
}

export async function dailyXlsx(report: DailyReport): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "DDSR GROUP";
  const ws = wb.addWorksheet("Daily Report", { views: [{ state: "frozen", ySplit: 4 }] });

  ws.mergeCells("A1:J1");
  ws.getCell("A1").value = `Daily IN / OUT Report — ${formatDateKey(report.date)}`;
  ws.getCell("A1").font = { bold: true, size: 14, color: { argb: "FF17365D" } };
  const s = report.summary;
  ws.mergeCells("A2:J2");
  ws.getCell("A2").value = `Employees Out: ${s.employeesOut}   Total Outings: ${s.outings}   Completed: ${s.completed}   Pending IN: ${s.pending}   Total Outside Time: ${formatDuration(s.totalMinutes)}`;
  ws.getCell("A2").font = { color: { argb: "FF64748B" } };

  const header = ws.getRow(4);
  header.values = HEADERS;
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE_ARGB } };
    c.alignment = { vertical: "middle" };
  });
  header.height = 22;

  for (const r of flatten(report)) {
    const row = ws.addRow([r.sr, r.employee, r.department, r.location, r.purpose, r.authorizedBy, r.out, r.in, r.duration, r.status]);
    if (r.status === "Pending IN") row.getCell(10).font = { color: { argb: "FFD97706" }, bold: true };
  }

  // Employee totals
  ws.addRow([]);
  const t = ws.addRow(["", "Employee", "Total Outings", "Total Duration", "Pending IN"]);
  t.font = { bold: true };
  for (const e of report.employees.filter((x) => x.outings)) {
    ws.addRow(["", e.name, e.outings, formatDurationReport(e.totalMinutes), e.pending]);
  }

  const widths = [6, 16, 14, 26, 20, 16, 11, 11, 14, 12];
  widths.forEach((w, i) => (ws.getColumn(i + 1).width = w));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export function dailyPdf(report: DailyReport, company = "DDSR GROUP"): Buffer {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 64, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(company, 40, 30);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Daily IN - OUT Report", 40, 48);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(formatDateKey(report.date), pageW - 40, 38, { align: "right" });

  const s = report.summary;
  const cards = [
    ["Employees Out", String(s.employeesOut)],
    ["Total Outings", String(s.outings)],
    ["Completed", String(s.completed)],
    ["Pending IN", String(s.pending)],
    ["Total Outside Time", formatDuration(s.totalMinutes)],
  ];
  const cw = (pageW - 80 - 4 * 10) / 5;
  cards.forEach(([label, value], i) => {
    const x = 40 + i * (cw + 10);
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(246, 248, 252);
    doc.roundedRect(x, 80, cw, 46, 6, 6, "FD");
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(label!, x + 10, 96);
    doc.setTextColor(23, 32, 51);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(value!, x + 10, 116);
  });

  const body: (string | number | { content: string; colSpan: number; styles: object })[][] = [];
  for (const emp of report.employees.filter((e) => e.outings)) {
    body.push([
      {
        content: `${emp.name}${emp.department ? `  ·  ${emp.department}` : ""}     Total: ${formatDurationReport(emp.totalMinutes)}  ·  ${emp.outings} outing${emp.outings === 1 ? "" : "s"}${emp.pending ? `  ·  ${emp.pending} pending` : ""}`,
        colSpan: 8,
        styles: { fillColor: [239, 244, 255], fontStyle: "bold", textColor: [23, 54, 93] },
      },
    ]);
    emp.entries.forEach((e, i) => {
      body.push([
        i + 1,
        e.location,
        e.purpose ?? "-",
        e.authorizedBy ?? "NIL",
        formatTimeReport(new Date(e.outTime)),
        e.inTime ? formatTimeReport(new Date(e.inTime)) : "Pending",
        e.inTime ? formatDurationReport(e.durationMinutes) : "IN Pending",
        e.status === "OUTSIDE" ? "Pending IN" : "Completed",
      ]);
    });
  }
  if (!body.length) body.push([{ content: "No movement entries found for this date.", colSpan: 8, styles: { halign: "center" } }]);

  autoTable(doc, {
    startY: 142,
    margin: { left: 40, right: 40 },
    head: [["#", "Location / Place", "Purpose", "Authorized By", "Out Time", "In Time", "Duration", "Status"]],
    body,
    styles: { fontSize: 9, cellPadding: 5, lineColor: [226, 232, 240], lineWidth: 0.5 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 28 } },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 7 && data.cell.raw === "Pending IN") {
        data.cell.styles.textColor = [217, 119, 6];
        data.cell.styles.fontStyle = "bold";
      }
    },
    didDrawPage: () => {
      const h = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated ${new Date().toLocaleString("en-IN", { timeZone: process.env.NEXT_PUBLIC_APP_TIMEZONE || "Asia/Kolkata" })}`, 40, h - 20);
      doc.text(`Page ${doc.getNumberOfPages()}`, pageW - 40, h - 20, { align: "right" });
    },
  });

  return Buffer.from(doc.output("arraybuffer"));
}

// ───────────────────────── Monthly ─────────────────────────


/** "Admin (5), Office Staff (2)" */
export const enteredByText = (list: { name: string; count: number }[]) => list.map((u) => `${u.name} (${u.count})`).join(", ");

export type MonthlyTab = "employee" | "day" | "department" | "location" | "user";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const monthLabel = (r: MonthlyReport) => `${MONTHS[r.month - 1]} ${r.year}`;

export function monthlyTable(r: MonthlyReport, tab: MonthlyTab): { title: string; head: string[]; rows: (string | number)[][] } {
  if (tab === "user")
    return {
      title: "Entered By",
      head: ["Sr.", "User", "Role", "Entries Added", "Mark IN", "Edits", "Deleted", "Last Activity"],
      rows: r.users.map((u, i) => [
        i + 1,
        u.name,
        ROLE_LABEL[u.role],
        u.added,
        u.markedIn,
        u.edited,
        u.deleted,
        u.lastActivity ? formatDateTime(new Date(u.lastActivity)) : "-",
      ]),
    };
  if (tab === "day")
    return {
      title: "Day Wise",
      head: ["Date", "Employees Out", "Total Outings", "Completed", "Pending IN", "Total Outside Time"],
      rows: r.days.map((d) => [formatDateKey(d.date), d.employeesOut, d.outings, d.completed, d.pending, formatDuration(d.totalMinutes)]),
    };
  if (tab === "department")
    return {
      title: "Department Wise",
      head: ["Department", "Employees", "Total Outings", "Total Outside Time", "Average Duration"],
      rows: r.departments.map((d) => [d.department, d.employees, d.outings, formatDuration(d.totalMinutes), formatDuration(d.avgMinutes)]),
    };
  if (tab === "location")
    return {
      title: "Location Wise",
      head: ["Location", "Visits", "Employees", "Total Time", "Average / Visit"],
      rows: r.locations.map((l) => [l.location, l.visits, l.employees, formatDuration(l.totalMinutes), formatDuration(l.avgMinutes)]),
    };
  return {
    title: "Employee Wise",
    head: ["Sr. No.", "Employee", "Department", "Working Days", "Total Outings", "Total Outside Time", "Average / Outing", "Longest Outing", "Entered By"],
    rows: r.employees.map((e, i) => [
      i + 1,
      e.name,
      e.department ?? "",
      e.workingDays,
      e.outings,
      formatDuration(e.totalMinutes),
      formatDuration(e.avgMinutes),
      formatDuration(e.longestMinutes),
      enteredByText(e.enteredBy),
    ]),
  };
}

const ALL_TABS: MonthlyTab[] = ["employee", "day", "department", "location", "user"];

/** Every entry of the month (optionally one employee), oldest first. */
export function monthlyEntriesTable(r: MonthlyReport, employeeId?: string) {
  const names = new Map(r.employees.map((e) => [e.employeeId, e.name]));
  const list = employeeId ? r.entries.filter((e) => e.employeeId === employeeId) : r.entries;
  return {
    title: employeeId ? `Employee Detail — ${names.get(employeeId) ?? ""}` : "All Entries",
    head: ["Sr.", "Employee", "Date", "OUT Time", "IN Time", "Location", "Reason (Purpose)", "Total Out Time"],
    kinds: list.map((e) => purposeKind(e.purpose)),
    rows: list.map((e, i) => [
      i + 1,
      names.get(e.employeeId) ?? "",
      formatDateKey(e.date),
      formatTimeReport(new Date(e.outTime)),
      e.inTime ? formatTimeReport(new Date(e.inTime)) : "Pending",
      e.location,
      e.purpose ?? "",
      e.inTime ? formatDurationReport(e.durationMinutes) : "-",
    ]),
  };
}

export function monthlyCsv(r: MonthlyReport, tab: MonthlyTab | "detail", employeeId?: string): string {
  const t = tab === "detail" ? monthlyEntriesTable(r, employeeId) : monthlyTable(r, tab);
  const esc = (v: string | number) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  return "\uFEFF" + [t.head, ...t.rows].map((row) => row.map(esc).join(",")).join("\r\n");
}

const hm = (m: number) => `${Math.floor(m / 60)}H ${m % 60}M`;

/**
 * "Employee Detail" sheet: a dropdown in B2 picks the employee and formulas pull
 * that employee's entries from the hidden "Data" sheet. Plain INDEX/MATCH so it
 * works in every Excel version (no FILTER). Lunch / Personal Work rows get
 * conditional light fills. Cached results are written for the first employee.
 */
function addEmployeeDetailSheet(wb: ExcelJS.Workbook, r: MonthlyReport) {
  const ws = wb.addWorksheet("Employee Detail", { views: [{ state: "frozen", ySplit: 6 }] });
  const data = wb.addWorksheet("Data", { state: "hidden" });

  const label = new Map(r.employees.map((e) => [e.employeeId, e.code ? `${e.name} (${e.code})` : e.name]));
  const labels = r.employees.map((e) => label.get(e.employeeId)!);
  const selected = labels[0] ?? "";
  const n = Math.max(r.entries.length + 1, 2); // last data row
  const SEL = "'Employee Detail'!$B$2";
  const col = (c: string) => `Data!$${c}$2:$${c}$${n}`;

  // Data: A key (nth match of the selected employee), B employee, C date, D OUT, E IN,
  // F location, G reason, H duration text, I minutes; K = dropdown list.
  data.getRow(1).values = ["Key", "Employee", "Date", "OUT Time", "IN Time", "Location", "Reason", "Total Out Time", "Minutes", "", "Employees"];
  let seen = 0;
  const mine: string[][] = [];
  r.entries.forEach((e, i) => {
    const row = i + 2;
    const emp = label.get(e.employeeId) ?? "";
    const isSel = emp === selected;
    if (isSel) seen++;
    const values = [
      formatDateKey(e.date),
      formatTimeReport(new Date(e.outTime)),
      e.inTime ? formatTimeReport(new Date(e.inTime)) : "Pending",
      e.location,
      e.purpose ?? "",
      e.inTime ? formatDurationReport(e.durationMinutes) : "-",
    ];
    if (isSel) mine.push(values);
    data.getRow(row).values = [
      { formula: `IF(B${row}=${SEL},COUNTIF(B$2:B${row},${SEL}),"")`, result: isSel ? seen : "" },
      emp,
      ...values,
      e.inTime ? (e.durationMinutes ?? 0) : 0,
    ];
  });
  labels.forEach((l, i) => (data.getCell(i + 2, 11).value = l));

  const mins = (who: string, word = "") =>
    r.entries
      .filter((e) => label.get(e.employeeId) === who && e.inTime && (e.purpose ?? "").toLowerCase().includes(word))
      .reduce((a, e) => a + (e.durationMinutes ?? 0), 0);

  const thin = { style: "thin" as const, color: { argb: "FFCBD5E1" } };
  const box = { top: thin, left: thin, bottom: thin, right: thin };
  const fill = (argb: string) => ({ type: "pattern" as const, pattern: "solid" as const, fgColor: { argb } });

  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = `DDSR GROUP — Employee Detail — ${monthLabel(r)}`;
  ws.getCell("A1").font = { bold: true, size: 14, color: { argb: "FF17365D" } };

  ws.getCell("A2").value = "Select Employee ▼";
  ws.getCell("A2").font = { bold: true };
  ws.mergeCells("B2:D2");
  const pick = ws.getCell("B2");
  pick.value = selected;
  pick.font = { bold: true, size: 12 };
  pick.fill = fill("FFFEF9C3");
  pick.border = { top: { style: "medium" }, left: { style: "medium" }, bottom: { style: "medium" }, right: { style: "medium" } };
  pick.dataValidation = {
    type: "list",
    allowBlank: true,
    formulae: [`Data!$K$2:$K$${Math.max(labels.length + 1, 2)}`],
    showErrorMessage: true,
    errorTitle: "Employee",
    error: "Please pick an employee from the list.",
  };
  ws.getCell("F2").value = "Lunch";
  ws.getCell("F2").fill = fill(PURPOSE_KIND_ARGB.lunch);
  ws.getCell("G2").value = "Personal Work";
  ws.getCell("G2").fill = fill(PURPOSE_KIND_ARGB.personal);
  ws.getCell("A3").value = "Click the yellow cell and choose an employee — the entries below update automatically.";
  ws.getCell("A3").font = { italic: true, size: 9, color: { argb: "FF64748B" } };

  const sumMin = (word = "") => `SUMIFS(${col("I")},${col("B")},$B$2${word ? `,${col("G")},"*${word}*"` : ""})`;
  const hmFormula = (word = "") => `INT(${sumMin(word)}/60)&"H "&MOD(${sumMin(word)},60)&"M"`;
  const summary: [string, string, string | number, string?][] = [
    ["Total Outings", `COUNTIF(${col("B")},$B$2)`, mine.length],
    ["Total Out Time", hmFormula(), hm(mins(selected))],
    ["Lunch", hmFormula("lunch"), hm(mins(selected, "lunch")), PURPOSE_KIND_ARGB.lunch],
    ["Personal Work", hmFormula("personal"), hm(mins(selected, "personal")), PURPOSE_KIND_ARGB.personal],
  ];
  summary.forEach(([name, formula, result, argb], i) => {
    const l = ws.getCell(4, 1 + i * 2);
    l.value = name;
    l.font = { bold: true, size: 9, color: { argb: "FF475569" } };
    const v = ws.getCell(4, 2 + i * 2);
    v.value = { formula, result };
    v.font = { bold: true, size: 12 };
    if (argb) [l, v].forEach((x) => (x.fill = fill(argb)));
  });

  const head = ws.getRow(6);
  head.values = ["Sr.", "Date", "OUT Time", "IN Time", "Location", "Reason (Purpose)", "Total Out Time"];
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.eachCell((c) => {
    c.fill = fill(BLUE_ARGB);
    c.border = box;
  });

  // One formula row per possible entry (enough for the busiest employee).
  const maxRows = Math.max(1, ...r.employees.map((e) => r.entries.filter((x) => x.employeeId === e.employeeId).length));
  const src = ["C", "D", "E", "F", "G", "H"];
  for (let k = 1; k <= maxRows; k++) {
    const row = ws.getRow(6 + k);
    const has = k <= mine.length;
    row.getCell(1).value = { formula: `IF(B${6 + k}="","",${k})`, result: has ? k : "" };
    src.forEach((c, j) => {
      row.getCell(j + 2).value = { formula: `IFERROR(INDEX(${col(c)},MATCH(${k},${col("A")},0)),"")`, result: has ? mine[k - 1][j] : "" };
    });
    for (let c = 1; c <= 7; c++) row.getCell(c).border = box;
  }
  const rule = (word: string, argb: string) => ({
    type: "expression" as const,
    priority: 1,
    formulae: [`ISNUMBER(SEARCH("${word}",$F7))`],
    style: { fill: { type: "pattern" as const, pattern: "solid" as const, bgColor: { argb } } },
  });
  ws.addConditionalFormatting({ ref: `A7:G${6 + maxRows}`, rules: [rule("lunch", PURPOSE_KIND_ARGB.lunch), rule("personal", PURPOSE_KIND_ARGB.personal)] });

  [18, 14, 13, 13, 26, 24, 16, 14].forEach((w, i) => (ws.getColumn(i + 1).width = w));
}

export async function monthlyXlsx(r: MonthlyReport): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "DDSR GROUP";
  wb.calcProperties.fullCalcOnLoad = true;
  addEmployeeDetailSheet(wb, r); // first sheet, opens by default
  for (const tab of ALL_TABS) {
    const t = monthlyTable(r, tab);
    const ws = wb.addWorksheet(t.title, { views: [{ state: "frozen", ySplit: 3 }] });
    ws.mergeCells(1, 1, 1, t.head.length);
    ws.getCell("A1").value = `DDSR GROUP — Monthly Report (${t.title}) — ${monthLabel(r)}`;
    ws.getCell("A1").font = { bold: true, size: 13, color: { argb: "FF17365D" } };
    const h = ws.getRow(3);
    h.values = t.head;
    h.font = { bold: true, color: { argb: "FFFFFFFF" } };
    h.eachCell((c) => (c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE_ARGB } }));
    t.rows.forEach((row) => ws.addRow(row));
    t.head.forEach((head, i) => (ws.getColumn(i + 1).width = Math.max(12, head.length + 4)));
    ws.getColumn(tab === "employee" ? 2 : 1).width = 24;
  }

  // All entries, Lunch / Personal Work rows filled with the same light colours as the screen.
  const t = monthlyEntriesTable(r);
  const ws = wb.addWorksheet(t.title, { views: [{ state: "frozen", ySplit: 3 }] });
  ws.mergeCells(1, 1, 1, t.head.length);
  ws.getCell("A1").value = `DDSR GROUP — Monthly Report (${t.title}) — ${monthLabel(r)}   ·   Highlight: Lunch = orange, Personal Work = violet`;
  ws.getCell("A1").font = { bold: true, size: 13, color: { argb: "FF17365D" } };
  const h = ws.getRow(3);
  h.values = t.head;
  h.font = { bold: true, color: { argb: "FFFFFFFF" } };
  h.eachCell((c) => (c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE_ARGB } }));
  t.rows.forEach((row, i) => {
    const added = ws.addRow(row);
    const kind = t.kinds[i];
    if (kind) {
      for (let c = 1; c <= t.head.length; c++) added.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: PURPOSE_KIND_ARGB[kind] } };
    }
  });
  [6, 22, 14, 11, 11, 26, 22, 15].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export function monthlyPdf(r: MonthlyReport, company = "DDSR GROUP", tabs: MonthlyTab[] = ALL_TABS): Buffer {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 64, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(company, 40, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Monthly Movement Report", 40, 48);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(monthLabel(r), pageW - 40, 38, { align: "right" });

  const s = r.summary;
  doc.setTextColor(23, 32, 51);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Total Outings: ${s.outings}    Employees Out: ${s.employeesOut}    Completed: ${s.completed}    Pending IN: ${s.pending}    Total Outside Time: ${formatDuration(s.totalMinutes)}    Average / Outing: ${formatDuration(s.avgMinutes)}`,
    40,
    86,
  );

  let y = 100;
  for (const tab of tabs) {
    const t = monthlyTable(r, tab);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(23, 54, 93);
    if (y > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage();
      y = 40;
    }
    doc.text(t.title, 40, y + 10);
    autoTable(doc, {
      startY: y + 18,
      margin: { left: 40, right: 40 },
      head: [t.head],
      body: t.rows.length ? t.rows : [[{ content: "No movement data available for this month.", colSpan: t.head.length, styles: { halign: "center" } }]],
      styles: { fontSize: 9, cellPadding: 4.5, lineColor: [226, 232, 240], lineWidth: 0.5 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;
  }
  return Buffer.from(doc.output("arraybuffer"));
}
