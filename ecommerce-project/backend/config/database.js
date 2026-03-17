const { Sequelize } = require('sequelize');
const path = require('path');

// Load env from project root (handles different working directories on EC2)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '3306';
const DB_NAME = process.env.DB_NAME || 'ecommerce_db';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';

// Database connection configuration
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Validate required environment variables early (helpful on EC2)
const requiredEnv = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.warn(`WARNING: Environment variable ${key} is not set. Database connection may fail.`);
  }
});

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database. Please verify MySQL is running and environment variables are correct.');
    console.error('Current DB config:', {
      host: DB_HOST,
      port: DB_PORT,
      database: DB_NAME,
      user: DB_USER
    });
    console.error('Original error:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, testConnection };