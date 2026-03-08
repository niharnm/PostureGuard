import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleConfigured = Boolean(googleClientId && googleClientSecret);
const nextAuthSecret = process.env.NEXTAUTH_SECRET;
const isPlaceholderSecret = nextAuthSecret === "replace-with-a-long-random-secret";

if (!nextAuthSecret) {
  throw new Error("Missing NEXTAUTH_SECRET. Set NEXTAUTH_SECRET in your environment before starting PostureGaurd.");
}

if ((googleClientId && !googleClientSecret) || (!googleClientId && googleClientSecret)) {
  throw new Error("Google OAuth is partially configured. Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
}

export const authOptions: NextAuthOptions = {
  secret: nextAuthSecret,
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/"
  },
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email.toLowerCase().trim() }
          });

          if (!user?.passwordHash) return null;

          const valid = await compare(credentials.password, user.passwordHash);
          if (!valid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name ?? user.email
          };
        } catch (error) {
          console.error("Credentials authorize failed:", error);
          return null;
        }
      }
    }),
    ...(googleConfigured
      ? [
          GoogleProvider({
            clientId: googleClientId!,
            clientSecret: googleClientSecret!
          })
        ]
      : [])
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      try {
        if (account?.provider === "google") {
          const email = user.email.toLowerCase().trim();
          const existing = await prisma.user.findUnique({ where: { email } });

          if (!existing) {
            const created = await prisma.user.create({
              data: {
                email,
                name: user.name ?? email
              }
            });
            user.id = created.id;
          } else {
            user.id = existing.id;
          }
        }
      } catch (error) {
        console.error("NextAuth signIn callback failed:", error);
        return false;
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
      }

      if (!token.userId && token.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email.toLowerCase().trim() }
          });
          if (dbUser) token.userId = dbUser.id;
        } catch (error) {
          console.error("NextAuth jwt callback failed:", error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId;
      }
      return session;
    }
  }
};

if (isPlaceholderSecret) {
  console.warn("NEXTAUTH_SECRET is using the placeholder value. Replace it before production deployment.");
}

export { googleConfigured };
