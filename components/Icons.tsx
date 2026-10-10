import {
  ArrowLeftRight,
  Binary,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  Code2,
  Combine,
  FileImage,
  FileText,
  House,
  Image,
  KeyRound,
  Maximize2,
  Minimize2,
  QrCode,
  Regex,
  Scissors,
  Sparkles,
  Calculator,
  Download,
} from "lucide-react";

const icons = {
  image: Image,
  compress: Minimize2,
  resize: Maximize2,
  file: FileText,
  merge: Combine,
  split: Scissors,
  "file-image": FileImage,
  code: Code2,
  binary: Binary,
  regex: Regex,
  chart: ChartNoAxesCombined,
  home: House,
  briefcase: BriefcaseBusiness,
  qr: QrCode,
  key: KeyRound,
  arrows: ArrowLeftRight,
  sparkles: Sparkles,
  calculator: Calculator,
  download: Download,
};
export function ToolIcon({
  name,
  className = "h-5 w-5",
}: {
  name: string;
  className?: string;
}) {
  const Icon = icons[name as keyof typeof icons] || Sparkles;
  return <Icon className={className} aria-hidden="true" strokeWidth={1.7} />;
}
export const categoryColors: Record<string, string> = {
  social: "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400",
  media: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400",
  pdf: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
  developer:
    "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400",
  calculators:
    "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
  generators: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
};
