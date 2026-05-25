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

import React, { useState, useEffect } from 'react';
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
  Send,
  Settings,
  FastForward,
  Gauge,
  Zap,
  MapPin,
  Truck,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { db, projectId } from '../config/firebase';
import { doc, setDoc, collection, Timestamp, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import useStore from '../store/useStore';
import useAuthStore from '../store/useAuthStore';
import { ALERT_STATUS } from '../store/useAlertsStore';
import { DEFAULT_ROLES } from '../config/permissions';

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

// Configuração de email para testes (guardada no localStorage)
const EMAIL_CONFIG_KEY = 'casais-dev-email-config';
const getEmailConfig = () => {
  try {
    return JSON.parse(localStorage.getItem(EMAIL_CONFIG_KEY)) || {};
  } catch {
    return {};
  }
};
const saveEmailConfig = (config) => {
  localStorage.setItem(EMAIL_CONFIG_KEY, JSON.stringify(config));
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
  const [selectedRole, setSelectedRole] = useState('operador');
  const [copied, setCopied] = useState(false);

  const roles = [
    { id: 'operador', label: 'Operador de Campo', desc: 'Mobile Hub, reportar avarias' },
    { id: 'juri', label: 'Júri / Avaliador', desc: 'Acesso completo para avaliação' },
    { id: 'admin', label: 'Administrador', desc: 'Acesso total (demo)' },
  ];

  // Generate access URL with role token
  const [accessUrl, setAccessUrl] = useState('');

  useEffect(() => {
    const baseUrl = window.location.origin;
    const expDate = Date.now() + 24 * 60 * 60 * 1000; // 24h from now
    const accessToken = btoa(JSON.stringify({
      role: selectedRole,
      type: 'demo_access',
      exp: expDate,
    }));
    setAccessUrl(`${baseUrl}?access=${accessToken}`);
  }, [selectedRole]);

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

      {/* Simular Reporte de Avaria */}
      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
        <p className="text-xs font-medium text-purple-700 mb-2">Simular Reporte de Avaria (Móvel)</p>
        <p className="text-[10px] text-purple-600 mb-3">
          Abre o ecrã que o operador vê ao ler o QR Code — popup com tamanho de iPhone.
        </p>
        <button
          onClick={() => window.open('#/reporte-avaria', '_blank', 'width=390,height=844')}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors"
        >
          <AlertTriangle className="w-4 h-4" />
          Abrir Ecrã de Avaria (Mobile)
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

// Componente Location Card Tab - Gestão de Cartões RFID de Localização
const LocationCardTab = ({ showMessage }) => {
  const { obras, machines, locationCards, addLocationCard, deleteLocationCard } = useStore();
  const [selectedObra, setSelectedObra] = useState('');
  const [selectedMachine, setSelectedMachine] = useState('');
  const [cardDescription, setCardDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const activeObras = obras.filter(o => o.status === 'ACTIVE' || o.status === 'active');

  // Criar novo cartão de localização
  const handleCreateCard = async () => {
    if (!selectedObra) {
      showMessage('Selecione uma obra', 'error');
      return;
    }

    setCreating(true);
    try {
      const obra = obras.find(o => o.id === selectedObra);
      const result = await addLocationCard({
        obraId: obra.id,
        obraName: obra.name,
        gps: obra.gps || null,
        description: cardDescription || `Cartão de localização - ${obra.name}`,
      });

      if (result.success) {
        showMessage(`Cartão ${result.id} criado!`);
        setCardDescription('');
      } else {
        showMessage(`Erro: ${result.error}`, 'error');
      }
    } catch (error) {
      showMessage(`Erro: ${error.message}`, 'error');
    }
    setCreating(false);
  };

  // Simular scan de cartão de localização
  const simulateLocationScan = async (cardId) => {
    if (!selectedMachine) {
      showMessage('Selecione uma máquina primeiro', 'error');
      return;
    }

    setSimulating(true);
    try {
      const response = await fetch(
        'https://us-central1-casais-rfid.cloudfunctions.net/handleSessionTrigger',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardId: cardId,
            machineId: selectedMachine,
          }),
        }
      );

      const result = await response.json();

      if (result.status === 'LOCATION_CHANGED') {
        showMessage(`Máquina movida para ${result.newLocation}!`);
      } else if (result.status === 'LOCATION_NOT_FOUND') {
        showMessage('Cartão de localização não registado', 'error');
      } else {
        showMessage(`Resposta: ${result.message || result.status}`, 'error');
      }
    } catch (error) {
      showMessage(`Erro: ${error.message}`, 'error');
    }
    setSimulating(false);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Cartões RFID de localização mudam a obra de uma máquina
      </p>

      {/* Criar novo cartão */}
      <div className="p-3 bg-slate-50 rounded-lg space-y-3">
        <p className="text-xs font-medium text-slate-700 flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" />
          Criar Cartão de Localização
        </p>

        <select
          value={selectedObra}
          onChange={(e) => setSelectedObra(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
        >
          <option value="">Selecionar obra...</option>
          {activeObras.map(obra => (
            <option key={obra.id} value={obra.id}>{obra.name}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Descrição (opcional)"
          value={cardDescription}
          onChange={(e) => setCardDescription(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
        />

        <button
          onClick={handleCreateCard}
          disabled={creating || !selectedObra}
          className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-slate-300"
        >
          {creating ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Criar Cartão LOC_
        </button>
      </div>

      {/* Cartões existentes */}
      {locationCards.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-700">
            Cartões Existentes ({locationCards.length})
          </p>

          {/* Seleção de máquina para simular */}
          <select
            value={selectedMachine}
            onChange={(e) => setSelectedMachine(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
          >
            <option value="">Máquina para simular scan...</option>
            {machines.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          <div className="space-y-2 max-h-40 overflow-y-auto">
            {locationCards.map(card => (
              <div
                key={card.id}
                className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-xs font-medium text-slate-900">{card.id}</p>
                    <p className="text-[10px] text-slate-500">{card.obraName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => simulateLocationScan(card.id)}
                    disabled={simulating || !selectedMachine}
                    className="p-1.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 disabled:opacity-50"
                    title="Simular scan nesta máquina"
                  >
                    <Truck className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteLocationCard(card.id)}
                    className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200"
                    title="Eliminar cartão"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg text-[10px] text-blue-700">
        <p className="font-medium">Como funciona:</p>
        <ul className="list-disc list-inside space-y-0.5 mt-1">
          <li>Cartões com prefixo <strong>LOC_</strong> são de localização</li>
          <li>Quando escaneado numa máquina, muda a localização</li>
          <li>Útil para mudar máquinas de obra rapidamente</li>
        </ul>
      </div>
    </div>
  );
};

// Componente Email Real Tab - Usa a Cloud Function createTestAlertAndSendEmail
const EmailSendTab = ({ showMessage, onAlertCreated }) => {
  const [emailConfig, setEmailConfig] = useState(getEmailConfig);
  const [destinationEmail, setDestinationEmail] = useState(emailConfig.lastDestination || 'a33137.ipca@gmail.com');
  const [sending, setSending] = useState(false);
  const [showConfig, setShowConfig] = useState(!emailConfig.smtpUser);
  const [lastResult, setLastResult] = useState(null);

  const handleSaveConfig = () => {
    saveEmailConfig({
      smtpUser: emailConfig.smtpUser,
      smtpPass: emailConfig.smtpPass,
      lastDestination: destinationEmail,
    });
    showMessage('Configuração guardada!');
    setShowConfig(false);
  };

  // Criar alerta E enviar email num só passo
  const createAlertAndSendEmail = async () => {
    if (!destinationEmail) {
      showMessage('Introduz o email de destino', 'error');
      return;
    }

    if (!emailConfig.smtpUser || !emailConfig.smtpPass) {
      showMessage('Configura as credenciais SMTP primeiro', 'error');
      setShowConfig(true);
      return;
    }

    setSending(true);
    setLastResult(null);

    try {
      // Chamar a Cloud Function que faz tudo num só passo
      const response = await fetch(
        'https://us-central1-casais-rfid.cloudfunctions.net/createTestAlertAndSendEmail',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            destinationEmail,
            baseUrl: window.location.origin,
            smtpConfig: {
              user: emailConfig.smtpUser,
              pass: emailConfig.smtpPass,
            },
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        saveEmailConfig({ ...emailConfig, lastDestination: destinationEmail });
        setLastResult(result);
        showMessage(`Email enviado para ${destinationEmail}!`);
        console.log('📧 Alerta criado e email enviado:', result);

        // Notificar que foi criado um alerta (para outras tabs)
        if (onAlertCreated) {
          onAlertCreated({
            id: result.alertId,
            token: result.validationToken,
            validationUrl: result.validationUrl,
          });
        }
      } else {
        throw new Error(result.error || result.message || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro ao criar alerta/enviar email:', error);

      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        showMessage('Cloud Functions não disponíveis. Faz deploy primeiro.', 'error');
      } else {
        showMessage(`Erro: ${error.message}`, 'error');
      }
    }
    setSending(false);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Criar alerta de teste e enviar email real
      </p>

      {/* Configuração SMTP */}
      {showConfig ? (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-700">Configuração Gmail</p>
            <button
              onClick={() => setShowConfig(false)}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="block text-xs text-slate-600 mb-1">Email Gmail</label>
            <input
              type="email"
              value={emailConfig.smtpUser || ''}
              onChange={(e) => setEmailConfig({ ...emailConfig, smtpUser: e.target.value })}
              placeholder="teu.email@gmail.com"
              className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-600 mb-1">App Password</label>
            <input
              type="password"
              value={emailConfig.smtpPass || ''}
              onChange={(e) => setEmailConfig({ ...emailConfig, smtpPass: e.target.value })}
              placeholder="xxxx xxxx xxxx xxxx"
              className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <a
              href="https://myaccount.google.com/apppasswords"
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-blue-600 hover:underline"
            >
              Criar App Password no Google
            </a>
          </div>

          <button
            onClick={handleSaveConfig}
            className="w-full py-1.5 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700"
          >
            Guardar Configuração
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowConfig(true)}
          className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs hover:bg-slate-100"
        >
          <span className="text-slate-600">
            <Settings className="w-3.5 h-3.5 inline mr-1" />
            {emailConfig.smtpUser ? `Configurado: ${emailConfig.smtpUser}` : 'Configurar SMTP'}
          </span>
          <span className="text-slate-400">▸</span>
        </button>
      )}

      {/* Email de destino */}
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Email de Destino</label>
        <input
          type="email"
          value={destinationEmail}
          onChange={(e) => setDestinationEmail(e.target.value)}
          placeholder="destinatario@email.com"
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20"
        />
      </div>

      {/* Botão principal - Criar + Enviar */}
      <button
        onClick={createAlertAndSendEmail}
        disabled={sending}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors ${
          sending
            ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {sending ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            A criar alerta e enviar...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Criar Alerta + Enviar Email
          </>
        )}
      </button>

      {/* Resultado do último envio */}
      {lastResult && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-2">
          <p className="text-xs font-medium text-green-700 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            Email enviado com sucesso!
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(lastResult.validationUrl);
                showMessage('Link copiado!');
              }}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-white border border-green-300 rounded text-xs text-green-700 hover:bg-green-100"
            >
              <Copy className="w-3 h-3" />
              Copiar Link
            </button>
            <button
              onClick={() => window.open(lastResult.validationUrl, '_blank')}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-600 rounded text-xs text-white hover:bg-green-700"
            >
              <ExternalLink className="w-3 h-3" />
              Abrir Validação
            </button>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg text-[10px] text-blue-700">
        <p className="font-medium">Esta função faz tudo num passo:</p>
        <ol className="list-decimal list-inside space-y-0.5 mt-1">
          <li>Cria um alerta de teste no Firestore</li>
          <li>Envia o email de validação</li>
          <li>O link do email funciona normalmente!</li>
        </ol>
      </div>
    </div>
  );
};

// Componente Demo Time Tab - Controle de tempo para demonstrações
const DemoTimeTab = ({ showMessage }) => {
  const { machines, sessions } = useStore();
  const [selectedMachine, setSelectedMachine] = useState('');
  const [hoursToAdd, setHoursToAdd] = useState(3);
  const [creating, setCreating] = useState(false);

  // Criar sessão com tempo específico (para demo)
  const createDemoSession = async (durationHours) => {
    setCreating(true);
    try {
      const machine = machines.find(m => m.id === selectedMachine) || TEST_DATA.machines[0];
      const operator = TEST_DATA.operators[0];
      const obra = TEST_DATA.obras[0];

      const sessionId = generateId('session');
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - (durationHours * 60 * 60 * 1000));

      await setDoc(doc(db, `${basePath}/sessions`, sessionId), {
        id: sessionId,
        cardId: operator.id,
        machineId: machine.id,
        machineName: machine.name,
        operatorName: operator.name,
        obraId: obra.id,
        obraName: obra.name,
        startTime: Timestamp.fromDate(startTime),
        endTime: Timestamp.fromDate(endTime),
        durationHours: durationHours,
        status: 'CLOSED',
        isTestData: true,
        createdAt: Timestamp.now(),
      });

      showMessage(`Sessão de ${durationHours}h criada!`);
    } catch (error) {
      console.error('Erro ao criar sessão:', error);
      showMessage(`Erro: ${error.message}`, 'error');
    }
    setCreating(false);
  };

  // Criar sessão ABERTA com tempo passado (para simular máquina ligada há X horas)
  const createOpenDemoSession = async (hoursAgo) => {
    setCreating(true);
    try {
      const machine = machines.find(m => m.id === selectedMachine) || TEST_DATA.machines[0];
      const operator = TEST_DATA.operators[0];
      const obra = TEST_DATA.obras[0];

      const sessionId = generateId('session');
      const startTime = new Date(Date.now() - (hoursAgo * 60 * 60 * 1000));

      await setDoc(doc(db, `${basePath}/sessions`, sessionId), {
        id: sessionId,
        cardId: operator.id,
        machineId: machine.id,
        machineName: machine.name,
        operatorName: operator.name,
        obraId: obra.id,
        obraName: obra.name,
        startTime: Timestamp.fromDate(startTime),
        endTime: null,
        durationHours: 0,
        status: 'OPEN',
        isTestData: true,
        createdAt: Timestamp.now(),
      });

      // Atualizar status da máquina
      await setDoc(doc(db, `${basePath}/machines`, machine.id), {
        status: 'ACTIVE',
        lastOperator: operator.id,
      }, { merge: true });

      showMessage(`Máquina a operar há ${hoursAgo}h!`);
    } catch (error) {
      console.error('Erro ao criar sessão:', error);
      showMessage(`Erro: ${error.message}`, 'error');
    }
    setCreating(false);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Controles de tempo para demonstrações
      </p>

      {/* Seleção de máquina */}
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Máquina</label>
        <select
          value={selectedMachine}
          onChange={(e) => setSelectedMachine(e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20"
        >
          <option value="">Máquina de Teste (Demo)</option>
          {machines.map(m => (
            <option key={m.id} value={m.id}>
              {typeof m.name === 'object' ? m.name?.name : m.name}
            </option>
          ))}
        </select>
      </div>

      {/* Sessão aberta - Máquina a operar */}
      <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg space-y-2">
        <p className="text-xs font-medium text-orange-800 flex items-center gap-1">
          <Gauge className="w-3.5 h-3.5" />
          Simular Máquina em Operação
        </p>
        <p className="text-[10px] text-orange-600">
          Cria sessão ABERTA (máquina ligada há X horas)
        </p>
        <div className="grid grid-cols-4 gap-1">
          {[2, 4, 6, 8].map(hours => (
            <button
              key={hours}
              onClick={() => createOpenDemoSession(hours)}
              disabled={creating}
              className="py-2 bg-orange-100 hover:bg-orange-200 border border-orange-300 rounded text-xs font-medium text-orange-800"
            >
              {hours}h
            </button>
          ))}
        </div>
      </div>

      {/* Sessões concluídas - Histórico */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
        <p className="text-xs font-medium text-blue-800 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          Criar Sessão Concluída
        </p>
        <p className="text-[10px] text-blue-600">
          Adiciona sessão fechada ao histórico
        </p>
        <div className="grid grid-cols-4 gap-1">
          {[1, 2, 4, 8].map(hours => (
            <button
              key={hours}
              onClick={() => createDemoSession(hours)}
              disabled={creating}
              className="py-2 bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded text-xs font-medium text-blue-800"
            >
              {hours}h
            </button>
          ))}
        </div>
      </div>

      {/* Input personalizado */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
        <p className="text-xs font-medium text-slate-700 flex items-center gap-1">
          <FastForward className="w-3.5 h-3.5" />
          Duração Personalizada
        </p>
        <div className="flex gap-2">
          <input
            type="number"
            min="0.5"
            max="24"
            step="0.5"
            value={hoursToAdd}
            onChange={(e) => setHoursToAdd(parseFloat(e.target.value))}
            className="flex-1 px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          <span className="px-2 py-1.5 text-sm text-slate-500">horas</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => createOpenDemoSession(hoursToAdd)}
            disabled={creating}
            className="py-2 bg-orange-500 hover:bg-orange-600 text-white rounded text-xs font-medium flex items-center justify-center gap-1"
          >
            <Zap className="w-3 h-3" />
            Aberta
          </button>
          <button
            onClick={() => createDemoSession(hoursToAdd)}
            disabled={creating}
            className="py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium flex items-center justify-center gap-1"
          >
            <CheckCircle className="w-3 h-3" />
            Fechada
          </button>
        </div>
      </div>

      {/* Resumo de sessões */}
      <div className="p-2 bg-slate-100 rounded text-[10px] text-slate-600">
        <p>Sessões abertas: {sessions?.filter(s => s.status === 'OPEN').length || 0}</p>
        <p>Sessões de teste: {sessions?.filter(s => s.isTestData).length || 0}</p>
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

// Componente Role Switcher Tab - Troca de perfil instantâneo
const RoleSwitcherTab = ({ showMessage }) => {
  const { currentUser, switchRole } = useAuthStore();
  const { setActiveView } = useStore();
  const currentRoleId = currentUser?.systemRole || 'admin';

  // Cores mapeadas para Tailwind
  const colorMap = {
    red: 'bg-red-100 border-red-300 text-red-800',
    blue: 'bg-blue-100 border-blue-300 text-blue-800',
    emerald: 'bg-emerald-100 border-emerald-300 text-emerald-800',
    green: 'bg-green-100 border-green-300 text-green-800',
    amber: 'bg-amber-100 border-amber-300 text-amber-800',
    slate: 'bg-slate-100 border-slate-300 text-slate-800',
    cyan: 'bg-cyan-100 border-cyan-300 text-cyan-800',
    orange: 'bg-orange-100 border-orange-300 text-orange-800',
    teal: 'bg-teal-100 border-teal-300 text-teal-800',
  };

  const handleSwitch = (roleId) => {
    switchRole(roleId);
    const role = DEFAULT_ROLES[roleId];
    showMessage(`Perfil: ${role.name}`);
    // Navegar para o dashboard adequado ao perfil
    if (role.defaultDashboard) {
      setActiveView('dashboard');
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Trocar perfil de acesso (afeta menus e dashboard)
      </p>

      <div className="space-y-2">
        {Object.values(DEFAULT_ROLES).map(role => {
          const isActive = currentRoleId === role.id;
          const colors = colorMap[role.color] || colorMap.slate;

          return (
            <button
              key={role.id}
              onClick={() => handleSwitch(role.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                isActive
                  ? `${colors} ring-2 ring-offset-1 ring-purple-400 shadow-sm`
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {/* Indicador ativo */}
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                isActive ? 'bg-purple-500 animate-pulse' : 'bg-slate-300'
              }`} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-semibold ${isActive ? '' : 'text-slate-900'}`}>
                    {role.name}
                  </p>
                  {isActive && (
                    <span className="text-[10px] bg-purple-500 text-white px-1.5 py-0.5 rounded-full font-medium">
                      ATIVO
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 truncate">{role.description}</p>
              </div>

              {/* Badge de nível */}
              <span className={`text-[10px] px-2 py-1 rounded font-medium flex-shrink-0 ${
                isActive ? 'bg-white/60 text-slate-700' : 'bg-slate-100 text-slate-500'
              }`}>
                Lv.{role.level}
              </span>
            </button>
          );
        })}
      </div>

      {/* Info */}
      <div className="p-2 bg-purple-50 border border-purple-100 rounded-lg text-[10px] text-purple-700">
        <p className="font-medium">Como funciona:</p>
        <ul className="list-disc list-inside space-y-0.5 mt-1">
          <li>Cada perfil vê menus e dashboard diferentes</li>
          <li>Perfil ativo persiste entre reloads</li>
          <li>Em produção será controlado por Firebase Auth</li>
        </ul>
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
  const [rfidMachineId, setRfidMachineId] = useState('');
  const [rfidOperatorId, setRfidOperatorId] = useState('');

  const { setActiveView, machines, operators } = useStore();

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

  // Simular scan RFID — chama o HTTP endpoint real (igual ao kiosk físico)
  // Isto garante que o Procore recebe os dados exactamente como em produção
  const simulateRfidScan = async (action = 'start') => {
    setLoading(true);
    try {
      const machineId = rfidMachineId || TEST_DATA.machines[0].id;
      const operatorId = rfidOperatorId || TEST_DATA.operators[0].id;
      const operatorData = operators.find(o => o.id === operatorId) || TEST_DATA.operators[0];
      // cardId é o campo RFID do operador; fallback para o ID do operador
      const cardId = operatorData.cardId || operatorId;

      if (!rfidMachineId) {
        // Modo demo: escrever directo no Firestore (máquina de teste não existe no Procore)
        const sessionsRef = collection(db, `${basePath}/sessions`);
        const q = query(sessionsRef, where('machineId', '==', machineId), where('status', '==', 'OPEN'));
        const snapshot = await getDocs(q);
        if (snapshot.empty && action === 'start') {
          const sessionId = generateId('session');
          await setDoc(doc(db, `${basePath}/sessions`, sessionId), {
            id: sessionId, cardId, machineId,
            startTime: Timestamp.now(), endTime: null, durationHours: 0,
            status: 'OPEN', isTestData: true,
          });
          await setDoc(doc(db, `${basePath}/machines`, machineId), { status: 'ACTIVE', lastOperator: cardId }, { merge: true });
          showMessage(`[DEMO] Sessão iniciada: ${operatorData.name}`);
        } else if (!snapshot.empty && action === 'stop') {
          const sessionDoc = snapshot.docs[0];
          const sessionData = sessionDoc.data();
          const endTime = new Date();
          const durationHours = (endTime - sessionData.startTime.toDate()) / (1000 * 60 * 60);
          await setDoc(doc(db, `${basePath}/sessions`, sessionDoc.id), { ...sessionData, endTime: Timestamp.fromDate(endTime), durationHours, status: 'CLOSED' });
          await setDoc(doc(db, `${basePath}/machines`, machineId), { status: 'IDLE' }, { merge: true });
          showMessage(`[DEMO] Sessão fechada: ${durationHours.toFixed(2)}h`);
        } else {
          showMessage(snapshot.empty ? 'Nenhuma sessão para fechar' : 'Já existe sessão aberta', 'error');
        }
        return;
      }

      // Modo real: chamar HTTP endpoint igual ao kiosk físico → Procore recebe os dados
      const endpoint = 'https://us-central1-casais-rfid.cloudfunctions.net/handleSessionTrigger';
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId, machineId }),
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || `HTTP ${resp.status}`);

      const statusLabel = result.status || result.action || 'OK';
      showMessage(`✓ ${statusLabel} — ${operatorData.name} / ${machineId}`);
      console.log('[DevTools RFID] endpoint response:', result);
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
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {[
            { id: 'roles', label: 'Perfis', icon: Settings },
            { id: 'alerts', label: 'Alertas', icon: AlertTriangle },
            { id: 'sendEmail', label: 'Email', icon: Send },
            { id: 'demo', label: 'Demo', icon: FastForward },
            { id: 'rfid', label: 'RFID', icon: CreditCard },
            { id: 'loc', label: 'LOC', icon: MapPin },
            { id: 'qr', label: 'QR', icon: QrCode },
            { id: 'nav', label: 'Nav', icon: Navigation },
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

              {/* Selector Máquina */}
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Máquina</label>
                <select
                  value={rfidMachineId}
                  onChange={e => setRfidMachineId(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 bg-white"
                >
                  <option value="">— Demo: {TEST_DATA.machines[0].name} —</option>
                  {machines.filter(m => m.procoreEquipmentId).map(m => (
                    <option key={m.id} value={m.id}>{m.name} {m.status === 'ACTIVE' ? '🟢' : ''}</option>
                  ))}
                  {machines.filter(m => !m.procoreEquipmentId).length > 0 && (
                    <optgroup label="Sem Procore ID">
                      {machines.filter(m => !m.procoreEquipmentId).map(m => (
                        <option key={m.id} value={m.id}>{m.name} (sem Procore)</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Selector Operador */}
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Operador</label>
                <select
                  value={rfidOperatorId}
                  onChange={e => setRfidOperatorId(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 bg-white"
                >
                  <option value="">— Demo: {TEST_DATA.operators[0].name} —</option>
                  {operators.filter(o => o.procoreUserId).map(o => (
                    <option key={o.id} value={o.id}>{o.name} ✓</option>
                  ))}
                  {operators.filter(o => !o.procoreUserId).map(o => (
                    <option key={o.id} value={o.id}>{o.name} (sem Procore)</option>
                  ))}
                </select>
              </div>

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

              <div className="mt-1 p-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-500">
                {rfidMachineId
                  ? `Máquina: ${machines.find(m => m.id === rfidMachineId)?.name || rfidMachineId}`
                  : `Máquina: ${TEST_DATA.machines[0].name} (demo)`
                } &nbsp;|&nbsp;
                {rfidOperatorId
                  ? `Op: ${operators.find(o => o.id === rfidOperatorId)?.name || rfidOperatorId}`
                  : `Op: ${TEST_DATA.operators[0].name} (demo)`
                }
              </div>
            </div>
          )}

          {/* QR Code Tab */}
          {activeTab === 'qr' && (
            <QRCodeTab />
          )}

          {/* Location Cards Tab */}
          {activeTab === 'loc' && (
            <LocationCardTab showMessage={showMessage} />
          )}

          {/* Send Email Tab */}
          {activeTab === 'sendEmail' && (
            <EmailSendTab
              showMessage={showMessage}
              onAlertCreated={(alert) => setLastCreatedAlert(alert)}
            />
          )}

          {/* Demo Time Tab */}
          {activeTab === 'demo' && (
            <DemoTimeTab showMessage={showMessage} />
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

          {/* Roles Tab */}
          {activeTab === 'roles' && (
            <RoleSwitcherTab showMessage={showMessage} />
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
