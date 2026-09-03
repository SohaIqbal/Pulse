import { colors } from '../../theme/colors';

type PrimaryButtonProps = {
  children: React.ReactNode;
  onClick?: any;
};

export default function PrimaryButton({ children, onClick }: PrimaryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-3 rounded-full px-7 py-3.5 text-base font-semibold transition-transform duration-200 hover:-translate-y-0.5"
      style={{
        backgroundColor: colors.button.primaryBg,
        color: colors.button.primaryText,
        boxShadow: `0 10px 30px ${colors.button.shadow}`,
      }}
    >
      <span>{children}</span>
      <span aria-hidden="true" className="text-lg leading-none">→</span>
    </button>
  );
}
