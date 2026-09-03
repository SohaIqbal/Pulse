import { colors } from '../../theme/colors';

export default function LanguageSelector() {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[0.72rem] font-medium transition-colors duration-200"
      style={{
        borderColor: colors.border.subtle,
        backgroundColor: colors.surface.soft,
        color: colors.text.primary,
      }}
      aria-label="Translate to English"
    >
      <span className="flex h-4 w-4 items-center justify-center">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M4 12h16M12 4a8 8 0 0 1 8 8 8 8 0 0 1-8 8 8 8 0 0 1-8-8 8 8 0 0 1 8-8Z" />
          <path d="M8.5 8.5c.8 1.2 1.7 2 3.5 2s2.7-.8 3.5-2M8.5 15.5c.8-1.2 1.7-2 3.5-2s2.7.8 3.5 2" />
        </svg>
      </span>
      <span>Translate to</span>
      <span className="font-semibold">English</span>
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="m5 7.5 5 5 5-5" />
      </svg>
    </button>
  );
}
