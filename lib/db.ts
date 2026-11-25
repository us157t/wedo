import mysql from 'mysql2/promise';

// 创建连接池
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3307,
  user: process.env.DB_USER || '你的数据库用户名',
  password: process.env.DB_PASSWORD || '你的数据库密码',
  database: process.env.DB_NAME || 'messagesend',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000, // 10秒连接超时，避免无限卡住
});

console.log('MySQL config:', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  passwordExists: !!process.env.DB_PASSWORD,
});

export default pool;