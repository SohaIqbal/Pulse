import { useState } from 'react';
import Brand from './Brand';
import { colors } from '../../theme/colors';
import Screen1 from './Screen1';
import Screen2 from './Screen2';
import Screen3 from './Screen3';

export default function HeroSection() {
  const [currentScreen, setCurrentScreen] = useState<'screen1' | 'screen2' | 'screen3'>('screen1');

  const [sessionKey, setSessionKey] = useState(0); // used to force remount of Screen2 & Screen3 when starting over

  const handleStartOver = () => {
    setSessionKey((prev) => prev + 1); // forces Screen2 & Screen3 to fully remount, wiping all internal state
    setCurrentScreen('screen2');
  };

  return (
    <section
      className="min-h-screen text-[color:var(--color-text-primary)]"
      style={{ backgroundColor: colors.background.primary, color: colors.text.primary }}
    >
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between">
          <Brand title="Pulse." />
        </header>

        <div className="relative flex-1 overflow-hidden">
          <div className="relative h-[calc(100vh-100px)] overflow-hidden">
            <Screen1 isActive={currentScreen === 'screen1'} onStart={() => setCurrentScreen('screen2')} />
            <Screen2 isActive={currentScreen === 'screen2'} onMoveForward={() => setCurrentScreen('screen3')} />
            <Screen3 isActive={currentScreen === 'screen3'} onStartOver={handleStartOver} />
          </div>
        </div>
      </div>
    </section>
  );
}
