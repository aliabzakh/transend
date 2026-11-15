import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ComponentType, FormEventHandler, ReactNode } from "react";

/**
 * Page shell: an optional greeting line, the title, the content, and one primary
 * action pinned at the bottom. Pass onSubmit to make the content and action one form.
 */
export function Screen({
  title,
  back,
  children,
  action,
  onSubmit,
  eyebrow,
  titleIcon: TitleIcon,
  mark,
  center,
  wide,
}: {
  title: string;
  back?: { href: string; label: string };
  children: ReactNode;
  action?: ReactNode;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  /** The greeting row above the title ("Hi Jean", the shop name). */
  eyebrow?: ReactNode;
  /** Makes the title a compact instruction line with a Gold icon (the hand-over screen). */
  titleIcon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  /** A result mark (success, declined) shown above a centred title. */
  mark?: ReactNode;
  center?: boolean;
  /** Wider column for admin and judges' pages. */
  wide?: boolean;
}) {
  const body = (
    <>
      <div className="screen-body">{children}</div>
      {action ? <div className="screen-action">{action}</div> : null}
    </>
  );
  const cls = `screen${center || mark ? " screen-center" : ""}${wide ? " screen-wide" : ""}`;
  return (
    <main className={cls}>
      <div className="screen-head">
        {back ? (
          <Link href={back.href} className="back">
            <ArrowLeft className="icon" aria-hidden />
            <span>{back.label}</span>
          </Link>
        ) : null}
        {mark}
        {eyebrow ? <p className="screen-eyebrow">{eyebrow}</p> : null}
        {TitleIcon ? (
          <h1 className="screen-title screen-title-compact">
            <TitleIcon className="icon" aria-hidden />
            <span>{title}</span>
          </h1>
        ) : (
          <h1 className="screen-title">{title}</h1>
        )}
      </div>
      {onSubmit ? (
        <form onSubmit={onSubmit} className="screen-form">
          {body}
        </form>
      ) : (
        body
      )}
    </main>
  );
}
