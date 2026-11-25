
"use client";

import { useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

//   const handleLogin = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError("");

//     if (!username.trim() || !password) {
//       setError("请输入账号和密码");
//       return;
//     }

//     setLoading(true);

//     try {
//       // TODO: 后续接入真实登录 API
//       // const res = await fetch("/api/auth/login", {
//       //   method: "POST",
//       //   headers: { "Content-Type": "application/json" },
//       //   body: JSON.stringify({ username, password, remember }),
//       // });

//       await new Promise((resolve) => setTimeout(resolve, 600));

//       setError("登录接口尚未接入，请先完成后端认证配置");
//     } catch {
//       setError("登录失败，请稍后重试");
//     } finally {
//       setLoading(false);
//     }
//   };
const handleLogin = async () => {
  setLoading(true);
  setError("");

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    const result = await res.json();

    if (!res.ok || !result.success) {
      setError(result.message || "登录失败");
      return;
    }

    // 临时测试：登录成功后跳转首页
    window.location.href = "/";
  } catch {
    setError("网络请求失败");
  } finally {
    setLoading(false);
  }
};

  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-2">

      {/* 左侧品牌区域 */}
      <section className="relative hidden min-h-screen overflow-hidden bg-[#102747] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">

        {/* 背景装饰 */}
        <div className="absolute -right-40 -top-40 h-[550px] w-[550px] rounded-full border border-white/10" />
        <div className="absolute -right-20 -top-20 h-[400px] w-[400px] rounded-full border border-white/10" />
        <div className="absolute -bottom-52 -left-32 h-[550px] w-[550px] rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500 text-xl font-bold shadow-lg shadow-blue-500/30">
            W
          </div>
          <div>
            <div className="text-lg font-bold tracking-wide">
              WEDO PLATFORM
            </div>
            <div className="text-xs text-blue-200/70">
              ENTERPRISE MANAGEMENT
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-4 py-2 text-sm text-blue-100">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Enterprise Data Platform
          </div>

          <h1 className="mb-6 text-5xl font-bold leading-tight xl:text-6xl">
            让数据管理
            <br />
            <span className="text-blue-400">更加简单高效</span>
          </h1>

          <p className="max-w-md text-base leading-8 text-slate-300">
            统一管理业务数据，实时掌握运营状态。
            通过高效的数据管理平台，让每一次业务决策更加清晰。
          </p>

          {/* 数据卡片装饰 */}
          <div className="mt-14 grid max-w-lg grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm">
              <div className="mb-3 text-sm text-blue-200">
                数据管理
              </div>
              <div className="text-2xl font-semibold">
                Efficient
              </div>
              <div className="mt-2 text-xs text-slate-400">
                高效统一的数据管理
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm">
              <div className="mb-3 text-sm text-blue-200">
                系统监控
              </div>
              <div className="text-2xl font-semibold">
                Reliable
              </div>
              <div className="mt-2 text-xs text-slate-400">
                稳定可靠的业务服务
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-400">
          © 2026 WEDO PLATFORM. All rights reserved.
        </div>
      </section>

      {/* 右侧登录区域 */}
      <section className="flex min-h-screen flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-24">

        {/* 移动端 Logo */}
        <div className="mb-12 flex items-center gap-3 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">
            W
          </div>
          <span className="font-bold tracking-wide text-slate-800">
            WEDO PLATFORM
          </span>
        </div>

        <div className="mx-auto w-full max-w-md">

          <div className="mb-10">
            <h2 className="mb-3 text-3xl font-bold tracking-tight text-slate-900">
              欢迎回来
            </h2>
            <p className="text-sm text-slate-500">
              请登录您的账户，进入管理平台
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">

            {/* 用户名 */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                登录账号
              </label>

              <div className="relative">
                <svg
                  className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21a8 8 0 0 1 16 0" />
                </svg>

                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入账号"
                  autoComplete="username"
                  className="h-13 w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>

            {/* 密码 */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">
                  登录密码
                </label>

                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  忘记密码？
                </a>
              </div>

              <div className="relative">
                <svg
                  className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <rect x="4" y="10" width="16" height="11" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>

                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  autoComplete="current-password"
                  className="h-13 w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "隐藏密码" : "显示密码"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                      <path d="M9.9 5.2A11 11 0 0 1 12 5c5 0 9 5 9 7a9 9 0 0 1-2.1 3.1M6.2 6.2C3.8 7.7 3 10.2 3 12c0 2 4 7 9 7 1 0 2-.2 2.9-.6" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path d="M3 12s3.3-7 9-7 9 7 9 7-3.3 7-9 7-9-7-9-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* 记住账号 */}
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                />
                记住登录状态
              </label>

              <span className="text-xs text-slate-400">
                Secure Login
              </span>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="flex h-13 w-full items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 hover:shadow-blue-600/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "正在登录..." : "登 录"}
            </button>

          </form>

          <div className="mt-12 border-t border-slate-100 pt-6 text-center">
            <p className="text-xs leading-6 text-slate-400">
              登录即表示您同意平台相关使用规范。
              <br />
              如有账户问题，请联系系统管理员。
            </p>
          </div>
        </div>

        <div className="mt-auto pt-12 text-center text-xs text-slate-400">
          © 2026 WEDO PLATFORM
        </div>
      </section>
    </main>
  );
}