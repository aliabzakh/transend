import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ButtonHTMLAttributes, ComponentType, ReactNode } from "react";

type IconType = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

type Common = {
  /** Primary: Leaf fill. Secondary: Leaf outline. Ghost: text only. Danger: Clay fill. */
  variant?: "primary" | "secondary" | "ghost" | "danger";
  /** A large tile (the shop's home buttons), with a chevron. */
  big?: boolean;
  icon?: IconType;
  /** Shows a spinner, keeps the label, and blocks a second tap. */
  busy?: boolean;
  children: ReactNode;
};

type ButtonProps = Common & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type LinkProps = Common & { href: string; className?: string };

/** 52 px tall, full width on mobile, label 17 / 700. Presses scale slightly. */
export function Button(props: ButtonProps | LinkProps) {
  const { variant = "primary", big, icon: Icon, busy, children } = props;
  const extra = "className" in props && props.className ? ` ${props.className}` : "";
  const cls = `btn btn-${variant}${big ? " btn-big" : ""}${extra}`;
  const inner = (
    <>
      {busy ? <span className="btn-spinner" aria-hidden /> : Icon ? <Icon className="icon" aria-hidden /> : null}
      <span className="btn-label">{children}</span>
      {big ? <ChevronRight className="icon btn-chevron" aria-hidden /> : null}
    </>
  );
  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={cls}>
        {inner}
      </Link>
    );
  }
  const {
    variant: _v,
    big: _b,
    icon: _i,
    busy: _busy,
    children: _c,
    className: _cn,
    type,
    disabled,
    ...rest
  } = props as ButtonProps;
  return (
    <button
      type={type ?? "button"}
      className={cls}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {inner}
    </button>
  );
}
