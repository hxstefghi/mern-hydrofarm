require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const seedUsers = async () => {
  try {
    // Make sure your .env has MONGO_URI
    const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/hydrofarm";
    await mongoose.connect(uri);
    console.log("MongoDB connected for seeding.");

    // Default credentials
    const adminEmail = "admin@example.com";
    const adminPassword = "adminpassword";

    const userEmail = "user@example.com";
    const userPassword = "userpassword";

    // Hash passwords
    const salt = await bcrypt.genSalt(10);
    const hashedAdminPassword = await bcrypt.hash(adminPassword, salt);
    const hashedUserPassword = await bcrypt.hash(userPassword, salt);

    // Seed Admin
    const adminExists = await User.findOne({ email: adminEmail });
    if (!adminExists) {
      await User.create({
        email: adminEmail,
        password: hashedAdminPassword,
        role: "admin",
      });
      console.log(`Admin created: ${adminEmail}`);
    } else {
      console.log(`Admin already exists: ${adminEmail}`);
    }

    // Seed User
    const userExists = await User.findOne({ email: userEmail });
    if (!userExists) {
      await User.create({
        email: userEmail,
        password: hashedUserPassword,
        role: "user",
      });
      console.log(`User created: ${userEmail}`);
    } else {
      console.log(`User already exists: ${userEmail}`);
    }

    mongoose.connection.close();
    console.log("Database connection closed.");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding users:", error);
    process.exit(1);
  }
};

seedUsers();
