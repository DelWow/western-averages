import Script from 'next/script';

interface MicrosoftClarityProps {
  projectId: string;
  nonce?: string;
}

export default function MicrosoftClarity({
  projectId,
  nonce,
}: MicrosoftClarityProps) {
  return (
    <Script id="microsoft-clarity" strategy="afterInteractive" nonce={nonce}>
      {`
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", ${JSON.stringify(projectId)});
      `}
    </Script>
  );
}
