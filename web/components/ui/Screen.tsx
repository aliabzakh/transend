import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { FormEventHandler, ReactNode } from "react";

/**
 * Page shell: a title, the content, and one primary action at the bottom.
 * Pass onSubmit to make the content and action one form.
 */
export function Screen({
  title,
  back,
  children,
  action,
  onSubmit,
}: {
  title: string;
  back?: { href: string; label: string };
  children: ReactNode;
  action?: ReactNode;
  onSubmit?: FormEventHandler<HTMLFormElement>;
}) {
  const body = (
    <>
      <div className="screen-body">{children}</div>
      {action ? <div className="screen-action">{action}</div> : null}
    </>
  );
  return (
    <main className="screen">
      <div className="screen-head">
        {back ? (
          <Link href={back.href} className="back">
            <ArrowLeft className="icon" aria-hidden />
            <span>{back.label}</span>
          </Link>
        ) : null}
        <h1 className="screen-title">{title}</h1>
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
