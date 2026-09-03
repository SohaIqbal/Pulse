import { colors } from '../../theme/colors';

type BrandProps = {
  title?: string;
};

export default function Brand({ title  }: BrandProps) {
  return (
    <div
      className="text-[clamp(1.8rem,1.7vw,2rem)] font-black tracking-[-0.07em]"
      style={{ color: colors.text.primary }}
    >
      {title}
    </div>
  );
}
