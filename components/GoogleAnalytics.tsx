// One Google tag per page, sending every visit to each analytics property listed here.
const measurementIds = ["G-8SNLQK3R0B", "G-9QK6B1XMN1"];

const googleTag = `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
${measurementIds.map((id) => `gtag('config', '${id}');`).join("\n")}`;

export function GoogleAnalytics() {
  return (
    <>
      <script
        id="google-analytics-loader"
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementIds[0]}`}
      />
      <script
        id="google-analytics-config"
        dangerouslySetInnerHTML={{ __html: googleTag }}
      />
    </>
  );
}
