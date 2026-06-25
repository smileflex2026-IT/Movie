import { useTheme } from "@/hooks/use-theme";
import logoDark from "@/assets/smileflex-logo.png";
import logoLight from "@/assets/smileflex-logo-light.png";
import markDark from "@/assets/smileflex-mark.png";
import markLight from "@/assets/smileflex-mark-light.png";

interface LogoProps {
  className?: string;
  alt?: string;
  variant?: "wordmark" | "mark";
}

export default function Logo({ className, alt = "SmileFlex", variant = "wordmark" }: LogoProps) {
  const theme = useTheme();
  const isLight = theme === "light";
  const src =
    variant === "mark"
      ? isLight ? markLight : markDark
      : isLight ? logoLight : logoDark;
  return <img src={src} alt={alt} draggable={false} className={className} />;
}
