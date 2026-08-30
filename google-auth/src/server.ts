import dotenv from "dotenv";

dotenv.config();

import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "./auth";

const app = express();



app.use(cors());
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());



app.get("/", (req, res) => {
  res.send("Turf Booking Authentication Backend is running!");
});


app.get("/auth/user", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      authenticated: false,
      message: "Not authenticated",
    });
  }

  const user = req.user as any;

  res.json({
    authenticated: true,
    user: {
      id: user.id,
      name: user.displayName,
      email: user.emails?.[0]?.value,
      photo: user.photos?.[0]?.value,
    },
  });
});



app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);


app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/",
  }),
  (req, res) => {
    res.send("Google Login Successful!");
  }
);


app.get("/auth/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }

    req.session.destroy((err) => {
      if (err) {
        return next(err);
      }

      res.json({
        message: "Logged out successfully",
      });
    });
  });
});



const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});