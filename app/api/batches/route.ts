
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// 辅助函数：将秒级时间戳转为 YYYY-MM-DD HH:mm:ss（北京时间/东八区）
function formatUnixTime(ts: number | string | null | undefined): string {
  if (!ts) return '-';
  const num = Number(ts);
  if (isNaN(num)) return String(ts);
  
  // 兼容 10 位秒级和 13 位毫秒级时间戳
  const ms = num < 1e12 ? num * 1000 : num;
  
  // 使用 Intl.DateTimeFormat 确保在任何时区的服务器上都输出标准的东八区时间
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(ms));

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}:${map.second}`;
}

export async function GET(request: Request) {
  const start = Date.now();
  let conn: any;
  // 记录每个阶段耗时
  const timings: Record<string, number> = {};
  const mark = (name: string, begin: number) => {
    timings[name] = Date.now() - begin;
  };

  try {
    let t = Date.now();
    conn = await pool.getConnection();
    mark('getConnection', t);

    const { searchParams } = new URL(request.url);

    // 分页参数
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(searchParams.get('pageSize') || 10))
    );
    const offset = (page - 1) * pageSize;

    // 查询条件
    const startDate = searchParams.get('startDate')?.slice(0, 10) || '';
    const endDate = searchParams.get('endDate')?.slice(0, 10) || '';
    const orderName = searchParams.get('orderName')?.trim();
    

    // 动态拼接查询条件
    // const conditions: string[] = [
    //   'uid = ?',
    //   'delete_time = 0'
    // ];
    const conditions: string[] = [
      'uid = ?'
    ];

    const params: any[] = [1206];

    // 开始时间：当天 00:00:00
    if (startDate) {
      conditions.push(`
        create_time >= UNIX_TIMESTAMP(
          CONCAT(?, ' 00:00:00')
        )
      `);
      params.push(startDate);
    }

    // 结束时间：次日 00:00:00（不包含）
    if (endDate) {
      conditions.push(`
        create_time < UNIX_TIMESTAMP(
          DATE_ADD(CONCAT(?, ' 00:00:00'), INTERVAL 1 DAY)
        )
      `);
      params.push(endDate);
    }

    // 工单名模糊查询
    if (orderName) {
      conditions.push('send_msg_id LIKE ?');
      params.push(`%${orderName}%`);
    }

    const whereSql = conditions.join(' AND ');
    console.log(whereSql);
    t = Date.now();

    console.log('[批次查询参数]', {
      startDate,
      endDate,
      whereSql,
      params,
    });

    // 1. 查询总记录数
    const [countRows]: any = await conn.query(
      `
        SELECT COUNT(*) AS total
        FROM yx_user_send_task_cache
        WHERE ${whereSql}
      `,
      params
    );
    mark('countQuery', t);
    const total = Number(countRows[0]?.total || 0);
    t = Date.now();
    // 2. 查询当前页任务
    const [tasks]: any = await conn.query(
      `
        SELECT
          id,
          task_no,
          send_msg_id,
          develop_no,
          real_num,
          send_num,
          create_time,
          submit_time,
          yidong_channel_id,
          liantong_channel_id,
          dianxin_channel_id
        FROM yx_user_send_task_cache
        WHERE ${whereSql}
        LIMIT ? OFFSET ?
      `,
      [...params, pageSize, offset]
    );
    mark('taskQuery', t);
    t = Date.now();
    // 3. 获取当前页 task_no
    const taskNos = tasks.map((item: any) => item.task_no);
    mark('taskNoBuild', t);
    let stats: any[] = [];

    // 当前页有任务才查询回执
    if (taskNos.length > 0) {
      const placeholders = taskNos.map(() => '?').join(',');
      t = Date.now();

      const [receiptRows]: any = await conn.query(
        `
        SELECT
          task_no,

          SUM(status_message = 'DELIVRD')
            AS total_success,

          -- 移动成功
          SUM(
            LEFT(mobile, 3) IN (
              '134','135','136','137','138','139','147','148',
              '150','151','152','157','158','159','172','178',
              '182','183','184','187','188','195','197','198'
            )
            AND status_message = 'DELIVRD'
          ) AS cmcc_arrival,

          -- 移动非成功
          SUM(
            LEFT(mobile, 3) IN (
              '134','135','136','137','138','139','147','148',
              '150','151','152','157','158','159','172','178',
              '182','183','184','187','188','195','197','198'
            )
            AND status_message <> 'DELIVRD'
          ) AS cmcc_failed,

          -- 联通成功
          SUM(
            LEFT(mobile, 3) IN (
              '130','131','132','145','146','155','156','166',
              '167','171','175','176','185','186','196'
            )
            AND status_message = 'DELIVRD'
          ) AS cucc_arrival,

          -- 联通非成功
          SUM(
            LEFT(mobile, 3) IN (
              '130','131','132','145','146','155','156','166',
              '167','171','175','176','185','186','196'
            )
            AND status_message <> 'DELIVRD'
          ) AS cucc_failed,

          -- 电信成功
          SUM(
            LEFT(mobile, 3) IN (
              '133','149','153','173','174','177','180','181',
              '189','190','191','193','199'
            )
            AND status_message = 'DELIVRD'
          ) AS ctcc_arrival,

          -- 电信非成功
          SUM(
            LEFT(mobile, 3) IN (
              '133','149','153','173','174','177','180','181',
              '189','190','191','193','199'
            )
            AND status_message <> 'DELIVRD'
          ) AS ctcc_failed

        FROM yx_send_task_receipt
        WHERE delete_time = 0
          AND task_no IN (${placeholders})
        GROUP BY task_no
        `,
        taskNos
      );
      mark('receiptQuery', t);

      stats = receiptRows;
    }
    t = Date.now();

    // 4. 将回执统计按 task_no 建立映射
    const statsMap = new Map(
      stats.map((item: any) => [item.task_no, item])
    );

    // 5. 合并任务数据
    const data = tasks.map((task: any) => {
      const stat: any = statsMap.get(task.task_no) || {};

      const cmccArrival = Number(stat.cmcc_arrival || 0);
      const cmccFailed = Number(stat.cmcc_failed || 0);

      const cuccArrival = Number(stat.cucc_arrival || 0);
      const cuccFailed = Number(stat.cucc_failed || 0);

      const ctccArrival = Number(stat.ctcc_arrival || 0);
      const ctccFailed = Number(stat.ctcc_failed || 0);

      const rate = (success: number, failed: number) => {
        const count = success + failed;
        return count > 0
          ? `${((success / count) * 100).toFixed(2)}%`
          : '0.00%';
      };

      return {
        id: String(task.id),
        batchId: task.task_no,
        orderName: task.send_msg_id || '',
        subPort: task.develop_no || '',
        total: Number(task.real_num || 0),

        totalSuccess: Number(stat.total_success || 0),

        cmccArrival,
        cmccFailed,

        cuccArrival,
        cuccFailed,

        ctccArrival,
        ctccFailed,

        cmccSuccessRate: rate(cmccArrival, cmccFailed),
        cuccSuccessRate: rate(cuccArrival, cuccFailed),
        ctccSuccessRate: rate(ctccArrival, ctccFailed),

        sendTime: formatUnixTime(task.create_time),

        arrivalRate:
          Number(task.real_num || 0) > 0
            ? `${(
                Number(stat.total_success || 0) /
                Number(task.real_num) *
                100
              ).toFixed(2)}%`
            : '0.00%'
      };
    });
    mark('dataMapping', t);
    const totalMs = Date.now() - start;
    console.log('[短信批次查询耗时]', {
      ...timings,
      totalMs,
      taskCount: tasks.length,
      receiptCount: stats.length,
      totalRecords: total,
      page,
      pageSize,
      offset,
      filters: {
        startDate,
        endDate,
        orderName
      }
    });

    return NextResponse.json({
      success: true,
      data,
      total,
      page,
      pageSize,
      elapsed: Date.now() - start
    });

  } catch (error: any) {
    console.error('查询批次失败:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );

  } finally {
    if (conn) conn.release();
  }
}