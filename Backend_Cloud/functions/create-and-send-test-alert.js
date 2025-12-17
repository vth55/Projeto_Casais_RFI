/**
 * Script para criar um alerta REAL no Firestore e enviar email
 * CASAIS Fleet Intelligence
 *
 * Este script:
 * 1. Cria um alerta real no Firestore
 * 2. Envia o email com o link de validação
 *
 * Como usar:
 * cd Backend_Cloud/functions
 * EMAIL_USER=xxx EMAIL_PASS=xxx node create-and-send-test-alert.js
 */

const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// Inicializar Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'casais-rfid',
    });
}

const db = admin.firestore();
const APP_ID = 'casais-rfid';
const ALERTS_PATH = `artifacts/${APP_ID}/public/data/alerts`;

// Email de destino
const TEST_EMAIL = process.env.TEST_EMAIL || 'a33137.ipca@gmail.com';

// Gerar token de validação
const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
};

// Template HTML do email
const generateEmailHtml = (alert, validationUrl) => {
    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
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
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #005EB8; color: white; padding: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 20px; background: #f9f9f9; }
        .alert-box { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .details { background: white; padding: 15px; border-radius: 4px; margin: 15px 0; }
        .details table { width: 100%; }
        .details td { padding: 8px 0; border-bottom: 1px solid #eee; }
        .details td:first-child { font-weight: bold; width: 40%; }
        .button { display: inline-block; background: #005EB8; color: white !important; padding: 15px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>CASAIS Fleet Intelligence</h1>
        </div>
        <div class="content">
            <h2>Validação de Sessão Necessária</h2>

            <div class="alert-box">
                <strong>⚠️ Sessão longa - validação necessária</strong>
                <p>A sessão abaixo requer a sua validação ou correção.</p>
            </div>

            <div class="details">
                <table>
                    <tr>
                        <td>Máquina:</td>
                        <td>${alert.machineName || alert.machineId}</td>
                    </tr>
                    <tr>
                        <td>Obra:</td>
                        <td>${alert.obraName || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td>Início:</td>
                        <td>${formatDate(alert.originalStartTime)}</td>
                    </tr>
                    <tr>
                        <td>Fim:</td>
                        <td>${formatDate(alert.originalEndTime)}</td>
                    </tr>
                    <tr>
                        <td>Duração:</td>
                        <td>${alert.originalDurationHours?.toFixed(1) || 'N/A'} horas</td>
                    </tr>
                </table>
            </div>

            <p style="text-align: center;">
                <a href="${validationUrl}" class="button">Validar Sessão</a>
            </p>

            <p style="font-size: 12px; color: #666;">
                Se o botão não funcionar, copie e cole este link no seu navegador:<br>
                <a href="${validationUrl}">${validationUrl}</a>
            </p>
        </div>
        <div class="footer">
            <p>CASAIS Fleet Intelligence - Sistema de Gestão de Frotas</p>
            <p>Este é um email automático. Por favor não responda diretamente.</p>
        </div>
    </div>
</body>
</html>
    `;
};

// Função principal
const createAndSendTestAlert = async () => {
    console.log('\n========================================');
    console.log('   Criar Alerta Real e Enviar Email');
    console.log('========================================\n');

    // Verificar credenciais
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (!emailUser || !emailPass) {
        console.log('ERRO: Credenciais de email não configuradas!\n');
        console.log('Executa assim (PowerShell):');
        console.log('$env:EMAIL_USER="seu.email@gmail.com"; $env:EMAIL_PASS="sua_app_password"; node create-and-send-test-alert.js\n');
        return;
    }

    try {
        // Criar alerta real no Firestore
        const alertId = `alert_test_${Date.now()}`;
        const validationToken = generateToken();
        const now = admin.firestore.Timestamp.now();
        const startTime = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 7 * 60 * 60 * 1000)); // 7h atrás
        const endTime = now;

        const alertData = {
            id: alertId,
            validationToken,
            type: 'LONG_SESSION',
            status: 'PENDING',

            machineId: 'ESC-TEST-001',
            machineName: 'Escavadora Volvo EC220',
            operatorId: 'OP-TEST-001',
            operatorName: 'Operador Teste',
            operatorEmail: TEST_EMAIL,
            obraId: 'obra-test-001',
            obraName: 'Obra Demo - Porto',

            originalStartTime: startTime,
            originalEndTime: endTime,
            originalDurationHours: 7.0,

            correctedStartTime: null,
            correctedEndTime: null,
            correctedDurationHours: null,

            createdAt: now,
            validatedAt: null,
            validatedBy: null,

            emailSentAt: null,
            emailResendCount: 0,

            operatorNotes: '',

            auditLog: [{
                action: 'CREATED',
                timestamp: now,
                details: 'Alerta criado para teste de email',
            }],
        };

        // Salvar no Firestore
        await db.doc(`${ALERTS_PATH}/${alertId}`).set(alertData);
        console.log(`✅ Alerta criado no Firestore: ${alertId}`);
        console.log(`   Token: ${validationToken}\n`);

        // Criar transporter de email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: emailUser,
                pass: emailPass,
            },
        });

        // Construir URL de validação
        const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
        const validationUrl = `${baseUrl}/validar/${validationToken}`;

        // Enviar email
        const mailOptions = {
            from: `"CASAIS Fleet" <${emailUser}>`,
            to: TEST_EMAIL,
            subject: `[TESTE] Validação de Sessão - ${alertData.machineName}`,
            html: generateEmailHtml(alertData, validationUrl),
        };

        const info = await transporter.sendMail(mailOptions);

        // Atualizar alerta com timestamp de envio
        await db.doc(`${ALERTS_PATH}/${alertId}`).update({
            emailSentAt: admin.firestore.Timestamp.now(),
            emailStatus: 'SENT',
        });

        console.log('✅ EMAIL ENVIADO COM SUCESSO!');
        console.log(`   Message ID: ${info.messageId}`);
        console.log(`   Para: ${TEST_EMAIL}`);
        console.log(`   Link de validação: ${validationUrl}`);
        console.log('\n   Verifica a tua caixa de entrada!\n');

    } catch (error) {
        console.error('❌ ERRO:', error.message);
        if (error.message.includes('Invalid login')) {
            console.log('\nDica: Se usas Gmail, precisas de uma App Password.');
            console.log('Vai a: https://myaccount.google.com/apppasswords');
        }
    }
};

// Executar
createAndSendTestAlert();

