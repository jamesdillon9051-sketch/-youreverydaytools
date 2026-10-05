"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftRight,
  Download,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  canvasBlob,
  createCanvas,
  downloadBlob,
  errorMessage,
  loadImage,
} from "@/lib/browser";
import {
  characterSets,
  convertUnit,
  generatePassword,
  unitGroups,
} from "@/lib/generators";
import { CopyButton, ErrorNotice, FileDropzone, NumberField } from "./Shared";

function QrGenerator() {
  const [text, setText] = useState("https://example.com");
  const [foreground, setForeground] = useState("#0f172a");
  const [background, setBackground] = useState("#ffffff");
  const [level, setLevel] = useState<"L" | "M" | "Q" | "H">("M");
  const [size, setSize] = useState(1024);
  const [logo, setLogo] = useState("");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [readingLogo, setReadingLogo] = useState(false);
  const logoRevision = useRef(0);
  useEffect(() => {
    let active = true;
    setSvg("");
    setError("");
    setBusy(true);
    const timer = setTimeout(async () => {
      try {
        if (!text.trim())
          throw new Error("Enter a URL or text to generate a QR code.");
        if (new TextEncoder().encode(text).length > 2000)
          throw new Error(
            "Keep your QR content under 2,000 UTF-8 bytes. High error correction allows less content.",
          );
        const { default: QRCode } = await import("qrcode");
        let result = await QRCode.toString(text, {
          type: "svg",
          errorCorrectionLevel: logo ? "H" : level,
          margin: 4,
          color: { dark: foreground, light: background },
        });
        if (logo) {
          const bounds = result.match(/viewBox="0 0 (\d+) (\d+)"/);
          if (!bounds) throw new Error("Unable to embed the logo.");
          const extent = Number(bounds[1]);
          const logoSize = extent * 0.16;
          const start = (extent - logoSize) / 2;
          result = result.replace(
            "</svg>",
            `<rect x="${start - 1}" y="${start - 1}" width="${logoSize + 2}" height="${logoSize + 2}" fill="${background}"/><image href="${logo}" x="${start}" y="${start}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/></svg>`,
          );
        }
        if (active) {
          setSvg(result);
          setError("");
        }
      } catch (failure) {
        if (active) setError(errorMessage(failure));
      } finally {
        if (active) setBusy(false);
      }
    }, 180);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [text, foreground, background, level, logo]);
  async function addLogo(files: File[]) {
    const file = files[0];
    if (!file) return;
    const revision = ++logoRevision.current;
    setReadingLogo(true);
    setError("");
    try {
      if (!/image\/(png|jpeg|webp)/.test(file.type))
        throw new Error("Choose a PNG, JPG, or WebP logo.");
      if (file.size > 5 * 1024 * 1024)
        throw new Error("Use a logo under 5 MB.");
      const image = await loadImage(file);
      const { canvas, context } = createCanvas(256, 256);
      const scale = Math.min(
        256 / image.naturalWidth,
        256 / image.naturalHeight,
      );
      const w = image.naturalWidth * scale,
        h = image.naturalHeight * scale;
      context.drawImage(image, (256 - w) / 2, (256 - h) / 2, w, h);
      if (revision === logoRevision.current) {
        setLogo(canvas.toDataURL("image/png"));
        setLevel("H");
      }
    } catch (failure) {
      if (revision === logoRevision.current) setError(errorMessage(failure));
    } finally {
      if (revision === logoRevision.current) setReadingLogo(false);
    }
  }
  async function downloadPng() {
    try {
      const image = await loadImage(new Blob([svg], { type: "image/svg+xml" }));
      const { canvas, context } = createCanvas(size, size);
      context.drawImage(image, 0, 0, size, size);
      downloadBlob(await canvasBlob(canvas), "qr-code.png");
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }
  const preview = svg
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    : "";
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_260px]">
      <div className="space-y-4">
        <label className="block">
          <span className="label">Text or URL</span>
          <textarea
            className="input h-24"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="https://your-website.com"
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label>
            <span className="label">Foreground</span>
            <input
              className="input h-11 p-1"
              type="color"
              value={foreground}
              onChange={(event) => setForeground(event.target.value)}
            />
          </label>
          <label>
            <span className="label">Background</span>
            <input
              className="input h-11 p-1"
              type="color"
              value={background}
              onChange={(event) => setBackground(event.target.value)}
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label>
            <span className="label">Error correction</span>
            <select
              className="input"
              value={logo ? "H" : level}
              disabled={!!logo}
              onChange={(event) => setLevel(event.target.value as typeof level)}
            >
              <option value="L">Low · 7%</option>
              <option value="M">Medium · 15%</option>
              <option value="Q">Quartile · 25%</option>
              <option value="H">High · 30%</option>
            </select>
          </label>
          <label>
            <span className="label">PNG resolution</span>
            <select
              className="input"
              value={size}
              onChange={(event) => setSize(Number(event.target.value))}
            >
              <option value={512}>512 × 512</option>
              <option value={1024}>1024 × 1024</option>
              <option value={2048}>2048 × 2048</option>
              <option value={4096}>4096 × 4096</option>
            </select>
          </label>
        </div>
        <FileDropzone
          accept="image/png,image/jpeg,image/webp"
          multiple={false}
          onFiles={(files) => void addLogo(files)}
          disabled={readingLogo}
          label={readingLogo ? "Reading logo…" : "Add a logo (optional)"}
          hint="PNG, JPG, WebP · Up to 5 MB"
        />
        {logo && (
          <button
            onClick={() => {
              logoRevision.current++;
              setLogo("");
              setReadingLogo(false);
            }}
            className="btn-secondary"
          >
            <X className="h-4 w-4" /> Remove logo
          </button>
        )}
        <ErrorNotice message={error} />
        <p className="muted text-xs">
          Use a dark foreground on a light background. Logo mode uses high error
          correction. Always scan-test your export before printing.
        </p>
      </div>
      <div className="flex flex-col items-center">
        <div className="flex aspect-square w-full max-w-[260px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700">
          {svg ? (
            <img
              src={preview}
              alt="Generated QR code"
              width={220}
              height={220}
              className="h-full w-full"
            />
          ) : (
            <span className="text-xs text-slate-400" role="status">
              {busy ? "Generating…" : "QR preview"}
            </span>
          )}
        </div>
        <p className="my-4 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="h-3.5 w-3.5" /> Static QR · No expiration
        </p>
        <div className="flex w-full flex-col gap-2">
          <button
            disabled={!svg || readingLogo}
            className="btn"
            onClick={() => void downloadPng()}
          >
            <Download className="h-4 w-4" /> Download PNG
          </button>
          <button
            disabled={!svg || readingLogo}
            className="btn-secondary"
            onClick={() =>
              downloadBlob(
                new Blob([svg], { type: "image/svg+xml" }),
                "qr-code.svg",
              )
            }
          >
            <Download className="h-4 w-4" /> Download SVG
          </button>
        </div>
      </div>
    </div>
  );
}
function PasswordGenerator() {
  const [length, setLength] = useState(20);
  const [selected, setSelected] = useState<(keyof typeof characterSets)[]>([
    "uppercase",
    "lowercase",
    "numbers",
    "symbols",
  ]);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  function generate() {
    try {
      setPassword(generatePassword(length, selected));
      setError("");
    } catch (failure) {
      setPassword("");
      setError(errorMessage(failure));
    }
  }
  useEffect(() => {
    try {
      setPassword(generatePassword(length, selected));
      setError("");
    } catch (failure) {
      setPassword("");
      setError(errorMessage(failure));
    }
  }, [length, selected]);
  const poolSize = selected.reduce(
    (sum, key) => sum + characterSets[key].length,
    0,
  );
  const entropy = poolSize ? length * Math.log2(poolSize) : 0;
  const strength =
    entropy >= 100
      ? "Very strong"
      : entropy >= 70
        ? "Strong"
        : entropy >= 45
          ? "Moderate"
          : "Weak";
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-900 dark:bg-violet-950/20">
        <label>
          <span className="mb-3 block text-[10px] font-bold uppercase tracking-[.15em] text-violet-500">
            Your generated password
          </span>
          <input
            className="w-full border-none bg-transparent font-mono text-xl font-semibold tracking-wide text-violet-800 outline-none dark:text-violet-200"
            readOnly
            value={password}
            aria-label="Generated password"
          />
        </label>
        <div className="mt-5 flex flex-wrap gap-3">
          <CopyButton text={password} />
          <button className="btn" onClick={generate}>
            <RefreshCw className="h-4 w-4" /> Generate again
          </button>
        </div>
      </div>
      <label className="block">
        <span className="label">
          Password length{" "}
          <span className="float-right text-violet-500">
            {length} characters
          </span>
        </span>
        <input
          className="w-full"
          type="range"
          min={8}
          max={64}
          value={length}
          onChange={(event) => setLength(Number(event.target.value))}
        />
        <span className="mt-1 flex justify-between text-[10px] text-slate-400">
          <span>8</span>
          <span>64</span>
        </span>
      </label>
      <div className="grid grid-cols-2 gap-3">
        {(Object.keys(characterSets) as (keyof typeof characterSets)[]).map(
          (key) => (
            <label
              key={key}
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-700"
            >
              <input
                type="checkbox"
                checked={selected.includes(key)}
                onChange={(event) =>
                  setSelected((current) =>
                    event.target.checked
                      ? [...current, key]
                      : current.filter((item) => item !== key),
                  )
                }
                className="h-4 w-4"
              />
              <span className="capitalize">{key}</span>
              <span className="ml-auto hidden font-mono text-[10px] text-slate-400 sm:inline">
                {key === "uppercase"
                  ? "A–Z"
                  : key === "lowercase"
                    ? "a–z"
                    : key === "numbers"
                      ? "0–9"
                      : "!@#"}
              </span>
            </label>
          ),
        )}
      </div>
      <div>
        <div className="mb-2 flex justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            Estimated strength
          </span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {password ? strength : "No character sets selected"}
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
          role="meter"
          aria-label="Password strength estimate"
          aria-valuemin={0}
          aria-valuemax={128}
          aria-valuenow={Math.min(128, Math.round(entropy))}
        >
          <div
            className={`h-full rounded-full transition-all ${entropy >= 70 ? "bg-emerald-500" : entropy >= 45 ? "bg-amber-500" : "bg-rose-500"}`}
            style={{ width: `${Math.min(100, (entropy / 128) * 100)}%` }}
          />
        </div>
        <p className="muted mt-3 text-xs">
          Strength is estimated from length and alphabet size, not a guarantee.
          Use a unique password for each account and save it in a password
          manager.
        </p>
      </div>
      <ErrorNotice message={error} />
    </div>
  );
}
const currencies: Record<string, { name: string; factor: number }> = {
  USD: { name: "US Dollar", factor: 1 },
  EUR: { name: "Euro", factor: 1 },
  GBP: { name: "British Pound", factor: 1 },
  JPY: { name: "Japanese Yen", factor: 1 },
  CAD: { name: "Canadian Dollar", factor: 1 },
  AUD: { name: "Australian Dollar", factor: 1 },
  INR: { name: "Indian Rupee", factor: 1 },
};
function UnitConverter() {
  const [group, setGroup] = useState("length");
  const [value, setValue] = useState(1);
  const [from, setFrom] = useState("m");
  const [to, setTo] = useState("ft");
  const [rates, setRates] = useState<Record<string, number>>(
    Object.fromEntries(Object.keys(currencies).map((key) => [key, 1])),
  );
  const [ratesReady, setRatesReady] = useState(false);
  const units = group === "currency" ? currencies : unitGroups[group];
  const result = useMemo(() => {
    try {
      if (group === "currency") {
        if (!ratesReady && from !== to) return { value: null, error: "" };
        if (!Number.isFinite(value) || value < 0)
          throw new Error("Enter a nonnegative finite amount.");
        if (
          ![rates[from], rates[to]].every(
            (rate) => Number.isFinite(rate) && rate > 0,
          )
        )
          throw new Error("Exchange rates must be positive numbers.");
        return { value: (value / rates[from]) * rates[to], error: "" };
      }
      return { value: convertUnit(value, group, from, to), error: "" };
    } catch (failure) {
      return { value: null, error: errorMessage(failure) };
    }
  }, [group, value, from, to, rates, ratesReady]);
  const output =
    result.value === null
      ? "—"
      : result.value.toLocaleString("en-US", { maximumSignificantDigits: 12 });
  return (
    <div className="space-y-5">
      <label className="block">
        <span className="label">Conversion category</span>
        <select
          aria-label="Conversion category"
          className="input"
          value={group}
          onChange={(event) => {
            const next = event.target.value;
            setGroup(next);
            const keys = Object.keys(
              next === "currency" ? currencies : unitGroups[next],
            );
            setFrom(keys[0]);
            setTo(keys[1]);
            if (next !== "temperature" && value < 0) setValue(0);
          }}
        >
          <option value="length">Length</option>
          <option value="mass">Mass</option>
          <option value="temperature">Temperature</option>
          <option value="data">Data storage</option>
          <option value="currency">Currency · user-entered rates</option>
        </select>
      </label>
      <NumberField
        label="Amount"
        value={value}
        onChange={setValue}
        min={group === "temperature" ? -459.67 : 0}
      />
      <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <label>
          <span className="label">From</span>
          <select
            aria-label="From"
            className="input"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          >
            {Object.entries(units).map(([key, unit]) => (
              <option value={key} key={key}>
                {unit.name} ({key})
              </option>
            ))}
          </select>
        </label>
        <button
          className="btn-secondary justify-self-center"
          onClick={() => {
            setFrom(to);
            setTo(from);
          }}
          aria-label="Swap source and target units"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </button>
        <label>
          <span className="label">To</span>
          <select
            aria-label="To"
            className="input"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          >
            {Object.entries(units).map(([key, unit]) => (
              <option value={key} key={key}>
                {unit.name} ({key})
              </option>
            ))}
          </select>
        </label>
      </div>
      {group === "currency" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
            Enter reference exchange rates before converting.
          </p>
          <p className="muted mt-2 text-xs">
            Rates are units per 1 USD and are never fetched. Initial 1.0 values
            are uncalibrated. For example, if 1 USD buys 0.90 EUR, enter 0.90
            for EUR.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Object.keys(currencies)
              .filter((key) => key !== "USD")
              .map((key) => (
                <NumberField
                  key={key}
                  label={`${key} per USD`}
                  value={rates[key]}
                  onChange={(rate) => {
                    setRates((current) => ({ ...current, [key]: rate }));
                    setRatesReady(false);
                  }}
                  min={0.000001}
                />
              ))}
          </div>
          <button
            onClick={() => setRatesReady(true)}
            className="btn-secondary mt-4"
          >
            Use entered reference rates
          </button>
          <p className="muted mt-3 text-xs">
            {ratesReady
              ? "Using your reference rates. Exchange fees are excluded."
              : "Result is paused until you confirm your reference rates."}
          </p>
        </div>
      )}
      <div
        aria-live="polite"
        className="rounded-2xl border border-violet-200 bg-violet-50 p-6 dark:border-violet-900 dark:bg-violet-950/30"
      >
        <p className="text-xs text-violet-500">Converted result</p>
        <p className="mt-2 break-all text-3xl font-bold tracking-tight text-violet-800 dark:text-violet-200">
          {output} <span className="text-lg font-normal">{to}</span>
        </p>
        <p className="muted mt-3 text-xs">
          {value.toLocaleString()} {from} = {output} {to}
        </p>
      </div>
      <CopyButton text={result.value === null ? "" : String(result.value)} />
      <ErrorNotice message={result.error} />
      <p className="muted text-xs">
        Results use floating-point arithmetic. Data supports decimal and binary
        units. Currency values use only your confirmed reference rates.
      </p>
    </div>
  );
}
export default function GeneratorTools({ mode }: { mode: string }) {
  return mode === "qr-code" ? (
    <QrGenerator />
  ) : mode === "password-generator" ? (
    <PasswordGenerator />
  ) : (
    <UnitConverter />
  );
}
