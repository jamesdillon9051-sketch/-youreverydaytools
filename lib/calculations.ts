export function parsePageRanges(input: string, pageCount: number): number[] {
  if (!input.trim())
    throw new Error("Enter at least one page number or range.");
  const pages = new Set<number>();
  for (const item of input.split(",")) {
    const match = item.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match)
      throw new Error(
        `Invalid range: ${item.trim() || "empty entry"}. Use a format like 1-3, 5.`,
      );
    const start = Number(match[1]);
    const end = Number(match[2] || match[1]);
    if (start < 1 || end > pageCount || start > end)
      throw new Error(
        `Pages must be between 1 and ${pageCount}, with ascending ranges.`,
      );
    for (let page = start; page <= end; page++) pages.add(page - 1);
  }
  return [...pages];
}

export type GrowthRow = {
  year: number;
  deposits: number;
  interest: number;
  balance: number;
};
export function compoundGrowth(
  principal: number,
  monthly: number,
  rate: number,
  years: number,
): GrowthRow[] {
  if (
    ![principal, monthly, rate, years].every(Number.isFinite) ||
    principal < 0 ||
    monthly < 0 ||
    rate < 0 ||
    rate > 100 ||
    years < 1 ||
    years > 100
  )
    throw new Error(
      "Use nonnegative amounts, an annual rate of 0–100%, and a timeline of 1–100 years.",
    );
  let balance = principal;
  const rows: GrowthRow[] = [];
  for (let month = 1; month <= Math.floor(years) * 12; month++) {
    balance = balance * (1 + rate / 1200) + monthly;
    if (month % 12 === 0) {
      const deposits = principal + monthly * month;
      rows.push({
        year: month / 12,
        deposits,
        interest: balance - deposits,
        balance,
      });
    }
  }
  return rows;
}

export type MortgageRow = {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
};
export function mortgageSchedule(
  principal: number,
  rate: number,
  years: number,
  extra: number,
) {
  if (
    ![principal, rate, years, extra].every(Number.isFinite) ||
    principal <= 0 ||
    rate < 0 ||
    rate > 100 ||
    years < 1 ||
    years > 50 ||
    extra < 0
  )
    throw new Error(
      "Enter a positive balance, a 0–100% rate, 1–50 years, and nonnegative extra payments.",
    );
  const months = Math.round(years * 12);
  const monthlyRate = rate / 1200;
  const payment =
    monthlyRate === 0
      ? principal / months
      : (principal * monthlyRate) / (1 - (1 + monthlyRate) ** -months);
  function schedule(additional: number) {
    let balance = principal;
    const rows: MortgageRow[] = [];
    for (let month = 1; month <= months + 1 && balance > 0.0000001; month++) {
      const interest = balance * monthlyRate;
      const actualPayment = Math.min(payment + additional, balance + interest);
      const paidPrincipal = actualPayment - interest;
      balance = Math.max(0, balance - paidPrincipal);
      rows.push({
        month,
        payment: actualPayment,
        principal: paidPrincipal,
        interest,
        balance,
      });
    }
    return rows;
  }
  const baseline = schedule(0);
  const rows = schedule(extra);
  const totalInterest = rows.reduce((sum, row) => sum + row.interest, 0);
  const baselineInterest = baseline.reduce((sum, row) => sum + row.interest, 0);
  return {
    payment,
    rows,
    totalInterest,
    interestSaved: Math.max(0, baselineInterest - totalInterest),
    monthsSaved: Math.max(0, baseline.length - rows.length),
  };
}

export function freelanceRate(
  salary: number,
  overhead: number,
  hours: number,
  weeks: number,
  tax: number,
) {
  if (
    ![salary, overhead, hours, weeks, tax].every(Number.isFinite) ||
    salary < 0 ||
    overhead < 0 ||
    hours <= 0 ||
    hours > 168 ||
    weeks <= 0 ||
    weeks > 52 ||
    tax < 0 ||
    tax >= 100
  )
    throw new Error(
      "Use nonnegative amounts, positive billable hours and working weeks, and a tax rate below 100%.",
    );
  const revenue = salary / (1 - tax / 100) + overhead;
  return {
    revenue,
    hourly: revenue / (hours * weeks),
    annualHours: hours * weeks,
  };
}
