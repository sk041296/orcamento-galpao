import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, Building2, Calendar, AlertTriangle, Target, Wrench, MapPin, Ruler, Activity, ArrowUpRight, ArrowDownRight, Layers, Zap, RefreshCw } from 'lucide-react';

const API_URL = 'https://script.google.com/macros/s/AKfycbxD-xhYmq62DGN1Z89hXw8S0P6RTKPCIKZpUCOq2Zk2XWq0CVHQnyhvfqHzqB3b7AXXmg/exec';

export default function GalpaoDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [animatedValue, setAnimatedValue] = useState(0);
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  // Busca dados da API do Google Sheets
  useEffect(() => {
    fetch(API_URL)
      .then(r => r.json())
      .then(d => {
        if (d.erro) { setErro(d.erro); setCarregando(false); return; }
        setDados(d);
        setCarregando(false);
      })
      .catch(e => { setErro(e.toString()); setCarregando(false); });
  }, []);

  // Animação do número total
  useEffect(() => {
    if (!dados) return;
    const total = dados.capa.custoTotal;
    const startTime = performance.now();
    const duration = 1400;
    const animate = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimatedValue(eased * total);
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [dados]);

  const fmtBRL = (v) => 'R$ ' + Math.round(v || 0).toLocaleString('pt-BR');
  const fmtBRLfull = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  // Loading
  if (carregando) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#FF6B00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={48} style={{ animation: 'spin 1s linear infinite' }} />
          <div style={{ marginTop: 20, fontSize: 14, letterSpacing: '0.2em' }}>CARREGANDO DADOS DA PLANILHA...</div>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#FF6B00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', padding: 40, textAlign: 'center' }}>
        <div>
          <AlertTriangle size={48} />
          <div style={{ marginTop: 20, fontSize: 18 }}>Erro ao carregar dados</div>
          <div style={{ marginTop: 10, fontSize: 12, color: '#888' }}>{erro}</div>
        </div>
      </div>
    );
  }

  // Mapeia dados para o formato do dashboard
  const TOTAL_DIRETO = dados.capa.custoDireto;
  const ADMIN = dados.capa.administracao;
  const TOTAL_OBRA = dados.capa.custoTotal;
  const AREA = dados.capa.areaConstruida;
  const CUSTO_M2 = TOTAL_OBRA / AREA;

  const disciplinas = dados.disciplinas.map(d => ({
    nome: d.nome,
    curto: d.nome.split('.')[1]?.trim().substring(0, 6).toUpperCase() || d.nome.substring(0, 6),
    mat: d.material,
    mo: d.maoObra,
    total: d.total,
    pct: d.percentual * 100,
  }));

  const curvaA = dados.curvaABC.map(c => ({
    item: c.descricao,
    valor: c.valor,
    pct: c.percentualAcum * 100,
  }));

  const cron = dados.cronograma;
  const cronograma = cron.desembolsoMensal && cron.acumulado ? [
    { mes: 'M1', mensal: cron.desembolsoMensal.m1 || 0, acumulado: cron.acumulado.m1 || 0, pct: ((cron.acumulado.m1 || 0) / TOTAL_OBRA) * 100 },
    { mes: 'M2', mensal: cron.desembolsoMensal.m2 || 0, acumulado: cron.acumulado.m2 || 0, pct: ((cron.acumulado.m2 || 0) / TOTAL_OBRA) * 100 },
    { mes: 'M3', mensal: cron.desembolsoMensal.m3 || 0, acumulado: cron.acumulado.m3 || 0, pct: ((cron.acumulado.m3 || 0) / TOTAL_OBRA) * 100 },
    { mes: 'M4', mensal: cron.desembolsoMensal.m4 || 0, acumulado: cron.acumulado.m4 || 0, pct: ((cron.acumulado.m4 || 0) / TOTAL_OBRA) * 100 },
  ] : [];

  const sensibilidade = dados.sensibilidade.map(s => {
    const cenarioUp = String(s.cenario).toUpperCase();
    let key = 'BASE';
    if (cenarioUp.indexOf('PESSIMISTA') !== -1) key = 'PESSIMISTA';
    else if (cenarioUp.indexOf('OTIMISTA') !== -1) key = 'OTIMISTA';
    return {
      cenario: key,
      variacao: typeof s.variacao === 'number' ? (s.variacao > 0 ? `+${(s.variacao*100).toFixed(0)}%` : `${(s.variacao*100).toFixed(0)}%`) : s.variacao,
      total: s.custoTotal,
      m2: s.custoM2,
      delta: s.variacaoAbsoluta,
    };
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: '#0a0a0a', border: '1px solid #FF6B00', padding: '12px 16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#fff', boxShadow: '4px 4px 0 #FF6B00' }}>
          <div style={{ color: '#FF6B00', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
          {payload.map((p, i) => (
            <div key={i} style={{ color: p.color || '#fff' }}>
              {p.name}: <strong>{typeof p.value === 'number' ? fmtBRL(p.value) : p.value}</strong>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const CORES_DISC = ['#FF6B00', '#FF8533', '#FF9F5C', '#FFB680', '#E85D00', '#CC5200', '#B34700', '#993D00', '#803300', '#662900', '#4D1F00', '#2D1200'];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: "'Archivo', 'Bebas Neue', system-ui, sans-serif", backgroundImage: `linear-gradient(rgba(255, 107, 0, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 107, 0, 0.04) 1px, transparent 1px)`, backgroundSize: '40px 40px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Archivo+Black&family=JetBrains+Mono:wght@400;500;700&family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        @keyframes pulse-orange { 0%,100% { box-shadow: 0 0 0 0 rgba(255,107,0,0.7); } 50% { box-shadow: 0 0 0 8px rgba(255,107,0,0); } }
        @keyframes slide-in { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes scan-line { 0% { transform:translateX(-100%); } 100% { transform:translateX(100%); } }
        .stagger > * { animation: slide-in 0.6s ease-out backwards; }
        .stagger > *:nth-child(1) { animation-delay:0.05s; }
        .stagger > *:nth-child(2) { animation-delay:0.10s; }
        .stagger > *:nth-child(3) { animation-delay:0.15s; }
        .kpi-card { position:relative; overflow:hidden; transition:transform 0.3s cubic-bezier(0.4,0,0.2,1), border-color 0.3s; }
        .kpi-card:hover { transform:translateY(-4px); border-color:#FF6B00 !important; }
        .kpi-card::after { content:''; position:absolute; top:0; left:0; width:100%; height:2px; background:linear-gradient(90deg, transparent, #FF6B00, transparent); animation: scan-line 3s linear infinite; }
        .corner-mark { position:absolute; width:14px; height:14px; border-color:#FF6B00; border-style:solid; }
        .corner-tl { top:-1px; left:-1px; border-width:2px 0 0 2px; }
        .corner-tr { top:-1px; right:-1px; border-width:2px 2px 0 0; }
        .corner-bl { bottom:-1px; left:-1px; border-width:0 0 2px 2px; }
        .corner-br { bottom:-1px; right:-1px; border-width:0 2px 2px 0; }
        .tab-btn { background:transparent; color:#888; border:1px solid #333; padding:10px 22px; font-family:'Archivo',sans-serif; font-weight:600; font-size:11px; letter-spacing:0.15em; text-transform:uppercase; cursor:pointer; transition:all 0.2s; }
        .tab-btn:hover { color:#FF6B00; border-color:#FF6B00; }
        .tab-btn.active { background:#FF6B00; color:#000; border-color:#FF6B00; }
        .disc-row { transition:background 0.2s; }
        .disc-row:hover { background:rgba(255,107,0,0.08); }
        .recharts-cartesian-axis-tick-value { font-family:'JetBrains Mono', monospace !important; font-size:11px !important; }
      `}</style>

      <div style={{ position: 'absolute', top: 0, right: 0, width: '300px', height: '100%', background: 'linear-gradient(135deg, transparent 0%, transparent 40%, rgba(255,107,0,0.03) 60%, rgba(255,107,0,0.08) 100%)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 40px', position: 'relative', zIndex: 1 }}>
        {/* HEADER */}
