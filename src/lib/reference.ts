import { randomInt } from "node:crypto";

// No 0/O, 1/I/L or U: the code is read aloud and copied by hand at the desk.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

/** A short reference such as CT-7KQ2MX (reports) or CL-9D4HTP (claims). */
export function newReference(prefix: "CT" | "CL"): string {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `${prefix}-${code}`;
}
