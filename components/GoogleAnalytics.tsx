const googleTag = `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-8SNLQK3R0B');`;

export function GoogleAnalytics() {
  return (
    <>
      <script
        id="google-analytics-loader"
        async
        src="https://www.googletagmanager.com/gtag/js?id=G-8SNLQK3R0B"
      />
      <script
        id="google-analytics-config"
        dangerouslySetInnerHTML={{ __html: googleTag }}
      />
    </>
  );
}
