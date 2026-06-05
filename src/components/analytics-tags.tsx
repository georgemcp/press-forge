"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

export function AnalyticsTags() {
  const pathname = usePathname();
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const gtmId = process.env.NEXT_PUBLIC_GTM_CONTAINER_ID;

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <>
      {gtmId ? (
        <Script id="trimproof-gtm" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});
            var firstScript = document.getElementsByTagName('script')[0];
            var tagScript = document.createElement('script');
            tagScript.async = true;
            tagScript.src = 'https://www.googletagmanager.com/gtm.js?id=${gtmId}';
            firstScript.parentNode.insertBefore(tagScript, firstScript);
          `}
        </Script>
      ) : null}
      {gaId ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="trimproof-ga" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${gaId}', {
                send_page_view: true
              });
            `}
          </Script>
        </>
      ) : null}
    </>
  );
}
