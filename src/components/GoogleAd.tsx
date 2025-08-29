import React, { useEffect } from 'react';

declare global {
  interface Window {
    adsbygoogle: any;
  }
}

const GoogleAd: React.FC = () => {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error("AdSense error:", e);
    }
  }, []);

  return (
    <div style={{ textAlign: 'center', margin: '16px 0' }}>
      <ins className="adsbygoogle"
           style={{ display: 'block' }}
           data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" // 본인의 게시자 ID로 교체
           data-ad-slot="YYYYYYYYYY"             // 본인의 광고 슬롯 ID로 교체
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
    </div>
  );
};

export default GoogleAd;