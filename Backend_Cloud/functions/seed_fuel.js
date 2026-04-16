const admin = require('firebase-admin');
const APP_ID = 'casais-rfid';

// Inicializa sem chaves, tentando usar a conta logada no sistema (Application Default Credentials)
admin.initializeApp();

const db = admin.firestore();

async function seed() {
    console.log('--- SEEDING FUEL COST ---');
    const price = 1.89; // Preço realista pesquisado para Abril 2026 em Portugal
    const path = `artifacts/${APP_ID}/public/data/settings/fuelCost`;
    
    try {
        await db.doc(path).set({
            pricePerLitre: price,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: 'GEMINI_RESEARCH_AGENT',
            notes: 'Preço baseado em pesquisa de mercado para 16/04/2026 (Portugal)'
        });
        console.log(`✅ SUCESSO: Documento criado em ${path} com preco ${price}€/L`);
        process.exit(0);
    } catch (error) {
        console.error('❌ ERRO AO CRIAR DOCUMENTO:', error.message);
        console.log('\n--- DICA PARA O UTILIZADOR ---');
        console.log('Se este script falhar por permissões, corre este comando no terminal:');
        console.log('gcloud auth application-default login');
        process.exit(1);
    }
}

seed();
