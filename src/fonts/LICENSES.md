# Font licences

Both typefaces are served from this folder by `next/font/local` (see
`src/app/layout.tsx`). No request is made to a font CDN at build time or at
run time.

| Files | Typeface | Licence |
| --- | --- | --- |
| `geist-sans-variable.woff2` | Geist, Copyright (c) 2023 Vercel, in collaboration with basement.studio | SIL Open Font License 1.1 |
| `geist-mono-variable.woff2` | Geist Mono, Copyright (c) 2023 Vercel, in collaboration with basement.studio | SIL Open Font License 1.1 |

The WOFF2 files were copied unmodified from the `geist` npm package
(version 1.9.2). The full licence text is at https://openfontlicense.org.

Geist does not include the Ghanaian letters ɛ and ɔ. The font stacks in
`src/app/globals.css` fall back to the system sans-serif for those
characters, so Akan names and place names still render correctly.
