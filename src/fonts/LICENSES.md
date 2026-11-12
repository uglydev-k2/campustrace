# Font licences

Both typefaces are served from this folder by `next/font/local` (see
`src/app/layout.tsx`). No request is made to a font CDN at build time or at
run time.

| Files | Typeface | Licence |
| --- | --- | --- |
| `fraunces-*.woff2` | Fraunces, Copyright 2020 The Fraunces Project Authors (github.com/undercasetype/Fraunces) | SIL Open Font License 1.1 |
| `atkinson-next-*.woff2` | Atkinson Hyperlegible Next, Copyright 2020-2024 The Atkinson Hyperlegible Next Project Authors (github.com/googlefonts/atkinson-hyperlegible-next) | SIL Open Font License 1.1 |

The WOFF2 files were copied unmodified from the `@fontsource-variable/fraunces`
and `@fontsource-variable/atkinson-hyperlegible-next` npm packages (version
5.3.0). The full licence text is at https://openfontlicense.org.

The `latin-ext` files cover characters such as ɛ and ɔ, so Akan names and
place names render in the same typeface as the rest of the page.
