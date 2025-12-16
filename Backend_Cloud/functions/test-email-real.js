/**
 * Script de Teste - Email REAL
 * CASAIS Fleet Intelligence
 *
 * Este script envia um email REAL de teste.
 *
 * CONFIGURAÇÃO:
 * 1. Se usar Gmail, criar App Password em:
 *    https://myaccount.google.com/apppasswords
 *    (Requer 2FA ativo na conta)
 *
 * 2. Definir variáveis de ambiente antes de executar:
 *    EMAIL_USER=teu.email@gmail.com
 *    EMAIL_PASS=tua_app_password
 *
 * Como usar:
 *   cd Backend_Cloud/functions
 *   npm install nodemailer (se ainda não instalado)
 *   EMAIL_USER=xxx EMAIL_PASS=xxx node test-email-real.js
 */

const nodemailer = require('nodemailer');

// Email de destino para teste
const TEST_EMAIL = 'a33137.ipca@gmail.com';

// Dados de teste
const mockAlert = {
  id: 'alert_test_' + Date.now(),
  validationToken: 'TEST' + Math.random().toString(36).substring(2, 15).toUpperCase(),
  type: 'LONG_SESSION',
  machineName: 'Escavadora Volvo EC220',
  operatorName: 'Operador Teste',
  operatorEmail: TEST_EMAIL,
  obraName: 'Obra Demo - Porto',
  originalStartTime: new Date(Date.now() - 7 * 60 * 60 * 1000), // 7h atrás
  originalEndTime: new Date(),
  originalDurationHours: 7.0,
};

// Template HTML do email
const generateEmailHtml = (alert, validationUrl) => {
  const formatDate = (date) => {
    return date.toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #005EB8 0%, #0077DD 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 26px; font-weight: 600; }
        .header p { margin: 10px 0 0; opacity: 0.9; font-size: 14px; }
        .content { padding: 30px; }
        .alert-box { background: linear-gradient(135deg, #fff3cd 0%, #ffeeba 100%); border-left: 4px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .alert-box strong { color: #856404; font-size: 16px; }
        .alert-box p { color: #856404; margin: 10px 0 0; font-size: 14px; }
        .details { background: #f8f9fa; padding: 25px; border-radius: 12px; margin: 25px 0; }
        .details table { width: 100%; border-collapse: collapse; }
        .details td { padding: 12px 0; border-bottom: 1px solid #e9ecef; font-size: 14px; }
        .details td:first-child { font-weight: 600; color: #495057; width: 35%; }
        .details td:last-child { color: #212529; }
        .details tr:last-child td { border-bottom: none; }
        .button-container { text-align: center; margin: 30px 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #005EB8 0%, #0077DD 100%); color: white !important; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(0,94,184,0.3); }
        .button:hover { background: linear-gradient(135deg, #004a94 0%, #0066cc 100%); }
        .link-fallback { font-size: 12px; color: #6c757d; margin-top: 20px; word-break: break-all; padding: 15px; background: #f8f9fa; border-radius: 8px; }
        .link-fallback a { color: #005EB8; }
        .footer { text-align: center; padding: 25px; background: #f8f9fa; color: #6c757d; font-size: 12px; border-top: 1px solid #e9ecef; }
        .footer p { margin: 5px 0; }
        .badge { display: inline-block; background: #005EB8; color: white; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>CASAIS Fleet Intelligence</h1>
            <p>Sistema de Gestao de Frotas Industriais</p>
            <span class="badge">TESTE DE EMAIL</span>
        </div>
        <div class="content">
            <h2 style="color: #005EB8; margin-top: 0;">Validacao de Sessao Necessaria</h2>

            <div class="alert-box">
                <strong>Sessao Longa Detetada</strong>
                <p>A sessao abaixo excedeu o limite de horas e requer validacao ou correcao.</p>
            </div>

            <div class="details">
                <table>
                    <tr>
                        <td>Maquina:</td>
                        <td><strong>${alert.machineName}</strong></td>
                    </tr>
                    <tr>
                        <td>Obra:</td>
                        <td>${alert.obraName || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td>Operador:</td>
                        <td>${alert.operatorName}</td>
                    </tr>
                    <tr>
                        <td>Inicio:</td>
                        <td>${formatDate(alert.originalStartTime)}</td>
                    </tr>
                    <tr>
                        <td>Fim:</td>
                        <td>${formatDate(alert.originalEndTime)}</td>
                    </tr>
                    <tr>
                        <td>Duracao:</td>
                        <td><strong style="color: #dc3545;">${alert.originalDurationHours.toFixed(1)} horas</strong></td>
                    </tr>
                </table>
            </div>

            <div class="button-container">
                <a href="${validationUrl}" class="button">Validar Sessao</a>
            </div>

            <div class="link-fallback">
                <strong>Link direto:</strong><br>
                <a href="${validationUrl}">${validationUrl}</a>
            </div>
        </div>
        <div class="footer">
            <p><strong>CASAIS Fleet Intelligence</strong></p>
            <p>Este e um email de TESTE do sistema.</p>
            <p>Enviado em ${formatDate(new Date())}</p>
        </div>
    </div>
</body>
</html>
  `;
};

// Função principal
const sendTestEmail = async () => {
  console.log('\n========================================');
  console.log('   CASAIS Fleet - Teste de Email Real');
  console.log('========================================\n');

  // Verificar credenciais
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    console.log('ERRO: Credenciais de email nao configuradas!\n');
    console.log('Para testar com Gmail:');
    console.log('1. Ativa 2FA na tua conta Google');
    console.log('2. Cria uma App Password em: https://myaccount.google.com/apppasswords');
    console.log('3. Executa o script assim:');
    console.log('   EMAIL_USER=teu.email@gmail.com EMAIL_PASS=tua_app_password node test-email-real.js\n');

    console.log('Alternativa - usar Ethereal (email de teste):');
    console.log('A criar conta Ethereal para teste...\n');

    // Criar conta Ethereal para teste
    try {
      const testAccount = await nodemailer.createTestAccount();
      console.log('Conta Ethereal criada:');
      console.log(`  User: ${testAccount.user}`);
      console.log(`  Pass: ${testAccount.pass}\n`);

      const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      const validationUrl = `http://localhost:5173/validar/${mockAlert.validationToken}`;

      const info = await transporter.sendMail({
        from: '"CASAIS Fleet" <noreply@casais.pt>',
        to: TEST_EMAIL,
        subject: `[TESTE] Validacao de Sessao - ${mockAlert.machineName}`,
        html: generateEmailHtml(mockAlert, validationUrl),
      });

      console.log('Email enviado com sucesso!');
      console.log(`  Message ID: ${info.messageId}`);
      console.log(`\n  VER EMAIL: ${nodemailer.getTestMessageUrl(info)}`);
      console.log('\n  Abre o link acima para ver o email no browser!\n');

    } catch (err) {
      console.error('Erro ao criar conta Ethereal:', err.message);
    }
    return;
  }

  // Enviar email real via Gmail
  console.log(`Enviando email para: ${TEST_EMAIL}`);
  console.log(`De: ${emailUser}\n`);

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    const validationUrl = `http://localhost:5173/validar/${mockAlert.validationToken}`;

    const info = await transporter.sendMail({
      from: `"CASAIS Fleet" <${emailUser}>`,
      to: TEST_EMAIL,
      subject: `[TESTE] Validacao de Sessao - ${mockAlert.machineName}`,
      html: generateEmailHtml(mockAlert, validationUrl),
    });

    console.log('EMAIL ENVIADO COM SUCESSO!');
    console.log(`  Message ID: ${info.messageId}`);
    console.log(`  Para: ${TEST_EMAIL}`);
    console.log('\n  Verifica a tua caixa de entrada!\n');

  } catch (error) {
    console.error('ERRO ao enviar email:', error.message);
    if (error.message.includes('Invalid login')) {
      console.log('\nDica: Se usas Gmail, precisas de uma App Password.');
      console.log('Vai a: https://myaccount.google.com/apppasswords');
    }
  }
};

// Executar
sendTestEmail();
