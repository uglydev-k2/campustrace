"use client";

import { useEffect, useRef } from "react";

/**
 * Makes a plain GET filter form update as soon as a choice changes, so
 * people do not have to press "Search" after every dropdown. Text inputs
 * still wait for Enter or the button. Without JavaScript the form works as
 * before, because this only adds behaviour.
 */
export function AutoSubmit() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const onChange = (event: Event) => {
      const target = event.target as HTMLElement;
      if (target instanceof HTMLSelectElement || (target instanceof HTMLInputElement && target.type === "radio")) {
        form.requestSubmit();
      }
    };
    form.addEventListener("change", onChange);
    return () => form.removeEventListener("change", onChange);
  }, []);
  return <span ref={ref} hidden />;
}
