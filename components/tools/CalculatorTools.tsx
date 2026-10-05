"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import {
  compoundGrowth,
  freelanceRate,
  mortgageSchedule,
} from "@/lib/calculations";
import { downloadBlob, errorMessage } from "@/lib/browser";
import { ErrorNotice, NumberField } from "./Shared";

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${accent ? "border-violet-200 bg-violet-50 dark:border-violet-900 dark:bg-violet-950/30" : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950"}`}
    >
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p
        className={`mt-2 text-2xl font-bold tracking-tight ${accent ? "text-violet-600 dark:text-violet-400" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
function CompoundInterest() {
  const [principal, setPrincipal] = useState(10000);
  const [monthly, setMonthly] = useState(250);
  const [rate, setRate] = useState(7);
  const [years, setYears] = useState(20);
  const [selected, setSelected] = useState<number | null>(null);
  const result = useMemo(() => {
    try {
      return {
        rows: compoundGrowth(principal, monthly, rate, years),
        error: "",
      };
    } catch (error) {
      return { rows: [], error: errorMessage(error) };
    }
  }, [principal, monthly, rate, years]);
  const last = result.rows.at(-1);
  const active = result.rows.find((row) => row.year === selected) || last;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Initial investment"
          value={principal}
          onChange={setPrincipal}
          suffix="$"
        />
        <NumberField
          label="Monthly contribution"
          value={monthly}
          onChange={setMonthly}
          suffix="$"
        />
        <NumberField
          label="Annual interest rate"
          value={rate}
          onChange={setRate}
          max={100}
          suffix="%"
        />
        <NumberField
          label="Timeline"
          value={years}
          onChange={(value) => {
            setYears(value);
            setSelected(null);
          }}
          min={1}
          max={100}
          step={1}
          suffix="yrs"
        />
      </div>
      <ErrorNotice message={result.error} />
      {last && active && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Future balance" value={money(last.balance)} accent />
            <Stat label="Total contributions" value={money(last.deposits)} />
            <Stat label="Interest earned" value={money(last.interest)} />
          </div>
          <section className="rounded-xl border border-slate-200 p-5 dark:border-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Your money over time</h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Year {active.year}:{" "}
                <strong className="text-violet-600 dark:text-violet-400">
                  {money(active.balance)}
                </strong>
              </span>
            </div>
            <div
              className="mt-6 flex h-48 items-end gap-1.5"
              role="group"
              aria-label="Interactive yearly investment growth"
            >
              {result.rows.map((row) => (
                <button
                  key={row.year}
                  onClick={() => setSelected(row.year)}
                  onMouseEnter={() => setSelected(row.year)}
                  onFocus={() => setSelected(row.year)}
                  className="relative flex h-full min-w-0 flex-1 flex-col justify-end"
                  aria-label={`Year ${row.year}: balance ${money(row.balance)}, deposits ${money(row.deposits)}, interest ${money(row.interest)}`}
                  title={`Year ${row.year}: ${money(row.balance)}`}
                >
                  <span
                    className={`w-full rounded-t transition ${active.year === row.year ? "bg-violet-400" : "bg-violet-200 dark:bg-violet-800"}`}
                    style={{
                      height: `${last.balance > 0 ? (row.interest / last.balance) * 100 : 0}%`,
                    }}
                  />
                  <span
                    className={`w-full rounded-b ${active.year === row.year ? "bg-violet-700" : "bg-violet-500"}`}
                    style={{
                      height: `${last.balance > 0 ? (row.deposits / last.balance) * 100 : 0}%`,
                      minHeight: "2px",
                    }}
                  />
                </button>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-slate-400">
              <span>Year 1</span>
              <span>Year {last.year}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-[10px] text-slate-500 dark:text-slate-400">
              <span>
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-violet-500" />
                Contributions
              </span>
              <span>
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-violet-200 dark:bg-violet-800" />
                Interest
              </span>
              <span className="ml-auto">Click or focus a bar to explore</span>
            </div>
          </section>
          <div className="max-h-80 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-right text-xs">
              <caption className="sr-only">
                Annual compound growth projection
              </caption>
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
                <tr>
                  {["Year", "Deposits", "Interest", "Balance"].map((label) => (
                    <th
                      key={label}
                      scope="col"
                      className="px-4 py-3 font-medium"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr
                    key={row.year}
                    className="border-t border-slate-100 dark:border-slate-800"
                  >
                    <th scope="row" className="px-4 py-3 font-medium">
                      {row.year}
                    </th>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {money(row.deposits)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {money(row.interest)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-violet-600 dark:text-violet-400">
                      {money(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="muted text-xs">
        Illustrative USD values. Monthly compounding; contributions at
        month-end. Excludes fees, tax, inflation, and variable returns.
        Fractional years are rounded down.
      </p>
    </div>
  );
}
function MortgagePayoff() {
  const [principal, setPrincipal] = useState(300000);
  const [rate, setRate] = useState(6.5);
  const [years, setYears] = useState(30);
  const [extra, setExtra] = useState(200);
  const [showAll, setShowAll] = useState(false);
  const result = useMemo(() => {
    try {
      return {
        data: mortgageSchedule(principal, rate, years, extra),
        error: "",
      };
    } catch (error) {
      return { data: null, error: errorMessage(error) };
    }
  }, [principal, rate, years, extra]);
  const data = result.data;
  function exportCsv() {
    if (!data) return;
    const rows = [
      "Month,Payment,Principal,Interest,Balance",
      ...data.rows.map((row) =>
        [
          row.month,
          row.payment.toFixed(2),
          row.principal.toFixed(2),
          row.interest.toFixed(2),
          row.balance.toFixed(2),
        ].join(","),
      ),
    ];
    downloadBlob(
      new Blob([rows.join("\r\n")], { type: "text/csv;charset=utf-8" }),
      "mortgage-amortization.csv",
    );
  }
  const payoff = data
    ? `${Math.floor(data.rows.length / 12)}y ${data.rows.length % 12}m`
    : "";
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Outstanding loan balance"
          value={principal}
          onChange={setPrincipal}
          min={1}
          suffix="$"
        />
        <NumberField
          label="Annual interest rate"
          value={rate}
          onChange={setRate}
          max={100}
          suffix="%"
        />
        <NumberField
          label="Remaining term"
          value={years}
          onChange={setYears}
          min={1}
          max={50}
          suffix="yrs"
        />
        <NumberField
          label="Extra monthly payment"
          value={extra}
          onChange={setExtra}
          suffix="$"
        />
      </div>
      <ErrorNotice message={result.error} />
      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Base monthly payment" value={money(data.payment)} />
            <Stat label="Payoff time" value={payoff} accent />
            <Stat label="Interest saved" value={money(data.interestSaved)} />
            <Stat label="Months saved" value={String(data.monthsSaved)} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Amortization schedule</h2>
              <p className="muted mt-1 text-xs">
                Total interest: {money(data.totalInterest)} · Payment with
                extra: {money(data.payment + extra)}
              </p>
            </div>
            <button className="btn-secondary" onClick={exportCsv}>
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>
          <div className="max-h-96 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-right text-xs">
              <caption className="sr-only">
                Monthly mortgage amortization with extra payments
              </caption>
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
                <tr>
                  {["Month", "Payment", "Principal", "Interest", "Balance"].map(
                    (label) => (
                      <th
                        key={label}
                        scope="col"
                        className="whitespace-nowrap px-4 py-3 font-medium"
                      >
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {data.rows.slice(0, showAll ? undefined : 12).map((row) => (
                  <tr
                    key={row.month}
                    className="border-t border-slate-100 dark:border-slate-800"
                  >
                    <th scope="row" className="px-4 py-3 font-medium">
                      {row.month}
                    </th>
                    {[
                      row.payment,
                      row.principal,
                      row.interest,
                      row.balance,
                    ].map((value, i) => (
                      <td
                        key={i}
                        className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-400"
                      >
                        {value.toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        })}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.rows.length > 12 && (
            <button
              className="btn-secondary"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll
                ? "Show first 12 months"
                : `Show all ${data.rows.length} months`}
            </button>
          )}
        </>
      )}
      <p className="muted text-xs">
        Principal and interest estimate in USD. Excludes property taxes,
        insurance, fees, and penalties. Monthly rounding and lender rules may
        change the final result.
      </p>
    </div>
  );
}
function FreelanceCalculator() {
  const [salary, setSalary] = useState(80000);
  const [overhead, setOverhead] = useState(12000);
  const [hours, setHours] = useState(25);
  const [weeks, setWeeks] = useState(46);
  const [tax, setTax] = useState(25);
  const result = useMemo(() => {
    try {
      return {
        data: freelanceRate(salary, overhead, hours, weeks, tax),
        error: "",
      };
    } catch (error) {
      return { data: null, error: errorMessage(error) };
    }
  }, [salary, overhead, hours, weeks, tax]);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Target annual take-home pay"
          value={salary}
          onChange={setSalary}
          suffix="$"
        />
        <NumberField
          label="Annual overhead expenses"
          value={overhead}
          onChange={setOverhead}
          suffix="$"
        />
        <NumberField
          label="Billable hours per week"
          value={hours}
          onChange={setHours}
          min={1}
          max={168}
          suffix="hrs"
        />
        <NumberField
          label="Working weeks per year"
          value={weeks}
          onChange={setWeeks}
          min={1}
          max={52}
          suffix="wks"
        />
        <NumberField
          label="Estimated tax reserve"
          value={tax}
          onChange={setTax}
          max={99.9}
          suffix="%"
        />
      </div>
      <ErrorNotice message={result.error} />
      {result.data && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat
              label="Recommended hourly rate"
              value={money(result.data.hourly)}
              accent
            />
            <Stat
              label="8-hour day rate"
              value={money(result.data.hourly * 8)}
            />
            <Stat
              label="Annual revenue target"
              value={money(result.data.revenue)}
            />
          </div>
          <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-5 dark:border-violet-900 dark:bg-violet-950/20">
            <h2 className="text-sm font-semibold">Your rate breakdown</h2>
            <p className="muted mt-3">
              {money(salary)} take-home ÷ {((1 - tax / 100) * 100).toFixed(1)}%
              after tax + {money(overhead)} overhead ={" "}
              {money(result.data.revenue)} target revenue.
            </p>
            <p className="muted mt-2">
              Divide by {result.data.annualHours.toLocaleString()} billable
              hours ({hours} hours × {weeks} weeks) for{" "}
              {money(result.data.hourly)} per hour.
            </p>
          </div>
        </>
      )}
      <p className="muted text-xs">
        Planning estimate in USD. Assumes overhead is tax deductible and tax
        applies to profit. Include unpaid admin time when estimating billable
        hours.
      </p>
    </div>
  );
}
export default function CalculatorTools({ mode }: { mode: string }) {
  return mode === "compound-interest" ? (
    <CompoundInterest />
  ) : mode === "mortgage-payoff" ? (
    <MortgagePayoff />
  ) : (
    <FreelanceCalculator />
  );
}
