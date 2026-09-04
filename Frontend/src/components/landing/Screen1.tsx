

import { colors } from '../../theme/colors';
import PrimaryButton from './PrimaryButton';

type Screen1Props = {
  isActive: boolean;
  onStart: () => void;
};

export default function Screen1({ isActive, onStart }: Screen1Props) {
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center overflow-y-auto px-4 py-8 transition-all duration-700 ease-in-out ${
        isActive ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'
      }`}
    >
      <div className="my-auto w-full max-w-[1100px] text-center">
        <p
          className="mb-4 text-[0.7rem] font-medium uppercase tracking-[0.3em] sm:mb-6 sm:tracking-[0.42em]"
          style={{ color: colors.text.muted }}
        >
          Voice notes, made useful
        </p>

        <h1
          className="text-[clamp(2.5rem,8vw,10rem)] font-black leading-[0.95] tracking-[-0.05em] sm:leading-[0.85] sm:tracking-[-0.08em]"
          style={{ color: colors.text.primary }}
        >
          Turn audio into
          <span className="mt-1 block" style={{ color: colors.text.secondary }}>
            forward motion.
          </span>
        </h1>

        <p
          className="mx-auto mt-6 max-w-[600px] text-[clamp(0.95rem,2.5vw,1.25rem)] leading-relaxed tracking-wide sm:mt-8"
          style={{ color: colors.text.secondary }}
        >
          Translate the meaning, pull out the next steps, and send a thoughtful reply without pressing play five times.
        </p>

        <div className="mt-8 flex justify-center sm:mt-10">
          <PrimaryButton onClick={onStart}>Let&apos;s start</PrimaryButton>
        </div>
      </div>
    </div>
  );
}