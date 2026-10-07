import type { Metadata } from "next";
import { APP_NAME } from "@/lib/data";

export const metadata: Metadata = { title: `Privacy policy · ${APP_NAME}` };

export default function PrivacyPage() {
  return (
    <article className="max-w-2xl space-y-4 text-sm leading-6">
      <h1 className="text-xl font-bold">Privacy policy</h1>
      <p className="text-ink-2">Last updated 7 October 2026</p>
      <p>
        {APP_NAME} is a free website and app that compares prices on 3D printing products across New
        Zealand shops. This policy covers the website and the Android app, which shows the same website.
      </p>
      <h2 className="text-base font-semibold">What we collect</h2>
      <p>
        Nothing personal. There are no accounts, no sign-up, no advertising and no tracking or analytics
        tools. We don&apos;t use cookies.
      </p>
      <p>
        Like every website, our hosting provider (Vercel) briefly keeps standard technical logs, such as
        IP addresses and the pages requested, to keep the service running and secure. We don&apos;t use
        these logs to identify you.
      </p>
      <h2 className="text-base font-semibold">Shop links</h2>
      <p>
        When you tap &quot;Go to shop&quot; you leave {APP_NAME} and go to that shop&apos;s own website,
        which has its own privacy policy.
      </p>
      <h2 className="text-base font-semibold">Children</h2>
      <p>The app doesn&apos;t knowingly collect any information from anyone, including children.</p>
      <h2 className="text-base font-semibold">Changes and contact</h2>
      <p>
        If this policy changes, we&apos;ll update this page and the date above. Questions can be raised at{" "}
        <a
          className="text-brand underline"
          href="https://github.com/daryljohncox/KlipperBackupK1c/issues"
          target="_blank"
          rel="noopener noreferrer"
        >
          our GitHub page
        </a>
        .
      </p>
    </article>
  );
}
