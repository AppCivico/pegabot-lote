import nodemailer from 'nodemailer';

async function getTransporter(service, host, port, user, pass) {
  return nodemailer.createTransport({
      service,
      host,
      port,
      auth: { user, pass, secure: true },
      tls: { rejectUnauthorized: false },
      debug: true,
  });
}

export default { getTransporter };
