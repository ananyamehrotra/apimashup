import { useEffect, useRef, useState } from 'react';
import Globe from 'react-globe.gl';

const IDLE_ALTITUDE = 1.55; // close enough that the globe fills most of the screen
const IDLE_ALTITUDE_SMALL = 3.1; // narrow screens need more distance to fit it
const LANDED_ALTITUDE = 0.75;
const FAST_SPIN_MS = 1300;
const ZOOM_MS = 2200;

const isSmallScreen = () => window.matchMedia('(max-width: 640px)').matches;

// `spinId` changes on every spin; the globe whirls, then flies to `target`
// and calls `onLanded`. `paused` stops rendering while the sheet covers it.
export default function GlobeView({ target, spinId, onLanded, paused }) {
  const wrapRef = useRef(null);
  const globeRef = useRef(null);
  const onLandedRef = useRef(onLanded);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [ready, setReady] = useState(false);
  const [landed, setLanded] = useState(false);
  const [small] = useState(isSmallScreen);

  useEffect(() => {
    onLandedRef.current = onLanded;
  }, [onLanded]);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(wrapRef.current);
    return () => observer.disconnect();
  }, []);

  const handleReady = () => {
    const globe = globeRef.current;
    const controls = globe.controls();
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.6;
    // Phones get a cheaper render so the globe doesn't lag.
    globe.renderer().setPixelRatio(Math.min(window.devicePixelRatio, small ? 1 : 2));
    globe.pointOfView({ altitude: small ? IDLE_ALTITUDE_SMALL : IDLE_ALTITUDE });
    setReady(true);
  };

  useEffect(() => {
    if (!ready || !spinId || !target) return;
    const globe = globeRef.current;
    const controls = globe.controls();
    setLanded(false);
    globe.pointOfView({ altitude: small ? IDLE_ALTITUDE_SMALL : IDLE_ALTITUDE });
    controls.autoRotate = true;
    controls.autoRotateSpeed = 45;

    let landTimer;
    const zoomTimer = setTimeout(() => {
      controls.autoRotate = false;
      globe.pointOfView({ lat: target.lat, lng: target.lng, altitude: LANDED_ALTITUDE }, ZOOM_MS);
      landTimer = setTimeout(() => {
        setLanded(true);
        onLandedRef.current?.();
      }, ZOOM_MS + 100);
    }, FAST_SPIN_MS);

    return () => {
      clearTimeout(zoomTimer);
      clearTimeout(landTimer);
    };
  }, [ready, spinId, target, small]);

  useEffect(() => {
    if (!ready) return;
    if (paused) globeRef.current.pauseAnimation();
    else globeRef.current.resumeAnimation();
  }, [ready, paused]);

  return (
    <div ref={wrapRef} className="h-full w-full">
      {size.width > 0 && (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="/textures/earth-blue-marble.jpg"
          bumpImageUrl={small ? null : '/textures/earth-topology.png'}
          atmosphereColor="#9db4ff"
          atmosphereAltitude={small ? 0.15 : 0.25}
          rendererConfig={{ antialias: !small, alpha: true, powerPreference: 'high-performance' }}
          onGlobeReady={handleReady}
          ringsData={landed && target ? [target] : []}
          ringColor={() => (t) => `rgba(251, 191, 36, ${1 - t})`}
          ringMaxRadius={small ? 5 : 7}
          ringPropagationSpeed={3}
          ringRepeatPeriod={700}
        />
      )}
    </div>
  );
}
