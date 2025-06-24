const db = require("../config/db");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const twilio = require("twilio");
const { generateToken } = require("../utils/jwt");

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
  const { type, name, email, phone, gender, dob, password, isNotify } =
    req.body;

  if (!type || !password || !name) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // ⛔ Block if isNotify is 0
  if (isNotify === 0 || isNotify === "0") {
    return res.status(403).json({
      message:
        "Notifications are disabled. Please enable notifications to register.",
    });
  }

  try {
    const [rows] = await db
      .promise()
      .query(
        type === "email"
          ? "SELECT * FROM tbl_user WHERE email = ?"
          : "SELECT * FROM tbl_user WHERE phone = ?",
        [type === "email" ? email : phone]
      );

    if (rows.length > 0) {
      return res.status(409).json({ message: `${type} already exists` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const otp = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit OTP
    const otpExpireTime = new Date(Date.now() + 60 * 1000); // 60 seconds from now

    const [result] = await db
      .promise()
      .query(
        `INSERT INTO tbl_user (name, ${type}, gender, dob, password, otp, otp_expire_time, isNotify) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          type === "email" ? email : phone,
          gender,
          dob,
          hashedPassword,
          otp,
          otpExpireTime,
          isNotify,
        ]
      );

    if (type === "email") {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "MedCare - Verify Your Email",
        html: `
          <h2>Welcome, ${name}!</h2>
          <p>Your registration is almost complete.</p>
          <p><strong>OTP:</strong> ${otp}</p>
          <p>This OTP will expire in 60 seconds.</p>
        `,
      };
      await transporter.sendMail(mailOptions);
    } else if (type === "phone") {
      await twilioClient.messages.create({
        body: `Your MedCare OTP is ${otp}. It will expire in 60 seconds.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone.startsWith("+") ? phone : `+919727515301`,
      });
    }

    return res.status(201).json({
      message: `User registered successfully. OTP sent to ${
        type === "email" ? "email" : "phone"
      }.`,
      userId: result.insertId,
    });
  } catch (err) {
    console.error("❌ Registration error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

exports.login = async (req, res) => {
  const { type, email, phone, password } = req.body;

  if (!type || !password) {
    return res.status(400).json({ message: "Missing credentials" });
  }

  try {
    let selectQuery =
      type === "email"
        ? "SELECT * FROM tbl_user WHERE email = ?"
        : "SELECT * FROM tbl_user WHERE phone = ?";
    const [rows] = await db
      .promise()
      .query(selectQuery, [type === "email" ? email : phone]);

    if (rows.length === 0)
      return res.status(404).json({ message: `${type} not found` });

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid password" });

    // 🛑 Check OTP verified
    if (user.isVerify !== 1) {
      // 🔁 Generate new OTP
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      const otpExpireTime = new Date(Date.now() + 60 * 1000);

      await db
        .promise()
        .query(
          "UPDATE tbl_user SET otp = ?, otp_expire_time = ? WHERE id = ?",
          [otp, otpExpireTime, user.id]
        );

      // ✉️ Send OTP email and phone
      if (type === "email") {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: "MedCare - Verify Your Email to Login",
          html: `
      <h2>Hello, ${user.name}</h2>
      <p>You must verify your email before logging in.</p>
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
        message: `Your ${type} is not verified. A new OTP has been sent. Please verify before logging in.`,
        requireOtp: true,
        email: type === "email" ? user.email : null,
        phone: type === "phone" ? user.phone : null,
        userId: user.id,
      });
    }

    // ✅ Success Login
    const token = generateToken(user);
    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.verifyOtp = async (req, res) => {
  const { email, phone, otp } = req.body;

  if (!otp || (!email && !phone)) {
    return res
      .status(400)
      .json({ message: "Phone or Email and OTP are required" });
  }

  try {
    const identifier = email || phone;
    const [rows] = await db
      .promise()
      .query(`SELECT * FROM tbl_user WHERE ${email ? "email" : "phone"} = ?`, [
        identifier,
      ]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = rows[0];

    const isExpired = new Date() > new Date(user.otp_expire_time);
    if (isExpired) {
      return res.status(400).json({ message: "OTP expired" });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    await db
      .promise()
      .query("UPDATE tbl_user SET isVerify = 1 WHERE id = ?", [user.id]);

    return res.status(200).json({ message: "OTP verified successfully" });
  } catch (err) {
    console.error("❌ OTP verification error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

exports.resendOtp = async (req, res) => {
  const { email, phone } = req.body;

  if (!email && !phone) {
    return res
      .status(400)
      .json({ message: "Email or Phone is required to resend OTP" });
  }

  try {
    const identifier = email || phone;
    const [rows] = await db
      .promise()
      .query(`SELECT * FROM tbl_user WHERE ${email ? "email" : "phone"} = ?`, [
        identifier,
      ]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = rows[0];

    if (user.isVerify === 1) {
      return res.status(400).json({ message: "User is already verified" });
    }

    const newOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpExpireTime = new Date(Date.now() + 60 * 1000);

    await db
      .promise()
      .query("UPDATE tbl_user SET otp = ?, otp_expire_time = ? WHERE id = ?", [
        newOtp,
        otpExpireTime,
        user.id,
      ]);

    if (email) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "MedCare - Resend OTP Verification",
        html: `
          <h2>Hello, ${user.name}</h2>
          <p>Your new OTP for verification is:</p>
          <p><strong>${newOtp}</strong></p>
          <p>This OTP will expire in 60 seconds.</p>
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

    return res.status(200).json({ message: "New OTP sent successfully" });
  } catch (err) {
    console.error("❌ Resend OTP error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};
