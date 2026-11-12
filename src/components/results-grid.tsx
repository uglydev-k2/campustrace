"use client";

import { AnimatePresence, motion } from "motion/react";

/**
 * The grid of search results.
 *
 * When the filters change, tags that are still in the results slide to their
 * new position (`layout`), new ones fade in and removed ones fade out. The
 * movement shows what the search changed instead of swapping the whole grid.
 */
export function ResultsGrid({ items }: { items: { id: string; node: React.ReactNode }[] }) {
  return (
    <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <AnimatePresence mode="popLayout" initial={false}>
        {items.map((item) => (
          <motion.li
            key={item.id}
            layout
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {item.node}
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
