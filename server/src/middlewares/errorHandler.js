// 글로벌 에러 핸들러 — production에서 스택/내부 메시지 노출 차단.
const errorHandler = (err, req, res, next) => {
  // status 결정: 컨트롤러가 명시한 statusCode가 200이면 500으로 승격
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  const isProd = process.env.NODE_ENV === 'production';

  // 로그는 항상 남기되 (운영에선 별도 로깅 시스템으로)
  // 공개 응답에선 스택/내부 메시지 마스킹
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, err);

  res.status(statusCode).json({
    success: false,
    message: isProd && statusCode >= 500
      ? '서버 오류가 발생했어요. 잠시 후 다시 시도해주세요.'
      : (err.message || 'Internal Server Error'),
    ...(isProd ? {} : { stack: err.stack }),
  });
};

module.exports = errorHandler;
