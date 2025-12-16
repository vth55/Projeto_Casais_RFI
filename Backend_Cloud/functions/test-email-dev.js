/**
 * Script de Teste - Email em Modo Dev
 * CASAIS Fleet Intelligence
 *
 * Este script simula o comportamento do sistema de emails
 * para testar localmente sem enviar emails reais.
 *
 * Como usar:
 * cd Backend_Cloud/functions
 * node test-email-dev.js
 */

// Simular o alerta que seria criado
const mockAlert = {
  id: 'alert_test_12345',
  validationToken: 'ABC123XYZ789DEF456GHI012JKL345MN',
  type: 'LONG_SESSION',
  status: 'PENDING',

  sessionId: 'session_test_001',
  machineId: 'ESC-001',
  machineName: 'Escavadora Volvo EC220',
  operatorId: 'OP001',
  operatorName: 'João Silva',
  operatorEmail: 'joao.silva@casais.pt',
  obraId: 'obra_001',
  obraName: 'Ponte Vasco da Gama - Manutenção',

  originalStartTime: new Date('2024-12-10T08:00:00'),
  originalEndTime: new Date('2024-12-10T14:30:00'),
  originalDurationHours: 6.5,

  createdAt: new Date(),
};

// Template de email (simplificado para visualização no terminal)
const generateEmailText = (alert, validationUrl) => {
  return `
╔══════════════════════════════════════════════════════════════════╗
║                    CASAIS Fleet Intelligence                     ║
║                  Email de Validação (DEV MODE)                   ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  PARA: ${alert.operatorEmail.padEnd(52)}║
║  ASSUNTO: Validação de Sessão - ${alert.machineName.substring(0, 28).padEnd(28)}║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  ⚠️  SESSÃO LONGA - Validação Necessária                         ║
║                                                                  ║
║  A sessão abaixo requer a sua validação ou correção.             ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║  DETALHES DA SESSÃO                                              ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  Máquina:    ${alert.machineName.padEnd(48)}║
║  Obra:       ${(alert.obraName || 'N/A').padEnd(48)}║
║  Operador:   ${alert.operatorName.padEnd(48)}║
║                                                                  ║
║  Início:     ${alert.originalStartTime.toLocaleString('pt-PT').padEnd(48)}║
║  Fim:        ${alert.originalEndTime.toLocaleString('pt-PT').padEnd(48)}║
║  Duração:    ${(alert.originalDurationHours.toFixed(1) + ' horas').padEnd(48)}║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  🔗 Link de Validação:                                           ║
║  ${validationUrl.padEnd(62)}║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  Token: ${alert.validationToken.padEnd(54)}║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`;
};

// Função principal de teste
const runTest = () => {
  console.clear();
  console.log('\n🧪 TESTE DO SISTEMA DE EMAILS - MODO DESENVOLVIMENTO\n');
  console.log('=' .repeat(70));
  console.log('\n📋 Cenário: Um alerta de SESSÃO LONGA foi criado no sistema');
  console.log('   A Cloud Function "onAlertCreated" é disparada automaticamente\n');

  // Simular URL de validação
  const baseUrl = 'http://localhost:5173'; // URL local do Vite
  const validationUrl = `${baseUrl}/validar/${mockAlert.validationToken}`;

  console.log('📧 Email que seria enviado:\n');
  console.log(generateEmailText(mockAlert, validationUrl));

  console.log('\n' + '=' .repeat(70));
  console.log('\n📌 COMO TESTAR NO SISTEMA REAL:\n');
  console.log('1. Com Firebase Emulators (recomendado para dev):');
  console.log('   cd Backend_Cloud');
  console.log('   firebase emulators:start');
  console.log('   -> Os logs aparecem no terminal e na UI do emulator\n');

  console.log('2. Com deploy para produção:');
  console.log('   cd Backend_Cloud');
  console.log('   firebase deploy --only functions');
  console.log('   firebase functions:log');
  console.log('   -> Os logs aparecem no Firebase Console\n');

  console.log('3. Testar no Frontend:');
  console.log('   - Criar uma sessão de teste longa no dashboard');
  console.log('   - Ir para "Validação de Sessões" no menu');
  console.log('   - Clicar em "Reenviar Email" num alerta pendente');
  console.log('   - Ver os logs no console do Firebase\n');

  console.log('=' .repeat(70));
  console.log('\n✅ Em modo DEV, os emails NÃO são enviados realmente');
  console.log('   São apenas registados nos logs do Firebase Functions\n');

  console.log('📧 Para ativar emails reais (produção):');
  console.log('   firebase functions:config:set email.host="smtp.casais.pt" \\');
  console.log('     email.port="587" \\');
  console.log('     email.user="sistema@casais.pt" \\');
  console.log('     email.pass="SENHA_SECRETA" \\');
  console.log('     email.from="CASAIS Fleet <noreply@casais.pt>" \\');
  console.log('     app.url="https://casais-fleet.web.app"\n');

  // Mostrar exemplo do link de validação
  console.log('=' .repeat(70));
  console.log('\n🔗 Link de Validação de Teste:');
  console.log(`   ${validationUrl}\n`);
  console.log('   Abre este link no browser para ver a página de validação\n');
};

// Executar
runTest();
