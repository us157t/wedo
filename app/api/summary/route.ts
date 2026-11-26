import { NextResponse } from 'next/server';
import pool from '@/lib/db';

const CMCC_PREFIXES = "'134','135','136','137','138','139','147','148','150','151','152','157','158','159','172','178','182','183','184','187','188','195','197','198'";
const CUCC_PREFIXES = "'130','131','132','145','146','155','156','166','167','171','175','176','185','186','196'";
const CTCC_PREFIXES = "'133','149','153','173','174','177','180','181','189','190','191','193','199'";

const calcRate = (succ: number, total: number) =>
  total > 0 ? `${((succ / total) * 100).toFixed(2)}%` : '0.00%';

export async function GET(request: Request) {
  const start = Date.now();
  let conn: any;

  try {
    conn = await pool.getConnection();
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || 10)));
    const offset = (page - 1) * pageSize;

    const startDate = searchParams.get('startDate')?.slice(0, 10) || '';
    const endDate = searchParams.get('endDate')?.slice(0, 10) || '';
    const orderName = searchParams.get('orderName')?.trim();

    const conditions: string[] = ['t.uid = ?'];
    const params: any[] = [1206];

    if (startDate) {
      conditions.push('t.create_time >= UNIX_TIMESTAMP(CONCAT(?, " 00:00:00"))');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('t.create_time < UNIX_TIMESTAMP(DATE_ADD(CONCAT(?, " 00:00:00"), INTERVAL 1 DAY))');
      params.push(endDate);
    }
    if (orderName) {
      conditions.push('t.send_msg_id LIKE ?');
      params.push(`%${orderName}%`);
    }

    const whereSql = conditions.join(' AND ');
    // 1. 查询聚合后的总工单数 & 全局总发送量
    const [countAndNumRows]: any = await conn.query(
      `
        SELECT
          COUNT(DISTINCT t.send_msg_id) AS total,
          COALESCE(SUM(t.real_num), 0) AS globalTotalNum
        FROM yx_user_send_task_cache t
        WHERE ${whereSql}
      `,
      params
    );
    // 1. 查询聚合后的总记录数（有多少个不同的工单名称）
    const [countRows]: any = await conn.query(
      `
        SELECT COUNT(DISTINCT send_msg_id) AS total
        FROM yx_user_send_task_cache t
        WHERE ${whereSql}
      `,
      params
    );
    const total = Number(countRows[0]?.total || 0);
    const globalTotalNum = Number(countAndNumRows[0]?.globalTotalNum || 0);
    // 2. 查询当前筛选条件下的全局回执成功数（跨所有匹配工单，不限于当前页）
    let summary = {
      cmccSuccess: 0,
      cmccRate: '0.00%',
      cuccSuccess: 0,
      cuccRate: '0.00%',
      ctccSuccess: 0,
      ctccRate: '0.00%',
      totalSuccess: 0,
      totalRate: '0.00%',
    };

    if (total > 0) {
      const [globalReceiptRows]: any = await conn.query(
        `
          SELECT
            COALESCE(SUM(CASE WHEN r.status_message = 'DELIVRD' THEN 1 ELSE 0 END), 0) AS totalSuccess,
            COALESCE(SUM(CASE WHEN LEFT(r.mobile, 3) IN (${CMCC_PREFIXES}) AND r.status_message = 'DELIVRD' THEN 1 ELSE 0 END), 0) AS cmccSuccess,
            COALESCE(SUM(CASE WHEN LEFT(r.mobile, 3) IN (${CMCC_PREFIXES}) THEN 1 ELSE 0 END), 0) AS cmccTotal,
            COALESCE(SUM(CASE WHEN LEFT(r.mobile, 3) IN (${CUCC_PREFIXES}) AND r.status_message = 'DELIVRD' THEN 1 ELSE 0 END), 0) AS cuccSuccess,
            COALESCE(SUM(CASE WHEN LEFT(r.mobile, 3) IN (${CUCC_PREFIXES}) THEN 1 ELSE 0 END), 0) AS cuccTotal,
            COALESCE(SUM(CASE WHEN LEFT(r.mobile, 3) IN (${CTCC_PREFIXES}) AND r.status_message = 'DELIVRD' THEN 1 ELSE 0 END), 0) AS ctccSuccess,
            COALESCE(SUM(CASE WHEN LEFT(r.mobile, 3) IN (${CTCC_PREFIXES}) THEN 1 ELSE 0 END), 0) AS ctccTotal
          FROM yx_user_send_task_cache t
          JOIN yx_send_task_receipt r ON t.task_no = r.task_no
          WHERE ${whereSql} AND r.delete_time = 0
        `,
        params
      );

      const g = globalReceiptRows[0] || {};
      const cmccSuccess = Number(g.cmccSuccess || 0);
      const cmccTotal = Number(g.cmccTotal || 0);
      const cuccSuccess = Number(g.cuccSuccess || 0);
      const cuccTotal = Number(g.cuccTotal || 0);
      const ctccSuccess = Number(g.ctccSuccess || 0);
      const ctccTotal = Number(g.ctccTotal || 0);
      const totalSuccess = Number(g.totalSuccess || 0);

      summary = {
        cmccSuccess,
        cmccRate: calcRate(cmccSuccess, cmccTotal),
        cuccSuccess,
        cuccRate: calcRate(cuccSuccess, cuccTotal),
        ctccSuccess,
        ctccRate: calcRate(ctccSuccess, ctccTotal),
        totalSuccess,
        totalRate: calcRate(totalSuccess, globalTotalNum),
      };
    }

    // 2. 按 send_msg_id 聚合查询统计数据
    const [summaryRows]: any = await conn.query(
      `
        SELECT 
          t.send_msg_id AS orderName,
          COUNT(t.task_no) AS batchCount,
          SUM(t.real_num) AS totalNum,
          SUM(t.send_num) AS sendNum,
          MIN(t.create_time) AS firstSendTime,
          MAX(t.create_time) AS lastSendTime
        FROM yx_user_send_task_cache t
        WHERE ${whereSql}
        GROUP BY t.send_msg_id
        ORDER BY totalNum DESC
        LIMIT ? OFFSET ?
      `,
      [...params, pageSize, offset]
    );

    // 如果当前页有工单，顺便把它们对应的回执成功数也聚合出来
    let resultData = [];
    if (summaryRows.length > 0) {
      const orderNames = summaryRows.map((r: any) => r.orderName);
      const placeholders = orderNames.map(() => '?').join(',');

      // 联表查询对应的回执成功情况
      const [receiptStats]: any = await conn.query(
        `
          SELECT 
            t.send_msg_id AS orderName,
            SUM(CASE WHEN r.status_message = 'DELIVRD' THEN 1 ELSE 0 END) AS totalSuccess,
            -- 移动成功
            SUM(CASE WHEN LEFT(r.mobile, 3) IN ('134','135','136','137','138','139','147','148','150','151','152','157','158','159','172','178','182','183','184','187','188','195','197','198') AND r.status_message = 'DELIVRD' THEN 1 ELSE 0 END) AS cmccArrival,
            SUM(CASE WHEN LEFT(r.mobile, 3) IN ('134','135','136','137','138','139','147','148','150','151','152','157','158','159','172','178','182','183','184','187','188','195','197','198') THEN 1 ELSE 0 END) AS cmccTotal,
            -- 联通成功
            SUM(CASE WHEN LEFT(r.mobile, 3) IN ('130','131','132','145','146','155','156','166','167','171','175','176','185','186','196') AND r.status_message = 'DELIVRD' THEN 1 ELSE 0 END) AS cuccArrival,
            SUM(CASE WHEN LEFT(r.mobile, 3) IN ('130','131','132','145','146','155','156','166','167','171','175','176','185','186','196') THEN 1 ELSE 0 END) AS cuccTotal,
            -- 电信成功
            SUM(CASE WHEN LEFT(r.mobile, 3) IN ('133','149','153','173','174','177','180','181','189','190','191','193','199') AND r.status_message = 'DELIVRD' THEN 1 ELSE 0 END) AS ctccArrival,
            SUM(CASE WHEN LEFT(r.mobile, 3) IN ('133','149','153','173','174','177','180','181','189','190','191','193','199') THEN 1 ELSE 0 END) AS ctccTotal
          FROM yx_user_send_task_cache t
          JOIN yx_send_task_receipt r ON t.task_no = r.task_no
          WHERE ${whereSql} AND r.delete_time = 0 AND t.send_msg_id IN (${placeholders})
          GROUP BY t.send_msg_id
        `,
        [...params, ...orderNames]
      );

      const statsMap = new Map(receiptStats.map((s: any) => [s.orderName, s]));

      resultData = summaryRows.map((row: any) => {
        const stat: any = statsMap.get(row.orderName) || {};
        const totalNum = Number(row.totalNum || 0);
        const totalSuccess = Number(stat.totalSuccess || 0);

        const cmccArrival = Number(stat.cmccArrival || 0);
        const cmccTotal = Number(stat.cmccTotal || 0);
        const cmccFailed = Math.max(0, cmccTotal - cmccArrival);

        const cuccArrival = Number(stat.cuccArrival || 0);
        const cuccTotal = Number(stat.cuccTotal || 0);
        const cuccFailed = Math.max(0, cuccTotal - cuccArrival);

        const ctccArrival = Number(stat.ctccArrival || 0);
        const ctccTotal = Number(stat.ctccTotal || 0);
        const ctccFailed = Math.max(0, ctccTotal - ctccArrival);

        const calcRate = (succ: number, total: number) => total > 0 ? `${((succ / total) * 100).toFixed(2)}%` : '0.00%';

        return {
          orderName: row.orderName,
          batchCount: row.batchCount,
          totalNum,
          totalSuccess,
          cmccArrival,
          cmccFailed,
          cuccArrival,
          cuccFailed,
          ctccArrival,
          ctccFailed,
          arrivalRate: calcRate(totalSuccess, totalNum),
          cmccRate: calcRate(Number(stat.cmccArrival || 0), Number(stat.cmccTotal || 0)),
          cuccRate: calcRate(Number(stat.cuccArrival || 0), Number(stat.cuccTotal || 0)),
          ctccRate: calcRate(Number(stat.ctccArrival || 0), Number(stat.ctccTotal || 0)),
          firstSendTime: new Date(row.firstSendTime * 1000).toLocaleString('zh-CN', { hour12: false }),
          lastSendTime: new Date(row.lastSendTime * 1000).toLocaleString('zh-CN', { hour12: false })
        };
      });
    }

    return NextResponse.json({
      success: true,
      data: resultData,
      summary,
      total,
      page,
      pageSize,
      elapsed: Date.now() - start
    });

  } catch (error: any) {
    console.error('查询汇总报表失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }
}