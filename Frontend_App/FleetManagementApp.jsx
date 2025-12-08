import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { 
    getFirestore, doc, onSnapshot, collection, query, orderBy, setDoc, addDoc, updateDoc, 
    serverTimestamp, where, getDocs, getDoc 
} from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { create as createStore } from 'zustand';

// --- CONFIGURAÇÃO FIREBASE (Automática no Canvas, Manual no VS Code) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'fleet-management-default';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Inicialização segura
let app, db, auth;
if (Object.keys(firebaseConfig).length > 0) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
}

// --- STORE GLOBAL (Estado da Aplicação) ---
const useFleetStore = createStore((set) => ({
    userId: null,
    isAuthReady: false,
    isAdmin: true, // Simulação para Demo. Em prod, viria do perfil do user.
    machines: [],
    operators: [],
    sessions: [],
    refuelings: [],
    loading: true,
    setAuthState: (userId, isReady) => set({ userId, isAuthReady: isReady, loading: false }),
    setData: (key, data) => set({ [key]: data }),
}));

// --- COMPONENTES AUXILIARES ---

const AlertBanner = ({ message }) => (
    <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4" role="alert">
        <p className="font-bold">Informação</p>
        <p>{message}</p>
    </div>
);

// --- COMPONENTE PRINCIPAL ---
const AdminDashboard = () => {
    const { machines, sessions, operators, refuelings } = useFleetStore();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Cálculo de Consumo (Simulação CAN Bus)
    const getFuelEfficiency = useCallback((machineId) => {
        const machineRefuelings = refuelings.filter(r => r.machineId === machineId);
        const totalLiters = machineRefuelings.reduce((sum, r) => sum + r.liters, 0);
        const machine = machines.find(m => m.id === machineId);
        const totalHours = machine ? machine.totalHours : 1; // Evitar divisão por zero
        
        return totalHours > 0 ? (totalLiters / totalHours).toFixed(2) : 'N/A';
    }, [machines, refuelings]);

    // Exportação CSV
    const exportCSV = () => {
        if (!sessions.length) {
            alert("Sem dados para exportar.");
            return;
        }
        
        // Filtro por data (se selecionado)
        let dataToExport = sessions;
        if (startDate && endDate) {
            const start = new Date(startDate).getTime();
            const end = new Date(endDate).getTime();
            dataToExport = sessions.filter(s => {
                const sTime = s.startTime?.toDate().getTime();
                return sTime >= start && sTime <= end;
            });
        }

        const headers = ["MachineID,OperatorName,CardID,StartTime,EndTime,DurationMin,Status"];
        const rows = dataToExport.map(s => {
            const opName = operators.find(o => o.cardId === s.cardId)?.name || "Desconhecido";
            const start = s.startTime?.toDate().toLocaleString() || "N/A";
            const end = s.endTime?.toDate().toLocaleString() || "ATIVA";
            const duration = s.endTime 
                ? ((s.endTime.toDate() - s.startTime.toDate()) / 60000).toFixed(1) 
                : "Em curso";
            
            return `${s.machineId},${opName},${s.cardId},"${start}","${end}",${duration},${s.endTime ? 'FECHADA' : 'ABERTA'}`;
        });

        const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "relatorio_frota_casais.csv");
        document.body.appendChild(link);
        link.click();
    };

    // Dados para Gráfico
    const chartData = machines.map(m => ({
        name: m.name,
        Horas: m.totalHours.toFixed(1),
        Consumo: parseFloat(getFuelEfficiency(m.id)) || 0
    }));

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <header className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Casais Fleet Manager 2.0</h1>
                    <p className="text-sm text-gray-500">Sistema Avançado de Construção & IoT</p>
                </div>
                <div className="flex gap-2">
                    <input type="date" className="border rounded p-2 text-sm" onChange={e => setStartDate(e.target.value)} />
                    <input type="date" className="border rounded p-2 text-sm" onChange={e => setEndDate(e.target.value)} />
                    <button onClick={exportCSV} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                        Exportar CSV
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                    <h3 className="text-blue-800 font-semibold">Máquinas Ativas</h3>
                    <p className="text-3xl font-bold text-blue-900 mt-2">
                        {machines.filter(m => m.status === 'ACTIVE').length} / {machines.length}
                    </p>
                </div>
                <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-100">
                    <h3 className="text-yellow-800 font-semibold">Alertas Manutenção</h3>
                    <p className="text-3xl font-bold text-yellow-900 mt-2">
                        {machines.filter(m => m.totalHours > 150).length}
                    </p>
                </div>
                <div className="bg-purple-50 p-6 rounded-xl border border-purple-100">
                    <h3 className="text-purple-800 font-semibold">Sessões Hoje</h3>
                    <p className="text-3xl font-bold text-purple-900 mt-2">{sessions.length}</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold mb-4">Análise de Eficiência (Horas vs Consumo L/h)</h3>
                <div className="h-64 w-full">
                    <ResponsiveContainer>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="Horas" fill="#4f46e5" />
                            <Bar dataKey="Consumo" fill="#10b981" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Máquina</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horas Totais</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Eficiência</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {machines.map(m => (
                            <tr key={m.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{m.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${m.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {m.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{m.totalHours.toFixed(2)} h</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getFuelEfficiency(m.id)} L/h</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default function App() {
    const { setAuthState, setData } = useFleetStore();

    useEffect(() => {
        if (!auth) return;
        const subAuth = onAuthStateChanged(auth, user => {
            if (user) setAuthState(user.uid, true);
            else signInAnonymously(auth).catch(console.error);
        });

        // Listeners Firestore
        if (db) {
            const subMachines = onSnapshot(collection(db, `artifacts/${appId}/public/data/machines`), s => 
                setData('machines', s.docs.map(d => ({id: d.id, ...d.data()}))));
            
            const subSessions = onSnapshot(query(collection(db, `artifacts/${appId}/public/data/sessions`), orderBy('startTime', 'desc')), s => 
                setData('sessions', s.docs.map(d => ({id: d.id, ...d.data()}))));

            const subOperators = onSnapshot(collection(db, `artifacts/${appId}/public/data/operators`), s => 
                setData('operators', s.docs.map(d => ({cardId: d.id, ...d.data()}))));

            const subRefuel = onSnapshot(collection(db, `artifacts/${appId}/public/data/refuelings`), s => 
                setData('refuelings', s.docs.map(d => ({id: d.id, ...d.data()}))));

            return () => { subAuth(); subMachines(); subSessions(); subOperators(); subRefuel(); };
        }
    }, []);

    if (!auth) return <div className="p-10 text-center">A carregar sistema...</div>;
    return <div className="min-h-screen bg-gray-50 font-sans"><AdminDashboard /></div>;
}