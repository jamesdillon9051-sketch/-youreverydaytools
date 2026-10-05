export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://youreverydaytools.weeklydelight.com"
).replace(/\/$/, "");
export const categories = [
  {
    slug: "media",
    name: "Media & files",
    description: "A lighter file. A sharper workflow.",
    color: "rose",
    icon: "image",
  },
  {
    slug: "pdf",
    name: "PDF utilities",
    description: "Make your documents work together.",
    color: "amber",
    icon: "file",
  },
  {
    slug: "developer",
    name: "Developer tools",
    description: "Less debugging. More building.",
    color: "violet",
    icon: "code",
  },
  {
    slug: "calculators",
    name: "Calculators",
    description: "Make your next move with confidence.",
    color: "emerald",
    icon: "calculator",
  },
  {
    slug: "generators",
    name: "Generators",
    description: "Small tools. Endless possibilities.",
    color: "blue",
    icon: "sparkles",
  },
] as const;
export type CategorySlug = (typeof categories)[number]["slug"];
export type Tool = {
  slug: string;
  category: CategorySlug;
  name: string;
  title: string;
  description: string;
  keywords: string[];
  icon: string;
  features: string[];
  steps: string[];
  faq: { question: string; answer: string }[];
};

export const tools: Tool[] = [
  {
    slug: "webp-to-jpg",
    category: "media",
    name: "Image converter",
    icon: "image",
    title: "Convert WebP to JPG online free",
    description:
      "Convert WebP to JPG or PNG in your browser. Batch convert images, choose quality, and download a ZIP. Your files stay on your device.",
    keywords: ["convert webp to jpg online free", "WebP to PNG converter"],
    features: ["Batch conversion", "JPG & PNG output", "ZIP download"],
    steps: [
      "Drop WebP, PNG, or JPG images into the upload area.",
      "Choose JPG or PNG and set the JPG quality.",
      "Convert locally and download individual images or a ZIP.",
    ],
    faq: [
      {
        question: "Are my images uploaded?",
        answer:
          "No. Native browser Canvas APIs convert each image on your device.",
      },
      {
        question: "What happens to transparency?",
        answer:
          "PNG preserves transparency. JPG uses a white background because JPG cannot store transparent pixels.",
      },
    ],
  },
  {
    slug: "image-compressor",
    category: "media",
    name: "Image compressor",
    icon: "compress",
    title: "Reduce image file size in browser",
    description:
      "Reduce JPG and WebP size with a quality slider, or re-encode PNG losslessly. Compare file sizes and download compressed images privately.",
    keywords: [
      "compress png without losing quality",
      "reduce image file size in browser",
    ],
    features: [
      "Instant size comparison",
      "Quality control",
      "Lossless PNG re-encoding",
    ],
    steps: [
      "Choose one or more images.",
      "Select the format and adjust JPG or WebP quality.",
      "Compare file sizes, then save the processed images.",
    ],
    faq: [
      {
        question: "Can I compress PNG without losing quality?",
        answer:
          "PNG output preserves the decoded pixels and removes original metadata. Browser re-encoding may produce a larger file; we keep the original PNG if it is smaller. No size reduction is guaranteed.",
      },
      {
        question: "Does the quality slider affect PNG?",
        answer:
          "No. The quality slider applies to lossy JPG and WebP output. PNG remains lossless.",
      },
    ],
  },
  {
    slug: "image-resizer",
    category: "media",
    name: "Image resizer",
    icon: "resize",
    title: "Bulk image resizer online",
    description:
      "Bulk resize images to custom pixel dimensions with aspect ratio control. Preview new dimensions and download your resized images in a ZIP.",
    keywords: ["bulk image resizer online", "resize image pixels"],
    features: ["Custom dimensions", "Aspect ratio lock", "Batch downloads"],
    steps: [
      "Add the images you want to resize.",
      "Enter the width and height; lock the aspect ratio to fit within the bounds.",
      "Resize and download all results.",
    ],
    faq: [
      {
        question: "How does aspect ratio lock work?",
        answer:
          "Each image fits inside the width and height bounds while preserving its own proportions.",
      },
      {
        question: "Will resizing improve image quality?",
        answer:
          "Reducing dimensions can reduce file size. Enlarging an image cannot recover missing detail.",
      },
    ],
  },
  {
    slug: "merge-pdf",
    category: "pdf",
    name: "PDF merger",
    icon: "merge",
    title: "Merge PDF files online free no limit",
    description:
      "Combine PDFs securely without upload. Reorder files, merge every page locally, and download one PDF. No accounts or artificial file limits.",
    keywords: [
      "merge pdf files online free no limit",
      "combine pdfs securely without upload",
    ],
    features: [
      "Drag to reorder",
      "No artificial file limit",
      "Private processing",
    ],
    steps: [
      "Select two or more PDF documents.",
      "Drag files or use arrow buttons to set their order.",
      "Click Merge PDFs and save the combined document.",
    ],
    faq: [
      {
        question: "Is there a file limit?",
        answer:
          "There is no artificial file-count limit. Available browser memory determines what your device can process.",
      },
      {
        question: "Can I merge encrypted PDFs?",
        answer:
          "Password-protected or encrypted PDFs are not supported. Unlock a permitted copy first. Interactive forms and bookmarks may not carry over.",
      },
    ],
  },
  {
    slug: "split-pdf",
    category: "pdf",
    name: "PDF splitter",
    icon: "split",
    title: "Split PDF pages free",
    description:
      "Extract selected PDF pages for free using ranges like 1-3, 5. Download a new document instantly after local browser processing.",
    keywords: ["split pdf pages free", "extract PDF pages online"],
    features: [
      "Flexible page ranges",
      "Page count detection",
      "Local extraction",
    ],
    steps: [
      "Select a PDF document.",
      "Enter page numbers or ranges, such as 1-3, 5.",
      "Extract the selection and download a new PDF.",
    ],
    faq: [
      {
        question: "Does the original PDF change?",
        answer: "No. A separate document is created from your selected pages.",
      },
      {
        question: "Can I change the page order?",
        answer:
          "Yes. Ranges are processed in the entered order, and repeated pages are included once.",
      },
    ],
  },
  {
    slug: "image-to-pdf",
    category: "pdf",
    name: "Image to PDF",
    icon: "file-image",
    title: "Convert JPG to PDF online",
    description:
      "Convert JPG, PNG, or WebP images into a PDF locally. Choose A4 or Letter, page margins, and one or multiple images per page.",
    keywords: ["convert jpg to pdf online", "images to PDF converter"],
    features: ["A4 & Letter pages", "Custom margins", "Multi-image layouts"],
    steps: [
      "Choose JPG, PNG, or WebP images in your preferred order.",
      "Select a page size, margin, and images per page.",
      "Create and download your PDF.",
    ],
    faq: [
      {
        question: "Can I put several images on one page?",
        answer:
          "Yes. Choose one, two, or four images per page. Each image fits inside its cell without stretching.",
      },
      {
        question: "Is text searchable?",
        answer:
          "These PDFs contain images. This tool does not perform optical character recognition.",
      },
    ],
  },
  {
    slug: "json-formatter",
    category: "developer",
    name: "JSON formatter",
    icon: "code",
    title: "Online JSON formatter and tree viewer",
    description:
      "Beautify JSON, minify data, and explore a collapsible tree with syntax highlighting. Validate and copy JSON entirely in your browser.",
    keywords: ["online json formatter and tree viewer", "beautify json"],
    features: ["Syntax highlighting", "Collapsible tree", "Beautify & minify"],
    steps: [
      "Paste your JSON into the editor.",
      "Choose Beautify or Minify; invalid JSON shows an error.",
      "Explore the tree or copy the formatted output.",
    ],
    faq: [
      {
        question: "Is sensitive JSON safe here?",
        answer:
          "The formatter parses data locally and does not send it to a server.",
      },
      {
        question: "Are large integers preserved?",
        answer:
          "JSON uses JavaScript numbers. Integers beyond Number.MAX_SAFE_INTEGER can lose precision. Store such identifiers as strings.",
      },
    ],
  },
  {
    slug: "base64",
    category: "developer",
    name: "Base64 encoder",
    icon: "binary",
    title: "Base64 encoder decoder online",
    description:
      "Encode and decode Base64 text with UTF-8 support, convert binary files, and download decoded bytes. Everything runs in your browser.",
    keywords: ["base64 encoder decoder online", "Base64 binary converter"],
    features: ["Unicode support", "Binary file support", "Live conversion"],
    steps: [
      "Choose Encode or Decode.",
      "Type text, paste Base64, or select a binary file to encode.",
      "Copy the result or download the decoded bytes.",
    ],
    faq: [
      {
        question: "Is Base64 encryption?",
        answer: "No. Base64 is reversible encoding and provides no secrecy.",
      },
      {
        question: "Can I decode an image?",
        answer:
          "Yes. Paste the Base64 bytes, optionally including the data URL prefix, then download the decoded binary file.",
      },
    ],
  },
  {
    slug: "regex-tester",
    category: "developer",
    name: "Regex tester",
    icon: "regex",
    title: "Regex tester with live match highlighting",
    description:
      "Test JavaScript regular expressions with live highlighting, flags, capture groups, and syntax validation in a protected browser worker.",
    keywords: [
      "regex tester with live match highlighting",
      "JavaScript regex tester",
    ],
    features: [
      "Live match highlighting",
      "Capture groups",
      "Execution timeout",
    ],
    steps: [
      "Enter a JavaScript regex pattern and flags.",
      "Add sample text to test.",
      "Inspect highlighted matches and capture groups.",
    ],
    faq: [
      {
        question: "Which regex engine is used?",
        answer:
          "Your browser's JavaScript RegExp engine runs the expression inside an isolated web worker.",
      },
      {
        question: "Why can a pattern time out?",
        answer:
          "Patterns with excessive backtracking can take a long time. The worker is stopped after one second to keep the page responsive.",
      },
    ],
  },
  {
    slug: "compound-interest",
    category: "calculators",
    name: "Compound interest",
    icon: "chart",
    title: "Compound interest calculator with monthly contributions",
    description:
      "Estimate compound growth with monthly contributions. Explore an interactive yearly breakdown of your deposits, interest, and future balance.",
    keywords: ["compound interest calculator with monthly contributions"],
    features: [
      "Monthly contributions",
      "Interactive growth chart",
      "Year-by-year breakdown",
    ],
    steps: [
      "Enter your starting balance and monthly contribution.",
      "Set the annual rate and investment timeline.",
      "Explore projected deposits and growth each year.",
    ],
    faq: [
      {
        question: "When are contributions added?",
        answer:
          "Interest compounds monthly and contributions are added at the end of each month.",
      },
      {
        question: "Are returns guaranteed?",
        answer:
          "No. This is a fixed-rate illustration that excludes tax, fees, inflation, and changing returns.",
      },
    ],
  },
  {
    slug: "mortgage-payoff",
    category: "calculators",
    name: "Mortgage payoff",
    icon: "home",
    title: "Mortgage payoff amortization estimator",
    description:
      "Estimate mortgage payments and payoff savings from extra monthly payments. Download a full amortization schedule and compare interest costs.",
    keywords: [
      "mortgage payoff amortization estimator",
      "extra mortgage payments calculator",
    ],
    features: ["Extra payment modeling", "Amortization schedule", "CSV export"],
    steps: [
      "Enter your outstanding principal, annual rate, and remaining term.",
      "Add an optional extra monthly payment.",
      "Compare payoff time and download the amortization table.",
    ],
    faq: [
      {
        question: "Does this include taxes and insurance?",
        answer:
          "No. Payments cover principal and interest only. Taxes, insurance, lender fees, and prepayment penalties are excluded.",
      },
      {
        question: "How are extra payments applied?",
        answer:
          "Extra payments reduce principal each month after interest is charged. Your lender's actual rules may differ.",
      },
    ],
  },
  {
    slug: "freelance-rate",
    category: "calculators",
    name: "Freelance rate",
    icon: "briefcase",
    title: "Freelance hourly rate calculator",
    description:
      "Calculate a sustainable freelance hourly rate using your target take-home income, overhead, tax reserve, working weeks, and billable hours.",
    keywords: [
      "freelance hourly rate calculator",
      "freelance pricing calculator",
    ],
    features: ["Overhead included", "Tax reserve", "Billable-hour planning"],
    steps: [
      "Enter your target annual take-home pay and business expenses.",
      "Set billable hours, working weeks, and estimated tax reserve.",
      "Review the hourly, daily, and annual revenue targets.",
    ],
    faq: [
      {
        question: "How is the rate calculated?",
        answer:
          "Required revenue equals target take-home pay divided by one minus the tax rate, plus deductible overhead. Divide revenue by annual billable hours.",
      },
      {
        question: "Is this tax advice?",
        answer:
          "No. It uses a simplified flat tax reserve and assumes overhead is deductible. Use your actual local tax rules when setting prices.",
      },
    ],
  },
  {
    slug: "qr-code",
    category: "generators",
    name: "QR code generator",
    icon: "qr",
    title: "Free QR code generator with logo",
    description:
      "Create custom QR codes with colors, a logo, and error correction. Export sharp SVG or high-resolution PNG directly from your browser.",
    keywords: ["free qr code generator with logo", "QR code SVG PNG export"],
    features: ["Custom logo & colors", "Error correction", "SVG & PNG exports"],
    steps: [
      "Enter the text or URL you want to encode.",
      "Customize colors and optionally add a small logo.",
      "Choose export resolution, download, and test with your phone.",
    ],
    faq: [
      {
        question: "Do QR codes expire?",
        answer:
          "The QR itself never expires. A linked website may change or become unavailable.",
      },
      {
        question: "Will adding a logo affect scanning?",
        answer:
          "A logo covers part of the code. High error correction and a small logo improve resilience, but always scan-test the exported result.",
      },
    ],
  },
  {
    slug: "password-generator",
    category: "generators",
    name: "Password generator",
    icon: "key",
    title: "Strong random password generator secure",
    description:
      "Generate secure random passwords with browser cryptography. Choose 8–64 characters, customize character sets, and copy with one click.",
    keywords: [
      "strong random password generator secure",
      "secure password generator",
    ],
    features: [
      "Cryptographic randomness",
      "8–64 characters",
      "Custom character sets",
    ],
    steps: [
      "Choose a password length from 8 to 64 characters.",
      "Select the character sets to include.",
      "Generate a password and copy it to your password manager.",
    ],
    faq: [
      {
        question: "How are passwords generated?",
        answer:
          "crypto.getRandomValues supplies random bytes. Rejection sampling avoids modulo bias, and every selected character set is represented.",
      },
      {
        question: "Do you store passwords?",
        answer:
          "No. Passwords stay in page memory. They are never uploaded or saved by this site.",
      },
    ],
  },
  {
    slug: "unit-converter",
    category: "generators",
    name: "Unit & currency converter",
    icon: "arrows",
    title: "Unit and currency converter online",
    description:
      "Convert length, mass, temperature, data units, and currencies locally. Set your own exchange rates for private, offline currency calculations.",
    keywords: [
      "unit and currency converter online",
      "length mass temperature data converter",
    ],
    features: [
      "Four unit categories",
      "Editable currency rates",
      "Instant results",
    ],
    steps: [
      "Choose length, mass, temperature, data, or currency.",
      "Select the source and target units and enter an amount.",
      "For currency, enter current rates; read the converted result.",
    ],
    faq: [
      {
        question: "Are currency rates live?",
        answer:
          "No. Currency rates are user-entered reference values in units per USD. The initial 1.0 values are uncalibrated; enter current rates before relying on a conversion.",
      },
      {
        question: "What is the difference between MB and MiB?",
        answer:
          "One MB is 1,000,000 bytes; one MiB is 1,048,576 bytes. Both decimal and binary data units are supported.",
      },
    ],
  },
];

export function toolPath(tool: Tool) {
  return `/tools/${tool.category}/${tool.slug}/`;
}
export function absoluteUrl(path: string) {
  return `${siteUrl}${path}`;
}
