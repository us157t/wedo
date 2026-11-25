import { NextResponse } from "next/server";
import { verifyUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "请输入用户名和密码" },
        { status: 400 }
      );
    }

    const user = verifyUser(username, password);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "用户名或密码错误" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "登录成功",
      user,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "登录请求失败" },
      { status: 500 }
    );
  }
}