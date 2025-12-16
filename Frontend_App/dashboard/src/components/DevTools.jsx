/**
 * DevTools - Menu de Desenvolvedor
 * CASAIS Fleet Intelligence
 *
 * IMPORTANTE: Remover este componente antes de entregar para produção!
 *
 * Ferramentas disponíveis:
 * - Simular criação de alertas (normal, urgente, crítico)
 * - Simular scans RFID
 * - Criar dados de teste
 * - Limpar dados de teste
 * - Preview de emails
 * - Navegação rápida
 */

import React, { useState } from 'react';
import {
  Wrench,
  X,
  AlertTriangle,
  CreditCard,
  Mail,
  Trash2,
  Plus,
  Play,
  Clock,
  Copy,
  ExternalLink,
  CheckCircle,
  RefreshCw,
  Eye,
  Navigation,
  AlertCircle,
  Bell,
  Timer,
  QrCode,
  Download,
  Share2,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { db, projectId } from '../config/firebase';
import { doc, setDoc, collection, Timestamp, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import useStore from '../store/useStore';
import useAlertsStore, { ALERT_TYPES, ALERT_STATUS } from '../store/useAlertsStore';

const basePath = `artifacts/${projectId}/public/data`;

// Gerar ID único
const generateId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Gerar token de validação
const generateToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

// Dados de teste
const TEST_DATA = {
  operators: [
    { id: 'OP_TEST_001', name: 'João Silva (Teste)', email: 'joao.teste@casais.pt', role: 'operator' },
    { id: 'OP_TEST_002', name: 'Maria Santos (Teste)', email: 'maria.teste@casais.pt', role: 'operator' },
  ],
  machines: [
    { id: 'MAQ_TEST_001', name: 'Escavadora Demo EC220', category: 'escavadoras', status: 'IDLE' },
    { id: 'MAQ_TEST_002', name: 'Grua Demo TC50', category: 'gruas', status: 'IDLE' },
  ],
  obras: [
    { id: 'OBRA_TEST_001', name: 'Obra Demo - Ponte Norte', location: 'Porto' },
  ],
};

// Componente QR Code Tab
const QRCodeTab = () => {
  const [selectedRole, setSelectedRole] = useState('visualizador');
  const [copied, setCopied] = useState(false);

  const roles = [
    { id: 'visualizador', label: 'Visualizador', desc: 'Apenas visualização de dados' },
    { id: 'juri', label: 'Júri / Avaliador', desc: 'Acesso completo para avaliação' },
    { id: 'admin', label: 'Administrador', desc: 'Acesso total (demo)' },
  ];

  // Gerar URL de acesso com token de role
  const baseUrl = window.location.origin;
  const accessToken = btoa(JSON.stringify({
    role: selectedRole,
    type: 'demo_access',
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24h
  }));
  const accessUrl = `${baseUrl}?access=${accessToken}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(accessUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 400;
      canvas.height = 400;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 400, 400);
      ctx.drawImage(img, 0, 0, 400, 400);

      const link = document.createElement('a');
      link.download = `casais-fleet-qr-${selectedRole}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Gere QR Codes para acesso do júri à apresentação
      </p>

      {/* Seleção de perfil */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-700">Perfil de Acesso:</label>
        <div className="grid gap-2">
          {roles.map(role => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={`flex items-center gap-3 p-2 rounded-lg border text-left transition-all ${
                selectedRole === role.id
                  ? 'bg-primary-50 border-primary-300 ring-2 ring-primary-200'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 ${
                selectedRole === role.id
                  ? 'border-primary-500 bg-primary-500'
                  : 'border-slate-300'
              }`}>
                {selectedRole === role.id && (
                  <div className="w-full h-full flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{role.label}</p>
                <p className="text-[10px] text-slate-500">{role.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* QR Code */}
      <div className="flex flex-col items-center p-4 bg-white border border-slate-200 rounded-xl">
        <QRCodeSVG
          id="qr-code-svg"
          value={accessUrl}
          size={160}
          level="H"
          includeMargin={true}
          bgColor="#ffffff"
          fgColor="#005EB8"
        />
        <p className="mt-3 text-xs font-medium text-slate-700">
          CASAIS Fleet - {roles.find(r => r.id === selectedRole)?.label}
        </p>
        <p className="text-[10px] text-slate-400 mt-1">
          Válido por 24 horas
        </p>
      </div>

      {/* Ações */}
      <div className="flex gap-2">
        <button
          onClick={copyUrl}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            copied
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
          }`}
        >
          {copied ? (
            <>
              <CheckCircle className="w-3.5 h-3.5" />
              Copiado!
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copiar URL
            </>
          )}
        </button>
        <button
          onClick={downloadQR}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary-600 text-white rounded-lg text-xs font-medium hover:bg-primary-700"
        >
          <Download className="w-3.5 h-3.5" />
          Baixar PNG
        </button>
      </div>

      {/* Instruções */}
      <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
        <p className="text-xs font-medium text-blue-700 mb-1">Para a apresentação:</p>
        <ul className="text-[10px] text-blue-600 space-y-0.5">
          <li>1. Selecione o perfil "Júri / Avaliador"</li>
          <li>2. Baixe o QR Code como PNG</li>
          <li>3. Insira no slide da apresentação</li>
          <li>4. O júri pode escanear para aceder ao sistema</li>
        </ul>
      </div>
    </div>
  );
};

// Template de Email HTML
const generateEmailHtml = (alert) => {
  const formatDate = (date) => {
    return date.toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const alertTypeText = {
    'LONG_SESSION': 'Sessão longa - validação necessária',
    'AUTO_CLOSE': 'Sessão fechada automaticamente',
  };

  const validationUrl = `${window.location.origin}/validar/${alert.token}`;

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #005EB8; color: white; padding: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 20px; }
        .alert-box { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .details { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; }
        .details table { width: 100%; border-collapse: collapse; }
        .details td { padding: 8px 0; border-bottom: 1px solid #eee; }
        .details td:first-child { font-weight: bold; width: 40%; color: #666; }
        .button { display: inline-block; background: #005EB8; color: white !important; padding: 15px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; font-weight: bold; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: #f8f9fa; }
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
                <strong>⚠️ ${alertTypeText[alert.type] || 'Alerta de Sessão'}</strong>
                <p style="margin: 5px 0 0 0;">A sessão abaixo requer a sua validação ou correção.</p>
            </div>

            <div class="details">
                <table>
                    <tr>
                        <td>Máquina:</td>
                        <td>${alert.machineName}</td>
                    </tr>
                    <tr>
                        <td>Obra:</td>
                        <td>${alert.obraName}</td>
                    </tr>
                    <tr>
                        <td>Operador:</td>
                        <td>${alert.operatorName}</td>
                    </tr>
                    <tr>
                        <td>Início:</td>
                        <td>${formatDate(alert.startTime)}</td>
                    </tr>
                    <tr>
                        <td>Fim:</td>
                        <td>${formatDate(alert.endTime)}</td>
                    </tr>
                    <tr>
                        <td>Duração:</td>
                        <td><strong>${alert.durationHours.toFixed(1)} horas</strong></td>
                    </tr>
                </table>
            </div>

            <p style="text-align: center;">
                <a href="${validationUrl}" class="button">Validar Sessão</a>
            </p>

            <p style="font-size: 12px; color: #666; text-align: center;">
                Se o botão não funcionar, copie e cole este link no navegador:<br>
                <a href="${validationUrl}" style="color: #005EB8;">${validationUrl}</a>
            </p>
        </div>
        <div class="footer">
            <p><strong>CASAIS Fleet Intelligence</strong><br>Sistema de Gestão de Frotas</p>
            <p>Este é um email automático. Por favor não responda diretamente.</p>
        </div>
    </div>
</body>
</html>`;
};

// Modal de Preview do Email
const EmailPreviewModal = ({ alert, onClose }) => {
  if (!alert) return null;

  const emailHtml = generateEmailHtml(alert);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-900">Preview do Email</h3>
            <p className="text-xs text-slate-500">Este é o email que seria enviado ao operador</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-slate-100 p-4">
          <iframe
            srcDoc={emailHtml}
            title="Email Preview"
            className="w-full h-[500px] bg-white rounded-lg shadow"
            style={{ border: 'none' }}
          />
        </div>
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
          <p className="text-xs text-slate-500">
            <Mail className="w-3 h-3 inline mr-1" />
            Para: {alert.operatorEmail}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-sm font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

const DevTools = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('alerts');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [lastCreatedAlert, setLastCreatedAlert] = useState(null);
  const [emailPreview, setEmailPreview] = useState(null);

  const { setActiveView } = useStore();

  // Mostrar mensagem temporária
  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  // Criar alerta de teste com diferentes níveis de urgência
  const createTestAlert = async (type = 'LONG_SESSION', hoursAgo = 0) => {
    setLoading(true);
    try {
      const alertId = generateId('alert');
      const token = generateToken();

      const operator = TEST_DATA.operators[0];
      const machine = TEST_DATA.machines[type === 'LONG_SESSION' ? 0 : 1];
      const obra = TEST_DATA.obras[0];

      // Calcular horários
      const now = new Date();
      const createdAt = new Date(now.getTime() - (hoursAgo * 60 * 60 * 1000));
      const endTime = new Date(createdAt.getTime() - (1 * 60 * 60 * 1000)); // 1h antes do alerta
      const startTime = new Date(endTime.getTime() - (6.5 * 60 * 60 * 1000)); // sessão de 6.5h

      const alertData = {
        id: alertId,
        validationToken: token,
        type: type,
        status: ALERT_STATUS.PENDING,

        sessionId: generateId('session'),
        machineId: machine.id,
        machineName: machine.name,
        operatorId: operator.id,
        operatorName: operator.name,
        operatorEmail: operator.email,
        obraId: obra.id,
        obraName: obra.name,

        originalStartTime: Timestamp.fromDate(startTime),
        originalEndTime: Timestamp.fromDate(endTime),
        originalDurationHours: 6.5,

        correctedStartTime: null,
        correctedEndTime: null,
        correctedDurationHours: null,

        createdAt: Timestamp.fromDate(createdAt),
        validatedAt: null,
        validatedBy: null,

        emailSentAt: Timestamp.fromDate(createdAt),
        emailResendCount: 0,
        lastEmailResendAt: null,

        operatorNotes: '',
        isTestData: true,

        auditLog: [{
          action: 'CREATED',
          timestamp: Timestamp.fromDate(createdAt),
          details: `[DEV] Alerta de teste criado: ${type}${hoursAgo > 0 ? ` (${hoursAgo}h atrás)` : ''}`,
        }],
      };

      await setDoc(doc(db, `${basePath}/alerts`, alertId), alertData);

      const alertInfo = {
        id: alertId,
        token,
        type,
        machineName: machine.name,
        operatorName: operator.name,
        operatorEmail: operator.email,
        obraName: obra.name,
        startTime,
        endTime,
        durationHours: 6.5,
        hoursAgo,
      };

      setLastCreatedAlert(alertInfo);

      // Log no console
      console.log('\n📧 [DEV MODE] Email de Validação Simulado:');
      console.log('═'.repeat(60));
      console.log(`Para: ${operator.email}`);
      console.log(`Assunto: Validação de Sessão - ${machine.name}`);
      console.log(`Link: ${window.location.origin}/validar/${token}`);
      if (hoursAgo > 0) console.log(`Pendente há: ${hoursAgo} horas`);
      console.log('═'.repeat(60));

      const urgencyText = hoursAgo >= 72 ? ' (URGENTE)' : hoursAgo >= 48 ? ' (CRÍTICO)' : hoursAgo >= 24 ? ' (ATENÇÃO)' : '';
      showMessage(`Alerta criado${urgencyText}!`);
    } catch (error) {
      console.error('Erro ao criar alerta:', error);
      showMessage(`Erro: ${error.message}`, 'error');
    }
    setLoading(false);
  };

  // Simular scan RFID
  const simulateRfidScan = async (action = 'start') => {
    setLoading(true);
    try {
      const operator = TEST_DATA.operators[0];
      const machine = TEST_DATA.machines[0];

      const sessionsRef = collection(db, `${basePath}/sessions`);
      const q = query(sessionsRef, where('machineId', '==', machine.id), where('status', '==', 'OPEN'));
      const snapshot = await getDocs(q);

      if (snapshot.empty && action === 'start') {
        const sessionId = generateId('session');
        await setDoc(doc(db, `${basePath}/sessions`, sessionId), {
          id: sessionId,
          cardId: operator.id,
          machineId: machine.id,
          startTime: Timestamp.now(),
          endTime: null,
          durationHours: 0,
          status: 'OPEN',
          isTestData: true,
        });

        await setDoc(doc(db, `${basePath}/machines`, machine.id), {
          ...machine,
          status: 'ACTIVE',
          lastOperator: operator.id,
        }, { merge: true });

        showMessage(`Sessão iniciada: ${operator.name}`);
      } else if (!snapshot.empty && action === 'stop') {
        const sessionDoc = snapshot.docs[0];
        const sessionData = sessionDoc.data();
        const startTime = sessionData.startTime.toDate();
        const endTime = new Date();
        const durationHours = (endTime - startTime) / (1000 * 60 * 60);

        await setDoc(doc(db, `${basePath}/sessions`, sessionDoc.id), {
          ...sessionData,
          endTime: Timestamp.fromDate(endTime),
          durationHours,
          status: 'CLOSED',
        });

        await setDoc(doc(db, `${basePath}/machines`, machine.id), {
          ...machine,
          status: 'IDLE',
        }, { merge: true });

        showMessage(`Sessão fechada: ${durationHours.toFixed(2)}h`);
      } else {
        showMessage(snapshot.empty ? 'Nenhuma sessão para fechar' : 'Já existe sessão aberta', 'error');
      }
    } catch (error) {
      console.error('Erro ao simular scan:', error);
      showMessage(`Erro: ${error.message}`, 'error');
    }
    setLoading(false);
  };

  // Criar dados de teste
  const createTestData = async () => {
    setLoading(true);
    try {
      for (const op of TEST_DATA.operators) {
        await setDoc(doc(db, `${basePath}/operators`, op.id), {
          ...op,
          isTestData: true,
          createdAt: Timestamp.now(),
        });
      }

      for (const m of TEST_DATA.machines) {
        await setDoc(doc(db, `${basePath}/machines`, m.id), {
          ...m,
          isTestData: true,
          totalHours: 0,
          createdAt: Timestamp.now(),
        });
      }

      for (const o of TEST_DATA.obras) {
        await setDoc(doc(db, `${basePath}/obras`, o.id), {
          ...o,
          isTestData: true,
          status: 'active',
          createdAt: Timestamp.now(),
        });
      }

      showMessage('Dados de teste criados!');
    } catch (error) {
      console.error('Erro ao criar dados:', error);
      showMessage(`Erro: ${error.message}`, 'error');
    }
    setLoading(false);
  };

  // Limpar dados de teste
  const clearTestData = async () => {
    if (!confirm('Tens a certeza que queres apagar todos os dados de teste?')) return;

    setLoading(true);
    try {
      const collections = ['alerts', 'sessions', 'operators', 'machines', 'obras'];

      for (const col of collections) {
        const ref = collection(db, `${basePath}/${col}`);
        const q = query(ref, where('isTestData', '==', true));
        const snapshot = await getDocs(q);

        for (const docSnap of snapshot.docs) {
          await deleteDoc(doc(db, `${basePath}/${col}`, docSnap.id));
        }
      }

      setLastCreatedAlert(null);
      showMessage('Dados de teste removidos!');
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
      showMessage(`Erro: ${error.message}`, 'error');
    }
    setLoading(false);
  };

  // Navegação rápida
  const navigateTo = (view) => {
    setActiveView(view);
    setIsOpen(false);
  };

  // Copiar link de validação
  const copyValidationLink = () => {
    if (!lastCreatedAlert) return;
    const link = `${window.location.origin}/validar/${lastCreatedAlert.token}`;
    navigator.clipboard.writeText(link);
    showMessage('Link copiado!');
  };

  // Abrir link de validação
  const openValidationLink = () => {
    if (!lastCreatedAlert) return;
    window.open(`/validar/${lastCreatedAlert.token}`, '_blank');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
        title="DevTools - Ferramentas de Desenvolvimento"
      >
        <Wrench className="w-6 h-6" />
      </button>
    );
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-purple-600 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            <span className="font-bold">DevTools</span>
            <span className="text-xs bg-red-500 px-2 py-0.5 rounded animate-pulse">APAGAR ANTES DE ENTREGAR</span>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-purple-500 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`px-4 py-2 text-sm ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          {[
            { id: 'alerts', label: 'Alertas', icon: AlertTriangle },
            { id: 'rfid', label: 'RFID', icon: CreditCard },
            { id: 'qr', label: 'QR Code', icon: QrCode },
            { id: 'email', label: 'Email', icon: Mail },
            { id: 'nav', label: 'Navegar', icon: Navigation },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-2 py-2 text-xs font-medium flex items-center justify-center gap-1 ${
                activeTab === tab.id
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 max-h-[400px] overflow-y-auto">
          {/* Alertas Tab */}
          {activeTab === 'alerts' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 mb-2">
                Criar alertas com diferentes níveis de urgência
              </p>

              {/* Alertas normais */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => createTestAlert('LONG_SESSION', 0)}
                  disabled={loading}
                  className="flex items-center gap-2 p-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-left text-sm"
                >
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span className="font-medium">Sessão Longa</span>
                </button>

                <button
                  onClick={() => createTestAlert('AUTO_CLOSE', 0)}
                  disabled={loading}
                  className="flex items-center gap-2 p-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-left text-sm"
                >
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="font-medium">Auto-Fecho</span>
                </button>
              </div>

              {/* Alertas com urgência */}
              <div className="mt-3 pt-3 border-t border-slate-200">
                <p className="text-xs text-slate-500 mb-2">Simular alertas pendentes há tempo:</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => createTestAlert('LONG_SESSION', 24)}
                    disabled={loading}
                    className="flex flex-col items-center p-2 bg-yellow-50 hover:bg-yellow-100 border border-yellow-300 rounded-lg"
                  >
                    <Timer className="w-4 h-4 text-yellow-600" />
                    <span className="text-xs font-medium text-yellow-700">24h</span>
                    <span className="text-[10px] text-yellow-600">Atenção</span>
                  </button>

                  <button
                    onClick={() => createTestAlert('LONG_SESSION', 48)}
                    disabled={loading}
                    className="flex flex-col items-center p-2 bg-orange-50 hover:bg-orange-100 border border-orange-300 rounded-lg"
                  >
                    <Bell className="w-4 h-4 text-orange-600" />
                    <span className="text-xs font-medium text-orange-700">48h</span>
                    <span className="text-[10px] text-orange-600">Crítico</span>
                  </button>

                  <button
                    onClick={() => createTestAlert('LONG_SESSION', 72)}
                    disabled={loading}
                    className="flex flex-col items-center p-2 bg-red-50 hover:bg-red-100 border border-red-300 rounded-lg"
                  >
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-xs font-medium text-red-700">72h</span>
                    <span className="text-[10px] text-red-600">Urgente</span>
                  </button>
                </div>
              </div>

              {/* Último alerta */}
              {lastCreatedAlert && (
                <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-xs font-medium text-purple-700 mb-2">Último alerta criado:</p>
                  <div className="flex gap-2">
                    <button
                      onClick={copyValidationLink}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-white border border-purple-300 rounded text-xs text-purple-700 hover:bg-purple-100"
                    >
                      <Copy className="w-3 h-3" />
                      Copiar Link
                    </button>
                    <button
                      onClick={openValidationLink}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-purple-600 rounded text-xs text-white hover:bg-purple-700"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Abrir
                    </button>
                    <button
                      onClick={() => setEmailPreview(lastCreatedAlert)}
                      className="flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-600 rounded text-xs text-white hover:bg-blue-700"
                    >
                      <Eye className="w-3 h-3" />
                      Email
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RFID Tab */}
          {activeTab === 'rfid' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 mb-2">
                Simular leituras de cartão RFID
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => simulateRfidScan('start')}
                  disabled={loading}
                  className="flex flex-col items-center gap-2 p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg"
                >
                  <Play className="w-8 h-8 text-green-600" />
                  <span className="font-medium text-green-800">Iniciar Sessão</span>
                  <span className="text-xs text-green-600">Scan entrada</span>
                </button>

                <button
                  onClick={() => simulateRfidScan('stop')}
                  disabled={loading}
                  className="flex flex-col items-center gap-2 p-4 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg"
                >
                  <CheckCircle className="w-8 h-8 text-red-600" />
                  <span className="font-medium text-red-800">Terminar Sessão</span>
                  <span className="text-xs text-red-600">Scan saída</span>
                </button>
              </div>

              <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <p className="font-medium mb-1">Dados da simulação:</p>
                <p><strong>Operador:</strong> {TEST_DATA.operators[0].name}</p>
                <p><strong>Máquina:</strong> {TEST_DATA.machines[0].name}</p>
              </div>
            </div>
          )}

          {/* QR Code Tab */}
          {activeTab === 'qr' && (
            <QRCodeTab />
          )}

          {/* Email Tab */}
          {activeTab === 'email' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 mb-2">
                Preview e teste de emails
              </p>

              <button
                onClick={() => {
                  const mockAlert = {
                    token: 'DEMO_TOKEN_12345',
                    type: 'LONG_SESSION',
                    machineName: 'Escavadora Demo EC220',
                    operatorName: 'João Silva',
                    operatorEmail: 'joao.teste@casais.pt',
                    obraName: 'Obra Demo - Ponte Norte',
                    startTime: new Date(Date.now() - 7 * 60 * 60 * 1000),
                    endTime: new Date(Date.now() - 30 * 60 * 1000),
                    durationHours: 6.5,
                  };
                  setEmailPreview(mockAlert);
                }}
                className="w-full flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-left"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Eye className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Ver Preview do Email</p>
                  <p className="text-xs text-slate-500">Mostra como o operador vê o email</p>
                </div>
              </button>

              {lastCreatedAlert && (
                <button
                  onClick={() => setEmailPreview(lastCreatedAlert)}
                  className="w-full flex items-center gap-3 p-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg text-left"
                >
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Email do Último Alerta</p>
                    <p className="text-xs text-slate-500">{lastCreatedAlert.machineName}</p>
                  </div>
                </button>
              )}

              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                <p className="font-medium mb-1">Nota:</p>
                <p>Em modo DEV, os emails não são enviados. Apenas são registados no console (F12).</p>
              </div>
            </div>
          )}

          {/* Nav Tab */}
          {activeTab === 'nav' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 mb-2">
                Navegação rápida para páginas
              </p>

              {[
                { view: 'dashboard', label: 'Dashboard', desc: 'Página principal' },
                { view: 'sessoes-corrigidas', label: 'Validação de Sessões', desc: 'Ver alertas pendentes' },
                { view: 'sessoes', label: 'Sessões', desc: 'Histórico de sessões' },
                { view: 'maquinas', label: 'Máquinas', desc: 'Lista de equipamentos' },
                { view: 'operadores', label: 'Operadores', desc: 'Lista de funcionários' },
                { view: 'obras', label: 'Obras', desc: 'Gestão de obras' },
                { view: 'configuracoes', label: 'Configurações', desc: 'Definições do sistema' },
              ].map(item => (
                <button
                  key={item.view}
                  onClick={() => navigateTo(item.view)}
                  className="w-full flex items-center justify-between p-2 hover:bg-slate-50 border border-slate-200 rounded-lg text-left"
                >
                  <div>
                    <p className="font-medium text-sm text-slate-900">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer com ações de dados */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={createTestData}
              disabled={loading}
              className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              <Plus className="w-3 h-3 inline mr-1" />
              Criar Dados
            </button>
            <button
              onClick={clearTestData}
              disabled={loading}
              className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              <Trash2 className="w-3 h-3 inline mr-1" />
              Limpar
            </button>
          </div>
          {loading && (
            <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />
          )}
        </div>
      </div>

      {/* Email Preview Modal */}
      {emailPreview && (
        <EmailPreviewModal alert={emailPreview} onClose={() => setEmailPreview(null)} />
      )}
    </>
  );
};

export default DevTools;
