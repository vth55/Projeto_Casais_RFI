import { useState, useEffect } from 'react';

const getType = () => {
  if (typeof window === 'undefined') return 'desktop';
  if (window.innerWidth < 768) return 'mobile';
  if (window.innerWidth < 1024) return 'tablet';
  return 'desktop';
};

const useDeviceType = () => {
  const [deviceType, setDeviceType] = useState(getType);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const mqTablet = window.matchMedia('(max-width: 1023px)');

    const handler = () => setDeviceType(getType());

    mq.addEventListener('change', handler);
    mqTablet.addEventListener('change', handler);
    window.addEventListener('resize', handler);

    return () => {
      mq.removeEventListener('change', handler);
      mqTablet.removeEventListener('change', handler);
      window.removeEventListener('resize', handler);
    };
  }, []);

  return {
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    isFieldMode: deviceType === 'mobile' || deviceType === 'tablet',
    deviceType,
  };
};

export default useDeviceType;
