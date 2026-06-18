import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="no">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <title>Pestulus</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <meta name="description" content="Identifiser norske skadedyr med kameraet ditt." />
        <meta property="og:locale" content="no_NO" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Pestulus" />
        <meta property="og:title" content="Pestulus" />
        <meta property="og:description" content="Identifiser norske skadedyr med kameraet ditt." />
        <meta property="og:url" content="https://pestul.us/" />
        <meta property="og:image" content="https://pestul.us/social-card.png?v=1" />
        <meta property="og:image:secure_url" content="https://pestul.us/social-card.png?v=1" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Pestulus - identifiser skadedyr med kameraet ditt" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Pestulus" />
        <meta name="twitter:description" content="Identifiser norske skadedyr med kameraet ditt." />
        <meta name="twitter:image" content="https://pestul.us/social-card.png?v=1" />

        {/* PWA / homescreen */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Pestulus" />
        <meta name="theme-color" content="#15171A" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon.png" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="manifest" href="/manifest.json" />

        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                background-color: #1F2226;
                padding: 0;
                margin: 0;
              }

              #root {
                background-color: #15171A;
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
