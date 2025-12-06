import { redis } from "../lib/redis.js";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET;

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  console.error(
    "WARNING: Missing JWT secrets. Ensure backend/.env defines ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET"
  );
}

const generateTokens = (userId) => {
  if (!ACCESS_SECRET || !REFRESH_SECRET) {
    throw new Error("JWT secrets not configured on server.");
  }
  const accessToken = jwt.sign({ userId }, ACCESS_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: "7d" });
  return { accessToken, refreshToken };
};

const storeRefreshToken = async (userId, refreshToken) => {
  if (redis) {
    try {
      await redis.set(`refresh_token:${userId}`, refreshToken, "EX", 7 * 24 * 60 * 60);
    } catch (err) {
      console.error("[redis] storeRefreshToken error:", err?.message || err);
    }
  }
};

const setCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 15 * 60 * 1000,
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const signup = async (req, res) => {
  const { email, password, name } = req.body || {};
  try {
    if (!ACCESS_SECRET || !REFRESH_SECRET) {
      return res.status(500).json({ message: "Server misconfiguration: JWT secrets missing" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: "User already exists" });

    const user = await User.create({ name, email, password });

    const { accessToken, refreshToken } = generateTokens(user._id);
    await storeRefreshToken(user._id, refreshToken);
    setCookies(res, accessToken, refreshToken);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.log("Error in signup controller", error?.message || error);
    res.status(500).json({ message: error?.message || "Server error" });
  }
};

export const login = async (req, res) => {
  try {
    if (!ACCESS_SECRET || !REFRESH_SECRET) {
      return res.status(500).json({ message: "Server misconfiguration: JWT secrets missing" });
    }

    const { email, password } = req.body || {};
    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      const { accessToken, refreshToken } = generateTokens(user._id);
      await storeRefreshToken(user._id, refreshToken);
      setCookies(res, accessToken, refreshToken);

      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    } else {
      return res.status(400).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    console.log("Error in login controller", error?.message || error);
    res.status(500).json({ message: error?.message || "Server error" });
  }
};

export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, REFRESH_SECRET || "");
        await redis?.del(`refresh_token:${decoded.userId}`);
      } catch (err) {
        console.warn("Logout: refresh token verify failed:", err?.message || err);
      }
    }

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    return res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error?.message || error);
    res.status(500).json({ message: "Server error", error: error?.message || error });
  }
};

export const refreshToken = async (req, res) => {
  try {
    if (!REFRESH_SECRET || !ACCESS_SECRET) {
      return res.status(500).json({ message: "Server misconfiguration: JWT secrets missing" });
    }

    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) return res.status(401).json({ message: "No refresh token provided" });

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    const storedToken = await redis?.get(`refresh_token:${decoded.userId}`);
    if (storedToken !== refreshToken) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const accessToken = jwt.sign({ userId: decoded.userId }, ACCESS_SECRET, { expiresIn: "15m" });

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    return res.json({ message: "Token refreshed successfully" });
  } catch (error) {
    console.log("Error in refreshToken controller", error?.message || error);
    res.status(500).json({ message: "Server error", error: error?.message || error });
  }
};

export const getProfile = async (req, res) => {
  try {

    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    return res.json(req.user);
  } catch (error) {
    console.log("Error in getProfile", error?.message || error);
    res.status(500).json({ message: "Server error", error: error?.message || error });
  }
};
