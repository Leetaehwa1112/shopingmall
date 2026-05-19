// ─── 이메일 발송 추상화 (Mailer) ──────────────────────────
// 외부 메일 서비스(SendGrid / SES / Mailgun 등) 도입 전 stub.
// 도입 시 send() 본문만 교체하면 호출부 변경 불필요.
//
// 개발 모드에서는 console에 토큰 링크 출력 (테스트 가능).
// 운영 모드에서는 실제 발송 — 미구현 시 noop + 로그.

const isProd = process.env.NODE_ENV === 'production'

/**
 * 메일 발송. 실제 발송은 외부 서비스 도입 시 구현.
 * @param {Object} opts
 * @param {string} opts.to       - 수신자 이메일
 * @param {string} opts.subject  - 제목
 * @param {string} opts.text     - 평문 본문
 * @param {string} [opts.html]   - HTML 본문 (선택)
 */
async function send({ to, subject, text, html }) {
  // TODO(prod): SendGrid / SES / Mailgun SDK로 교체
  // 예) await sgMail.send({ to, from: process.env.MAIL_FROM, subject, text, html })

  if (!isProd) {
    console.log('\n📧 [DEV MAIL]')
    console.log(`  To:      ${to}`)
    console.log(`  Subject: ${subject}`)
    console.log(`  Body:    ${text}`)
    console.log('')
  } else {
    // 운영 환경에서 메일러 미구성 — 경고만 로깅 (요청은 막지 않음)
    console.warn(`[mailer] 메일러 미구성: '${subject}' to ${to} 발송 건너뜀.`)
  }
}

// ─── 사전 정의 템플릿 ─────────────────────────────────────
function sendVerifyEmail(to, token, baseUrl) {
  const link = `${baseUrl}/verify-email?token=${token}`
  return send({
    to,
    subject: '[POKÉVAULT] 이메일 인증을 완료해주세요',
    text: `아래 링크를 24시간 내 클릭해 인증을 완료해주세요:\n\n${link}\n\n본인이 요청하지 않았다면 이 메일을 무시해주세요.`,
  })
}

function sendPasswordReset(to, token, baseUrl) {
  const link = `${baseUrl}/reset-password?token=${token}`
  return send({
    to,
    subject: '[POKÉVAULT] 비밀번호 재설정',
    text: `아래 링크를 30분 내 클릭해 비밀번호를 재설정하세요:\n\n${link}\n\n본인이 요청하지 않았다면 이 메일을 무시해주세요.`,
  })
}

module.exports = { send, sendVerifyEmail, sendPasswordReset }
