import "server-only";
import bcrypt from "bcryptjs";
import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { clear, clientAddress, consume, isBlocked, LIMITS } from "@/server/rate-limit";

/**
 * Authentication uses NextAuth.js (Auth.js v4) with email and password.
 *
 * - Passwords are stored as bcrypt hashes, never in plain text.
 * - The session is a signed, HTTP-only cookie holding a JWT. The JWT carries
 *   only the user's id; the role is read from the database on every request
 *   (see getCurrentUser), so changing someone's role takes effect at once.
 */
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        // Slow down password guessing. Failed attempts are counted per email
        // and per client address; the counters live in the database so they
        // hold across server instances. Throwing (rather than returning
        // null) lets the form show a "try again later" message.
        const address = clientAddress(req?.headers as Record<string, string> | undefined);
        const emailKey = `login:email:${email}`;
        const ipKey = `login:ip:${address}`;
        const [emailBlocked, ipBlocked] = await Promise.all([
          isBlocked(emailKey, LIMITS.loginPerEmail),
          isBlocked(ipKey, LIMITS.loginPerIp),
        ]);
        if (emailBlocked || ipBlocked) throw new Error("RateLimited");

        const user = await db.user.findUnique({ where: { email } });
        // Compare against a dummy hash when the user does not exist so the
        // response takes the same time either way.
        const hash = user?.passwordHash ?? DUMMY_HASH;
        const matches = await bcrypt.compare(password, hash);
        if (!user || !matches) {
          await Promise.all([
            consume(emailKey, LIMITS.loginPerEmail),
            consume(ipKey, LIMITS.loginPerIp),
          ]);
          return null;
        }

        await clear(emailKey);
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
};

const DUMMY_HASH = "$2b$10$CwTycUXWue0Thq9StjUM0uJ8rQ8bq5xM0c1eYb9wQ5iV1gk0cV8yW";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: "STUDENT" | "ADMIN";
};

/**
 * The signed-in user, or null.
 *
 * `cache` makes this run once per request even though the layout, the page
 * and several components all call it.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) return null;
  return db.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true },
  });
});

/** Use at the top of any page or action that needs a signed-in user. */
export async function requireUser(returnTo: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return user;
}

/**
 * Use at the top of administrator pages. Students get a 404 rather than a
 * "forbidden" page, so the admin area is not advertised.
 */
export async function requireAdmin(returnTo: string): Promise<CurrentUser> {
  const user = await requireUser(returnTo);
  if (user.role !== "ADMIN") notFound();
  return user;
}

/** Only allow redirects back into this site (prevents open redirects). */
export function safeNextPath(next: string | undefined | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return "/dashboard";
  }
  return next;
}
