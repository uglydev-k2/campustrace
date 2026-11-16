"use client";

import { motion, type Variants } from "motion/react";

/**
 * The page-load moment on the home page: the newest reports are dealt onto
 * the page like tags onto a desk. This is the one decorative animation in the
 * app; everything else moves only in response to something the user did.
 */

// Each tag settles at a slightly different angle and offset.
const REST = [
  { rotate: -1.25, className: "lg:mr-12" },
  { rotate: 1, className: "lg:ml-12" },
  { rotate: -0.5, className: "lg:mx-6" },
];

const deck: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 0.15 } },
};

export function HeroTags({ tags }: { tags: { id: string; node: React.ReactNode }[] }) {
  return (
    <motion.ul variants={deck} initial="hidden" animate="show" className="flex flex-col gap-3">
      {tags.map((tag, index) => {
        const rest = REST[index % REST.length];
        return (
          <motion.li
            key={tag.id}
            className={rest.className}
            variants={{
              hidden: { opacity: 0, x: 32, y: -8, rotate: rest.rotate + 4 },
              show: {
                opacity: 1,
                x: 0,
                y: 0,
                rotate: rest.rotate,
                transition: { type: "spring", stiffness: 170, damping: 20 },
              },
            }}
            // Straightens under the pointer so it is easy to read and click.
            whileHover={{ rotate: 0, transition: { duration: 0.2 } }}
          >
            {tag.node}
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
