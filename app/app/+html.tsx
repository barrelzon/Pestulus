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
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/favicon-512.png?v=2" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/favicon-192.png?v=2" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon.png?v=2" />
        <link rel="icon" href="/favicon.ico?v=2" sizes="any" />
        <link rel="manifest" href="/manifest.json" />

        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                background-color: #1F2226;
                padding: 0;
                margin: 0;
                -webkit-touch-callout: none;
                -webkit-user-select: none;
                user-select: none;
              }

              #root {
                background-color: #15171A;
              }

              input,
              textarea,
              [contenteditable="true"],
              [data-text-selectable="true"],
              [data-text-selectable="true"] * {
                -webkit-touch-callout: default;
                -webkit-user-select: text;
                user-select: text;
              }

              img,
              picture,
              video,
              canvas,
              [role="img"] {
                -webkit-user-drag: none;
                user-drag: none;
              }
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener('dragstart', function (event) {
                var target = event.target;
                if (target instanceof Element && target.closest('img, picture, video, canvas, [role="img"]')) {
                  event.preventDefault();
                }
              }, true);

              document.addEventListener('contextmenu', function (event) {
                var node = event.target instanceof Element ? event.target : null;
                while (node && node !== document.documentElement) {
                  if (
                    node.matches('img, picture, video, canvas, [role="img"]') ||
                    window.getComputedStyle(node).backgroundImage !== 'none'
                  ) {
                    event.preventDefault();
                    return;
                  }
                  node = node.parentElement;
                }
              }, true);
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
