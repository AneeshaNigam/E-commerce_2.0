// routes/payments.js
import express from "express";
import { createCheckoutSession } from "../controllers/checkout.controller.js";

const router = express.Router();

router.post("/create-checkout-session", createCheckoutSession);

export default router;
