import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MicroFinanceLauncher } from "../components/MicroFinanceLauncher";
import { categories, externalAppUrl, tools } from "../lib/catalog";

const microFinance = tools.find((tool) => tool.slug === "micro-finance")!;
const moduleNames = [
  "Salary Split Calculator",
  "Weekly Spending Limits",
  "Daily Safe-to-Spend",
  "Weekly Surplus Rollover",
  "Quick Expense Logger",
  "Transaction Manager",
  "Transaction Ledger",
  "Bills & Subscriptions Tracker",
  "Bills Calendar",
  "Savings Vaults",
  "Spending by Category",
  "Burn-Rate Chart",
  "Net Savings Chart",
  "Overview Dashboard",
  "Notifications",
  "Backup & Restore",
  "App features",
];

test("every tool has a unique slug, a real category, three features and three steps", () => {
  const slugs = new Set<string>();
  for (const tool of tools) {
    assert.ok(!slugs.has(tool.slug), `duplicate slug ${tool.slug}`);
    slugs.add(tool.slug);
    assert.ok(
      categories.some((category) => category.slug === tool.category),
      tool.slug,
    );
    assert.equal(tool.features.length, 3, `${tool.slug} features`);
    assert.equal(tool.steps.length, 3, `${tool.slug} steps`);
    assert.ok(tool.faq.length >= 2, `${tool.slug} faq`);
  }
});

test("Micro Finance is listed with the agreed summary and a launcher, not an embedded app", () => {
  assert.equal(microFinance.category, "calculators");
  assert.equal(microFinance.name, "Micro Finance");
  assert.equal(
    microFinance.description,
    "A private, offline budgeting app: weekly limits, safe-to-spend, bills, savings vaults and insights. Your data never leaves your device.",
  );
  assert.ok(microFinance.description.length < 160);
  assert.ok(microFinance.title.length < 70);
});

test("all 17 modules are listed in the agreed order, each explained", () => {
  assert.deepEqual(
    microFinance.modules?.map((module) => module.name),
    moduleNames,
  );
  for (const module of microFinance.modules ?? []) {
    assert.ok(module.description.length >= 40, module.name);
    assert.ok(module.description.length <= 340, module.name);
    assert.match(module.description, /[.)]$/, module.name);
  }
  // Facts that were checked against the app's source before being published.
  const text = JSON.stringify(microFinance.modules);
  for (const fact of [
    "19 expense and 6 income categories",
    "10 icons",
    "last 6 months",
    "top 4 categories plus Other",
    "2 days before and on the due date",
    "Cmd/Ctrl+K",
  ])
    assert.ok(text.includes(fact), fact);
});

test("the listing states every limit honestly, in the FAQ and in the launcher", () => {
  const faq = microFinance.faq.map((item) => item.answer).join(" ");
  const launcher = renderToStaticMarkup(
    createElement(MicroFinanceLauncher, { url: "" }),
  );
  const limits: [string, RegExp][] = [
    ["USD only", /US dollars \(USD\)/],
    ["no sync between devices", /no sync/i],
    ["no bank connection", /no bank connection/i],
    ["notifications need the app running", /suspended/i],
    ["rollover is Needs and Wants only", /Needs and Wants only/i],
  ];
  for (const [limit, pattern] of limits) {
    assert.match(faq, pattern, `FAQ: ${limit}`);
    assert.match(launcher, pattern, `launcher: ${limit}`);
  }
  assert.match(faq, /never sends your budget anywhere/);
  assert.match(faq, /payday/);
});

test("the app link accepts only plain https addresses", () => {
  assert.equal(
    externalAppUrl("https://finance.example.com"),
    "https://finance.example.com/",
  );
  assert.equal(
    externalAppUrl(" https://finance.example.com/app?x=1 "),
    "https://finance.example.com/app?x=1",
  );
  for (const rejected of [
    undefined,
    "",
    "   ",
    "finance.example.com",
    "//finance.example.com",
    "http://finance.example.com",
    "ftp://finance.example.com",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "https://user:secret@finance.example.com",
    "https://",
  ])
    assert.equal(externalAppUrl(rejected), "", String(rejected));
});

test("the launcher links out safely when configured and never invents a link when not", () => {
  const live = renderToStaticMarkup(
    createElement(MicroFinanceLauncher, {
      url: "https://finance.example.com/",
    }),
  );
  assert.match(live, /href="https:\/\/finance\.example\.com\/"/);
  assert.match(live, /target="_blank"/);
  assert.match(live, /rel="noopener noreferrer"/);
  assert.match(live, /Open Micro Finance/);
  assert.doesNotMatch(live, /not live on this site yet/);

  const pending = renderToStaticMarkup(
    createElement(MicroFinanceLauncher, { url: "" }),
  );
  assert.match(pending, /Micro Finance is not live on this site yet/);
  assert.doesNotMatch(pending, /Open Micro Finance/);
  assert.doesNotMatch(pending, /<a /);
  // Either way it explains why the app is separate and how to install it.
  for (const html of [live, pending]) {
    assert.match(html, /separate app/);
    assert.match(html, /Add to Home Screen/);
  }
});
