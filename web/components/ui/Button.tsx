import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentType, ReactNode } from "react";

type IconType = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

type Common = {
  variant?: "primary" | "secondary";
  big?: boolean;
  icon?: IconType;
  children: ReactNode;
};

type ButtonProps = Common & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type LinkProps = Common & { href: string; className?: string };

/** Primary: black fill, white text. Secondary: white fill, 1 px black border. Full width. */
export function Button(props: ButtonProps | LinkProps) {
  const { variant = "primary", big, icon: Icon, children } = props;
  const cls = `btn btn-${variant}${big ? " btn-big" : ""}`;
  const inner = (
    <>
      {Icon ? <Icon className="icon" aria-hidden /> : null}
      <span>{children}</span>
    </>
  );
  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={cls}>
        {inner}
      </Link>
    );
  }
  const { variant: _v, big: _b, icon: _i, children: _c, type, ...rest } = props as ButtonProps;
  return (
    <button type={type ?? "button"} className={cls} {...rest}>
      {inner}
    </button>
  );
}
