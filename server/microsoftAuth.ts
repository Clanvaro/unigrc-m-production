import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import type { Express } from "express";
import memoize from "memoizee";
import { storage } from "./storage";

// Check if Microsoft Auth is properly configured
const isMicrosoftAuthConfigured = () => {
  return !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
};

// Get Microsoft OIDC configuration
// Supports both personal and corporate accounts using 'common' endpoint
const getMicrosoftOidcConfig = memoize(
  async () => {
    const tenantId = process.env.MICROSOFT_TENANT_ID || 'common'; // 'common' supports both personal and corporate
    const issuerUrl = `https://login.microsoftonline.com/${tenantId}/v2.0`;
    
    return await client.discovery(
      new URL(issuerUrl),
      process.env.MICROSOFT_CLIENT_ID!
    );
  },
  { maxAge: 3600 * 1000 } // Cache for 1 hour
);

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

// Map Microsoft claims to our user schema
async function upsertMicrosoftUser(claims: any) {
  try {
    console.log(`[Microsoft Auth] upsertUser called with claims:`, JSON.stringify(claims, null, 2));

    // Microsoft claims mapping:
    // - sub or oid: unique user ID
    // - email or preferred_username: email
    // - name: full name
    // - given_name: first name
    // - family_name: last name
    // - picture: profile image URL
    
    const userId = claims["sub"] || claims["oid"] || claims["id"];
    const email = claims["email"] || claims["preferred_username"] || claims["upn"];
    const fullName = claims["name"] || `${claims["given_name"] || ""} ${claims["family_name"] || ""}`.trim();
    const firstName = claims["given_name"] || fullName.split(" ")[0] || "";
    const lastName = claims["family_name"] || fullName.split(" ").slice(1).join(" ") || "";
    const profileImageUrl = claims["picture"] || null;

    console.log(`[Microsoft Auth] Looking for user with email: ${email}`);

    if (email) {
      const existingUser = await storage.getUserByEmail(email);
      console.log(`[Microsoft Auth] getUserByEmail result:`, existingUser ? `Found: ${existingUser.id}` : 'Not found');

      if (existingUser) {
        // Update existing user with Microsoft Auth info
        console.log(`[Microsoft Auth] Updating existing user: ${email} (ID: ${existingUser.id})`);
        const updatedUser = await storage.updateUser(existingUser.id, {
          firstName,
          lastName,
          fullName: fullName || existingUser.fullName,
          profileImageUrl,
        });
        console.log(`[Microsoft Auth] User updated successfully. Returning ID: ${updatedUser?.id}`);
        return updatedUser;
      }
    }

    // No existing user found, create a new one
    console.log(`[Microsoft Auth] Creating new user with email: ${email}, ID: ${userId}`);
    const user = await storage.upsertUser({
      id: userId,
      email,
      firstName,
      lastName,
      fullName,
      profileImageUrl,
    });
    console.log(`[Microsoft Auth] New user created successfully. ID: ${user.id}`);

    return user;
  } catch (error) {
    console.error(`[Microsoft Auth] ERROR in upsertUser:`, error);
    console.error(`[Microsoft Auth] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}

export async function setupMicrosoftAuth(app: Express) {
  // Only configure Microsoft Auth if environment variables are available
  if (!isMicrosoftAuthConfigured()) {
    console.log("⚠️  Microsoft Auth not configured - skipping setup");
    console.log("ℹ️  To enable Microsoft Auth, configure: MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET");
    return;
  }

  console.log("🔐 Configuring Microsoft Auth for production");

  const config = await getMicrosoftOidcConfig();
  
  // Determine base URL for callback
  const baseUrl = process.env.FRONTEND_URL || 
                  process.env.PUBLIC_URL || 
                  (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : '') ||
                  (process.env.NODE_ENV === 'production' ? 'https://cl.unigrc.app' : 'http://localhost:5000');
  
  const callbackURL = `${baseUrl}/api/auth/microsoft/callback`;

  console.log(`[Microsoft Auth] Callback URL: ${callbackURL}`);

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user: any = {};
    updateUserSession(user, tokens);
    const dbUser = await upsertMicrosoftUser(tokens.claims());

    if (!dbUser) {
      console.error("[Microsoft Auth] Failed to upsert user");
      return verified(new Error("Failed to create user"));
    }

    // Load user's permissions from global roles
    user.permissions = await storage.getUserPermissions(dbUser.id);
    user.id = dbUser.id;
    user.email = dbUser.email;
    user.fullName = dbUser.fullName;
    user.isPlatformAdmin = dbUser.isAdmin || dbUser.isPlatformAdmin || false;

    verified(null, user);
  };

  const strategy = new Strategy(
    {
      name: "microsoft",
      config,
      scope: "openid email profile offline_access",
      callbackURL,
      state: true, // Microsoft requires state for security
      passReqToCallback: true,
    } as any,
    verify,
  );
  
  passport.use(strategy);

  // Microsoft login route
  app.get("/api/auth/microsoft", (req, res, next) => {
    console.log("[Microsoft Auth] Login initiated");
    console.log("  - req.hostname:", req.hostname);
    console.log("  - Session ID:", req.sessionID);

    passport.authenticate("microsoft", {
      prompt: "select_account", // Allow user to select account
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  // Microsoft callback route
  app.get("/api/auth/microsoft/callback", (req, res, next) => {
    console.log("[Microsoft Auth] Callback initiated:");
    console.log("  - req.hostname:", req.hostname);
    console.log("  - Session ID:", req.sessionID);
    console.log("  - Query params:", req.query);

    passport.authenticate("microsoft", async (err: any, user: any, info: any) => {
      if (err) {
        console.error("[Microsoft Auth] Authentication error:", err);
        console.error("[Microsoft Auth] Error details:", JSON.stringify(err, null, 2));
        return res.redirect("/login?error=auth_failed");
      }

      if (!user) {
        console.error("[Microsoft Auth] No user returned. Info:", info);
        return res.redirect("/login?error=auth_no_user");
      }

      console.log("[Microsoft Auth] User authenticated successfully:", user.email);

      req.logIn(user, async (loginErr: any) => {
        if (loginErr) {
          console.error("[Microsoft Auth] Login error:", loginErr);
          return next(loginErr);
        }

        console.log("[Microsoft Auth] Session created successfully");

        try {
          // Fetch fresh user data to determine redirect
          const dbUser = await storage.getUserByEmail(user.email);

          console.log("[Microsoft Auth] DB User lookup:", dbUser ? `Found: ${dbUser.id}, isPlatformAdmin: ${dbUser.isPlatformAdmin}` : 'Not found');

          // Check if user is deactivated
          if (dbUser && !dbUser.isActive) {
            console.log("[Microsoft Auth] User is deactivated:", user.email);
            req.logout(() => { });
            return res.redirect("/login?error=account_deactivated");
          }

          // Check if user is platform admin
          if (dbUser?.isPlatformAdmin || dbUser?.isAdmin) {
            console.log("[Microsoft Auth] Platform admin detected. Redirecting to /platform-admin");
            return res.redirect("/platform-admin");
          }

          // Normal user - redirect to dashboard
          console.log("[Microsoft Auth] Normal user. Redirecting to /");
          return res.redirect("/");
        } catch (error) {
          console.error("[Microsoft Auth] Error determining redirect:", error);
          return res.redirect("/");
        }
      });
    })(req, res, next);
  });
}
