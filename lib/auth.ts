import bcrypt from "bcryptjs";

// 临时测试用户
const users = [
  {
    id: 1,
    username: "admin",
    passwordHash: bcrypt.hashSync("Admin@123456", 10),
    role: "admin",
    nickname: "系统管理员",
  },
  {
    id: 2,
    username: "test",
    passwordHash: bcrypt.hashSync("Test@123456", 10),
    role: "user",
    nickname: "测试用户",
  },
  {
    id: 3,
    username: "operator",
    passwordHash: bcrypt.hashSync("Operator@123456", 10),
    role: "operator",
    nickname: "运营人员",
  },
];

export function verifyUser(username: string, password: string) {
  const user = users.find((item) => item.username === username);

  if (!user) {
    return null;
  }

  const valid = bcrypt.compareSync(password, user.passwordHash);

  if (!valid) {
    return null;
  }

  // 不返回密码和密码哈希
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    nickname: user.nickname,
  };
}