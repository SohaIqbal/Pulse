import { colors } from '../../theme/colors';
import PrimaryButton from './PrimaryButton';

type Screen1Props = {
  isActive: boolean;
  onStart: () => void;
};

export default function Screen1({ isActive, onStart }: Screen1Props) {
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-in-out ${
        isActive ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'
      }`}
    >
      <div className="w-full max-w-[1100px] pt-10 text-center sm:pt-14 lg:pt-0">
        <p
          className="mb-6 text-[0.7rem] font-medium uppercase tracking-[0.42em]"
          style={{ color: colors.text.muted }}
        >
          Voice notes, made useful
        </p>

        <h1
          className="text-[clamp(4.3rem,9vw,10rem)] font-black leading-[0.82] tracking-[-0.08em]"
          style={{ color: colors.text.primary }}
        >
          Turn audio into
          <span className="mt-1 block" style={{ color: colors.text.secondary }}>
            forward motion.
          </span>
        </h1>

        <p
          className="mx-auto mt-8 max-w-[600px] text-[clamp(1rem,0.9vw,1.25rem)] leading-relaxed tracking-wide"
          style={{ color: colors.text.secondary }}
        >
          Translate the meaning, pull out the next steps, and send a thoughtful reply without pressing play five times.
        </p>

        <div className="mt-10 flex justify-center">
          <PrimaryButton onClick={onStart}>Let&apos;s start</PrimaryButton>
        </div>
      </div>
    </div>
  );
}