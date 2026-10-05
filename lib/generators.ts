export const characterSets = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?",
};
export function secureRandomInt(max: number): number {
  if (!Number.isInteger(max) || max < 1 || max > 256)
    throw new Error("Invalid random sample size.");
  const limit = 256 - (256 % max);
  const random = new Uint8Array(1);
  do {
    crypto.getRandomValues(random);
  } while (random[0] >= limit);
  return random[0] % max;
}
export function generatePassword(
  length: number,
  selected: (keyof typeof characterSets)[],
): string {
  if (!selected.length) throw new Error("Select at least one character set.");
  if (!Number.isInteger(length) || length < 8 || length > 64)
    throw new Error("Choose a length from 8 to 64.");
  const pool = selected.map((key) => characterSets[key]).join("");
  for (;;) {
    const password = Array.from(
      { length },
      () => pool[secureRandomInt(pool.length)],
    ).join("");
    if (
      selected.every((key) =>
        [...password].some((character) =>
          characterSets[key].includes(character),
        ),
      )
    )
      return password;
  }
}

export const unitGroups: Record<
  string,
  Record<string, { name: string; factor: number }>
> = {
  length: {
    m: { name: "Meters", factor: 1 },
    km: { name: "Kilometers", factor: 1000 },
    cm: { name: "Centimeters", factor: 0.01 },
    mm: { name: "Millimeters", factor: 0.001 },
    in: { name: "Inches", factor: 0.0254 },
    ft: { name: "Feet", factor: 0.3048 },
    yd: { name: "Yards", factor: 0.9144 },
    mi: { name: "Miles", factor: 1609.344 },
  },
  mass: {
    kg: { name: "Kilograms", factor: 1 },
    g: { name: "Grams", factor: 0.001 },
    mg: { name: "Milligrams", factor: 0.000001 },
    lb: { name: "Pounds", factor: 0.45359237 },
    oz: { name: "Ounces", factor: 0.028349523125 },
    t: { name: "Metric tonnes", factor: 1000 },
  },
  temperature: {
    C: { name: "Celsius", factor: 1 },
    F: { name: "Fahrenheit", factor: 1 },
    K: { name: "Kelvin", factor: 1 },
  },
  data: {
    B: { name: "Bytes", factor: 1 },
    bit: { name: "Bits", factor: 0.125 },
    KB: { name: "Kilobytes (1,000 B)", factor: 1000 },
    MB: { name: "Megabytes", factor: 1e6 },
    GB: { name: "Gigabytes", factor: 1e9 },
    TB: { name: "Terabytes", factor: 1e12 },
    KiB: { name: "Kibibytes (1,024 B)", factor: 1024 },
    MiB: { name: "Mebibytes", factor: 1024 ** 2 },
    GiB: { name: "Gibibytes", factor: 1024 ** 3 },
    TiB: { name: "Tebibytes", factor: 1024 ** 4 },
  },
};
export function convertUnit(
  value: number,
  group: string,
  from: string,
  to: string,
): number {
  if (!Number.isFinite(value)) throw new Error("Enter a finite number.");
  const units = unitGroups[group];
  if (!units?.[from] || !units?.[to]) throw new Error("Choose valid units.");
  if (group === "temperature") {
    const celsius =
      from === "F"
        ? ((value - 32) * 5) / 9
        : from === "K"
          ? value - 273.15
          : value;
    if (celsius < -273.15 - 1e-9)
      throw new Error("Temperature cannot be below absolute zero.");
    return to === "F"
      ? (celsius * 9) / 5 + 32
      : to === "K"
        ? celsius + 273.15
        : celsius;
  }
  if (value < 0)
    throw new Error("Use a nonnegative amount for length, mass, and data.");
  return (value * units[from].factor) / units[to].factor;
}
