const db = require("../config/db");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const twilio = require("twilio");
const { generateToken } = require("../utils/jwt");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

exports.register = async (req, res) => {
  // Default role to "patient" (string) if not provided.
  const {
    type,
    name,
    email,
    phone,
    gender,
    dob,
    password,
    isNotify,
    role = "patient",
  } = req.body;

  if (!type || !password || !name) {
    return res
      .status(400)
      .json({ message: "Missing required fields: type, password, or name." });
  }

  if (isNotify === 0 || isNotify === "0") {
    return res.status(403).json({
      message:
        "Notifications are disabled. Please enable notifications to register.",
    });
  }

  try {
    let selectUserQuery;
    let queryIdentifier;

    if (type === "email") {
      if (!email)
        return res
          .status(400)
          .json({ message: "Email is required for email registration." });
      selectUserQuery = "SELECT * FROM tbl_user WHERE email = ?";
      queryIdentifier = email;
    } else if (type === "phone") {
      if (!phone)
        return res
          .status(400)
          .json({ message: "Phone is required for phone registration." });
      selectUserQuery = "SELECT * FROM tbl_user WHERE phone = ?";
      queryIdentifier = phone;
    } else {
      return res
        .status(400)
        .json({
          message: "Invalid registration type. Must be 'email' or 'phone'.",
        });
    }

    const [rows] = await db.query(selectUserQuery, [queryIdentifier]);

    if (rows.length > 0) {
      return res.status(409).json({ message: `${type} already exists.` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpExpireTime = new Date(Date.now() + 60 * 1000);

    const insertUserQuery = `
            INSERT INTO tbl_user (name, ${type}, gender, dob, password, otp, otp_expire_time, isNotify, role, isVerify)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `;
    const insertValues = [
      name,
      queryIdentifier,
      gender,
      dob,
      hashedPassword,
      otp,
      otpExpireTime,
      isNotify,
      role, // This 'role' variable (now a string by default) is correctly passed here.
    ];

    const [result] = await db.query(insertUserQuery, insertValues);

    if (type === "email") {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "MedCare - Verify Your Email",
        html: `
            <h2>Welcome, ${name}!</h2>
            <p>Your registration is almost complete.</p>
            <p>Please use the following OTP to verify your email:</p>
            <p><strong>OTP:</strong> ${otp}</p>
            <p>This OTP will expire in 60 seconds.</p>
            <p>Thank you for registering with MedCare!</p>
        `,
      };

      try {
        await transporter.sendMail(mailOptions);
      } catch (emailErr) {
        console.warn("❌ Email sending failed:", emailErr.message);
        // Optional: log to DB or notify admin
      }
    } else if (type === "phone") {
      try {
        await twilioClient.messages.create({
          body: `Your MedCare OTP is ${otp}. It will expire in 60 seconds.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phone.startsWith("+") ? phone : `+91${phone}`,
        });
      } catch (smsErr) {
        console.warn("❌ SMS sending failed:", smsErr.message);
        // Do not stop registration; let user continue
        return res.status(201).json({
          Status: "Partial",
          StatusMessage:
            "User registered, but SMS failed. Please verify phone number manually or contact support.",
          userId: result.insertId,
          note: smsErr.message,
        });
      }
    }

    return res.status(201).json({
      Status: "True",
      StatusMessage: `User registered successfully. OTP sent to ${
        type === "email" ? "email" : "phone"
      }. Please verify your account.`,
      userId: result.insertId,
    });
  } catch (err) {
    console.error("❌ Registration error:", err);
    return res.status(500).json({
      Status: "False",
      StatusMessage: "Server error during registration.",
      error: err.message,
    });
  }
};

exports.login = async (req, res) => {
  const { type, email, phone, password } = req.body;

  if (!type || !password) {
    return res.status(400).json({
      Status: "False",
      StatusMessage: "Missing credentials: type or password.",
    });
  }

  try {
    let selectQuery;
    let queryIdentifier;

    if (type === "email") {
      if (!email)
        return res
          .status(400)
          .json({
            Status: "False",
            StatusMessage: "Email is required for email login.",
          });
      selectQuery =
        "SELECT id, name, email, phone, password, isVerify, otp, otp_expire_time, role FROM tbl_user WHERE email = ?";
      queryIdentifier = email;
    } else if (type === "phone") {
      if (!phone)
        return res
          .status(400)
          .json({
            Status: "False",
            StatusMessage: "Phone is required for phone login.",
          });
      selectQuery =
        "SELECT id, name, email, phone, password, isVerify, otp, otp_expire_time, role FROM tbl_user WHERE phone = ?";
      queryIdentifier = phone;
    } else {
      return res
        .status(400)
        .json({
          Status: "False",
          StatusMessage: "Invalid login type. Must be 'email' or 'phone'.",
        });
    }

    const [rows] = await db.query(selectQuery, [queryIdentifier]);

    if (rows.length === 0) {
      return res.status(404).json({
        Status: "False",
        StatusMessage: `${type} not found.`,
      });
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        Status: "False",
        StatusMessage: "Invalid password.",
      });
    }

    if (parseInt(user.isVerify) !== 1) {
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      const otpExpireTime = new Date(Date.now() + 60 * 1000);

      await db.query(
        "UPDATE tbl_user SET otp = ?, otp_expire_time = ? WHERE id = ?",
        [otp, otpExpireTime, user.id]
      );

      if (type === "email") {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: "MedCare - Verify Your Email to Login",
          html: `
                        <h2>Hello, ${user.name}!</h2>
                        <p>You must verify your email before logging in. Your new OTP is:</p>
                        <p><strong>OTP:</strong> ${otp}</p>
                        <p>This OTP will expire in 60 seconds.</p>
                    `,
        };
        await transporter.sendMail(mailOptions);
      } else if (type === "phone") {
        await twilioClient.messages.create({
          body: `Your MedCare OTP is ${otp}. It will expire in 60 seconds.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: user.phone.startsWith("+") ? user.phone : `+91${user.phone}`,
        });
      }

      return res.status(401).json({
        Status: "False",
        StatusMessage: `Your ${type} is not verified. A new OTP has been sent. Please verify before logging in.`,
        requireOtp: true,
        email: type === "email" ? user.email : null,
        phone: type === "phone" ? user.phone : null,
        userId: user.id,
      });
    }

    const token = generateToken(user);
    return res.status(200).json({
      Status: "True",
      StatusMessage: "Login successful.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role, // This will correctly reflect the string role from the DB
      },
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    return res.status(500).json({
      Status: "False",
      StatusMessage: "Server error during login.",
      error: err.message,
    });
  }
};

exports.verifyOtp = async (req, res) => {
  const { email, phone, otp } = req.body;

  if (!otp || (!email && !phone)) {
    return res.status(400).json({
      Status: "False",
      StatusMessage: "Phone or Email, and OTP are required.",
    });
  }

  try {
    const identifier = email || phone;
    const identifierType = email ? "email" : "phone";

    const [rows] = await db.query(
      `SELECT id, otp, otp_expire_time FROM tbl_user WHERE ${identifierType} = ?`,
      [identifier]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        Status: "False",
        StatusMessage: "User not found.",
      });
    }

    const user = rows[0];

    const isExpired = new Date() > new Date(user.otp_expire_time);
    if (isExpired) {
      return res.status(400).json({
        Status: "False",
        StatusMessage: "OTP expired. Please request a new one.",
      });
    }

    if (user.otp !== otp) {
      return res.status(400).json({
        Status: "False",
        StatusMessage: "Invalid OTP.",
      });
    }

    await db.query(
      "UPDATE tbl_user SET isVerify = 1, otp = NULL, otp_expire_time = NULL WHERE id = ?",
      [user.id]
    );

    return res.status(200).json({
      Status: "True",
      StatusMessage: "OTP verified successfully. Your account is now active.",
    });
  } catch (err) {
    console.error("❌ OTP verification error:", err);
    return res.status(500).json({
      Status: "False",
      StatusMessage: "Server error during OTP verification.",
      error: err.message,
    });
  }
};

exports.resendOtp = async (req, res) => {
  const { email, phone } = req.body;

  if (!email && !phone) {
    return res.status(400).json({
      Status: "False",
      StatusMessage: "Email or Phone is required to resend OTP.",
    });
  }

  try {
    const identifier = email || phone;
    const identifierType = email ? "email" : "phone";

    const [rows] = await db.query(
      `SELECT id, name, email, phone, isVerify FROM tbl_user WHERE ${identifierType} = ?`,
      [identifier]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        Status: "False",
        StatusMessage: "User not found.",
      });
    }

    const user = rows[0];

    if (parseInt(user.isVerify) !== 1) {
      return res.status(400).json({
        Status: "False",
        StatusMessage: "User is already verified. No OTP resent.",
      });
    }

    const newOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpExpireTime = new Date(Date.now() + 60 * 1000);

    await db.query(
      "UPDATE tbl_user SET isVerify = 1, otp = NULL, otp_expire_time = NULL WHERE id = ?",
      [user.id]
    );
    if (email) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "MedCare - Resend OTP Verification",
        html: `
                    <h2>Hello, ${user.name}!</h2>
                    <p>Your new OTP for verification is:</p>
                    <p><strong>${newOtp}</strong></p>
                    <p>This OTP will expire in 60 seconds.</p>
                    <p>Thank you for using MedCare!</p>
                `,
      };
      await transporter.sendMail(mailOptions);
    } else if (phone) {
      await twilioClient.messages.create({
        body: `Your MedCare OTP is ${newOtp}. It will expire in 60 seconds.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone.startsWith("+") ? phone : `+91${phone}`,
      });
    }

    return res.status(200).json({
      Status: "True",
      StatusMessage:
        "New OTP sent successfully. Please check your email/phone.",
    });
  } catch (err) {
    console.error("❌ Resend OTP error:", err);
    return res.status(500).json({
      Status: "False",
      StatusMessage: "Server error during OTP resend.",
      error: err.message,
    });
  }
};
