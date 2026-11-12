import "next-auth";

// Adds the user's id to the session type (set in src/lib/auth.ts).
declare module "next-auth" {
  interface Session {
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
    };
  }
}
