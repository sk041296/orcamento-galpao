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
        <header style={{ borderBottom: '2px solid #FF6B00', paddingBottom: '24px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '24px' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', background: '#FF6B00', color: '#000', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', marginBottom: '14px' }}>
                <div style={{ width: '6px', height: '6px', background: '#000', animation: 'pulse-orange 2s infinite' }} />
                ORÇAMENTO N° 2026/047 · DADOS EM TEMPO REAL
              </div>
              <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, margin: 0, lineHeight: 0.95, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                Galpão<br />
                <span style={{ color: '#FF6B00' }}>Industrial</span>
                <span style={{ color: '#444', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.4em', marginLeft: '12px', letterSpacing: '0', textTransform: 'none', fontWeight: 400 }}>/ {AREA} m²</span>
              </h1>
            </div>
            <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#888' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', marginBottom: '4px' }}>
                <MapPin size={12} color="#FF6B00" />
                <span>RUA LÓTUS · ARAUCÁRIA / PR</span>
              </div>
              <div>25°37'11.1"S · 49°22'14.6"W</div>
              <div style={{ marginTop: '8px', color: '#666' }}>SINCRONIZADO COM PLANILHA · {new Date(dados.timestamp).toLocaleString('pt-BR')}</div>
            </div>
          </div>
        </header>

        {/* KPIs */}
        <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <div className="kpi-card" style={{ gridColumn: 'span 2', background: '#FF6B00', color: '#000', padding: '28px', position: 'relative', border: '1px solid #FF6B00' }}>
            <div className="corner-mark corner-tl" style={{ borderColor: '#000' }} />
            <div className="corner-mark corner-tr" style={{ borderColor: '#000' }} />
            <div className="corner-mark corner-bl" style={{ borderColor: '#000' }} />
            <div className="corner-mark corner-br" style={{ borderColor: '#000' }} />
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', marginBottom: '8px' }}>▸ INVESTIMENTO TOTAL</div>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 'clamp(38px, 6vw, 64px)', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em' }}>{fmtBRLfull(animatedValue)}</div>
            <div style={{ display: 'flex', gap: '24px', marginTop: '14px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 700 }}>
              <span>R$ {CUSTO_M2.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} / m²</span>
              <span>·</span>
              <span>{dados.capa.prazoMeses} MESES DE EXECUÇÃO</span>
            </div>
          </div>

          <div className="kpi-card" style={{ background: '#111', border: '1px solid #222', padding: '24px', position: 'relative' }}>
            <div className="corner-mark corner-tl" />
            <div className="corner-mark corner-br" />
            <Layers size={20} color="#FF6B00" style={{ marginBottom: '12px' }} />
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#888', letterSpacing: '0.15em', marginBottom: '6px' }}>MATERIAIS</div>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: '28px', fontWeight: 900, color: '#fff' }}>{fmtBRLfull(dados.capa.custoMateriais)}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#FF6B00', marginTop: '4px' }}>{((dados.capa.custoMateriais / TOTAL_DIRETO) * 100).toFixed(1)}% DO DIRETO</div>
          </div>

          <div className="kpi-card" style={{ background: '#111', border: '1px solid #222', padding: '24px', position: 'relative' }}>
            <div className="corner-mark corner-tl" />
            <div className="corner-mark corner-br" />
            <Wrench size={20} color="#FF6B00" style={{ marginBottom: '12px' }} />
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#888', letterSpacing: '0.15em', marginBottom: '6px' }}>MÃO DE OBRA</div>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: '28px', fontWeight: 900, color: '#fff' }}>{fmtBRLfull(dados.capa.custoMaoObra)}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#FF6B00', marginTop: '4px' }}>{((dados.capa.custoMaoObra / TOTAL_DIRETO) * 100).toFixed(1)}% DO DIRETO</div>
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', borderBottom: '1px solid #222', paddingBottom: '20px' }}>
          {[
            { id: 'overview', label: '◢ Visão Geral' },
            { id: 'disciplinas', label: '◢ Disciplinas' },
            { id: 'curva-a', label: '◢ Curva ABC' },
            { id: 'cronograma', label: '◢ Cronograma' },
            { id: 'risco', label: '◢ Análise de Risco' },
          ].map(tab => (
            <button key={tab.id} className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '20px' }}>
            <div style={{ gridColumn: 'span 7', background: '#111', border: '1px solid #222', padding: '28px', position: 'relative' }}>
              <div className="corner-mark corner-tl" /><div className="corner-mark corner-br" />
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#FF6B00', letterSpacing: '0.2em' }}>01 / COMPOSIÇÃO</div>
                <h3 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: '22px', margin: '4px 0 0 0', textTransform: 'uppercase' }}>Custo direto vs administração</h3>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', height: '60px', border: '1px solid #FF6B00' }}>
                  <div style={{ width: `${(TOTAL_DIRETO / TOTAL_OBRA) * 100}%`, background: '#FF6B00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Archivo Black', sans-serif", fontSize: '14px', color: '#000' }}>
                    CUSTO DIRETO · {((TOTAL_DIRETO / TOTAL_OBRA) * 100).toFixed(1)}%
                  </div>
                  <div style={{ flex: 1, background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Archivo Black', sans-serif", fontSize: '12px', color: '#FF6B00' }}>
                    BDI · {((ADMIN / TOTAL_OBRA) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ borderLeft: '3px solid #FF6B00', paddingLeft: '14px' }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#888', letterSpacing: '0.15em' }}>CUSTO DIRETO</div>
                  <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: '24px', color: '#fff' }}>{fmtBRLfull(TOTAL_DIRETO)}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#666', marginTop: '4px' }}>Materiais + mão de obra</div>
                </div>
                <div style={{ borderLeft: '3px solid #555', paddingLeft: '14px' }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#888', letterSpacing: '0.15em' }}>ADMIN. DA OBRA</div>
                  <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: '24px', color: '#fff' }}>{fmtBRLfull(ADMIN)}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#666', marginTop: '4px' }}>10% sobre custo direto</div>
                </div>
              </div>
            </div>

            <div style={{ gridColumn: 'span 5', background: '#111', border: '1px solid #222', padding: '28px', position: 'relative' }}>
              <div className="corner-mark corner-tl" /><div className="corner-mark corner-br" />
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#FF6B00', letterSpacing: '0.2em' }}>02 / FICHA TÉCNICA</div>
                <h3 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: '22px', margin: '4px 0 0 0', textTransform: 'uppercase' }}>Indicadores do projeto</h3>
              </div>
              {[
                { l: 'ÁREA TERRENO', v: dados.capa.areaTerreno + ' m²', det: 'Lote 45m × 15m' },
                { l: 'ÁREA CONSTRUÍDA', v: dados.capa.areaConstruida + ' m²', det: 'Edificação principal' },
                { l: 'ÁREA PERMEÁVEL', v: dados.capa.areaPermeavel + ' m²', det: ((dados.capa.permeabilidade)*100).toFixed(0) + '% (mín. zonal)' },
                { l: 'PAVIMENTAÇÃO PAVER', v: dados.capa.areaPavimentacao + ' m²', det: 'Externa intertravada' },
                { l: 'TERRAPLENAGEM', v: dados.capa.terraplenagem + ' m³', det: 'Movimentação de terra' },
                { l: 'ALTURA / PILARES', v: dados.capa.peDireito + ' m', det: '6 pilares pré-fabricados' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', padding: '10px 0', borderBottom: i < 5 ? '1px dashed #222' : 'none' }}>
                  <div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#888', letterSpacing: '0.1em' }}>{item.l}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#555', marginTop: '2px' }}>{item.det}</div>
                  </div>
                  <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: '20px', color: '#FF6B00' }}>{item.v}</div>
                </div>
              ))}
            </div>

            <div style={{ gridColumn: 'span 12', background: '#111', border: '1px solid #222', padding: '28px', position: 'relative' }}>
              <div className="corner-mark corner-tl" /><div className="corner-mark corner-br" />
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#FF6B00', letterSpacing: '0.2em' }}>03 / RANKING</div>
                <h3 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: '22px', margin: '4px 0 0 0', textTransform: 'uppercase' }}>Top 5 disciplinas por custo</h3>
              </div>
              {[...disciplinas].sort((a, b) => b.total - a.total).slice(0, 5).map((d, i) => {
                const maxTotal = Math.max(...disciplinas.map(x => x.total));
                const w = (d.total / maxTotal) * 100;
                return (
                  <div key={i} style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'baseline' }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#FF6B00', fontWeight: 700 }}>#{i + 1}</span>
                        <span style={{ fontFamily: "'Archivo', sans-serif", fontSize: '14px', fontWeight: 600 }}>{d.nome}</span>
                      </div>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 700, color: '#fff' }}>{fmtBRL(d.total)} <span style={{ color: '#666' }}>· {d.pct.toFixed(1)}%</span></span>
                    </div>
                    <div style={{ height: '8px', background: '#0a0a0a', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ width: `${w}%`, height: '100%', background: i === 0 ? '#FF6B00' : 'linear-gradient(90deg, #FF6B00 0%, #993D00 100%)', transition: 'width 1s ease-out' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'disciplinas' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '20px' }}>
            <div style={{ gridColumn: 'span 8', background: '#111', border: '1px solid #222', padding: '28px', position: 'relative' }}>
              <div className="corner-mark corner-tl" /><div className="corner-mark corner-br" />
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#FF6B00', letterSpacing: '0.2em' }}>GRÁFICO 01</div>
                <h3 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: '22px', margin: '4px 0 0 0', textTransform: 'uppercase' }}>Material × Mão de obra por disciplina</h3>
              </div>
              <ResponsiveContainer width="100%" height={420}>
                <BarChart data={disciplinas} margin={{ top: 10, right: 10, bottom: 60, left: 0 }}>
                  <CartesianGrid stroke="#222" strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="curto" stroke="#666" tick={{ fontSize: 10, fill: '#888' }} angle={-30} textAnchor="end" />
                  <YAxis stroke="#666" tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 107, 0, 0.05)' }} />
                  <Legend wrapperStyle={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                  <Bar dataKey="mat" stackId="a" fill="#FF6B00" name="Material" />
                  <Bar dataKey="mo" stackId="a" fill="#4D1F00" name="Mão de Obra" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ gridColumn: 'span 4', background: '#111', border: '1px solid #222', padding: '28px', position: 'relative' }}>
              <div className="corner-mark corner-tl" /><div className="corner-mark corner-br" />
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#FF6B00', letterSpacing: '0.2em' }}>GRÁFICO 02</div>
                <h3 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: '20px', margin: '4px 0 0 0', textTransform: 'uppercase' }}>Distribuição</h3>
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <PieChart>
                  <Pie data={disciplinas} dataKey="total" nameKey="curto" cx="50%" cy="50%" innerRadius={55} outerRadius={120} paddingAngle={2}>
                    {disciplinas.map((_, i) => <Cell key={i} fill={CORES_DISC[i % CORES_DISC.length]} stroke="#0a0a0a" strokeWidth={1} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ gridColumn: 'span 12', background: '#111', border: '1px solid #222', padding: '28px', position: 'relative' }}>
              <div className="corner-mark corner-tl" /><div className="corner-mark corner-br" />
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#FF6B00', letterSpacing: '0.2em' }}>TABELA 01</div>
                <h3 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: '22px', margin: '4px 0 0 0', textTransform: 'uppercase' }}>Detalhamento por disciplina</h3>
              </div>
              <div style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #FF6B00' }}>
                      <th style={{ textAlign: 'left', padding: '12px 8px', color: '#FF6B00', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '10px' }}>Disciplina</th>
                      <th style={{ textAlign: 'right', padding: '12px 8px', color: '#FF6B00', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '10px' }}>Material</th>
                      <th style={{ textAlign: 'right', padding: '12px 8px', color: '#FF6B00', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '10px' }}>Mão Obra</th>
                      <th style={{ textAlign: 'right', padding: '12px 8px', color: '#FF6B00', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '10px' }}>Total</th>
                      <th style={{ textAlign: 'right', padding: '12px 8px', color: '#FF6B00', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '10px' }}>% Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {disciplinas.map((d, i) => (
                      <tr key={i} className="disc-row" style={{ borderBottom: '1px solid #1a1a1a' }}>
                        <td style={{ padding: '12px 8px', color: '#fff', fontFamily: "'Archivo', sans-serif", fontWeight: 500 }}>{d.nome}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'right', color: '#ccc' }}>{fmtBRL(d.mat)}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'right', color: '#ccc' }}>{fmtBRL(d.mo)}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'right', color: '#FF6B00', fontWeight: 700 }}>{fmtBRL(d.total)}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'right', color: '#fff' }}>{d.pct.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #FF6B00', background: '#0a0a0a' }}>
                      <td style={{ padding: '14px 8px', color: '#FF6B00', fontWeight: 800, fontFamily: "'Archivo Black', sans-serif", textTransform: 'uppercase' }}>TOTAL</td>
                      <td style={{ padding: '14px 8px', textAlign: 'right', color: '#FF6B00', fontWeight: 800 }}>{fmtBRL(dados.capa.custoMateriais)}</td>
                      <td style={{ padding: '14px 8px', textAlign: 'right', color: '#FF6B00', fontWeight: 800 }}>{fmtBRL(dados.capa.custoMaoObra)}</td>
                      <td style={{ padding: '14px 8px', textAlign: 'right', color: '#FF6B00', fontWeight: 800 }}>{fmtBRL(TOTAL_DIRETO)}</td>
                      <td style={{ padding: '14px 8px', textAlign: 'right', color: '#FF6B00', fontWeight: 800 }}>100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'curva-a' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '20px' }}>
            <div style={{ gridColumn: 'span 12', background: '#111', border: '1px solid #222', padding: '28px', position: 'relative' }}>
              <div className="corner-mark corner-tl" /><div className="corner-mark corner-br" />
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#FF6B00', letterSpacing: '0.2em' }}>PARETO 80/20</div>
                <h3 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: '22px', margin: '4px 0 0 0', textTransform: 'uppercase' }}>Top {curvaA.length} itens críticos</h3>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#888', marginTop: '6px' }}>Itens que devem ter cotações duplas e contratos blindados antes do início.</div>
              </div>
              {curvaA.map((item, i) => {
                const maxV = Math.max(...curvaA.map(x => x.valor));
                const w = (item.valor / maxV) * 100;
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 140px 80px', alignItems: 'center', gap: '16px', padding: '14px 0', borderBottom: i < curvaA.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                    <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: '32px', color: '#FF6B00', lineHeight: 1 }}>{String(i + 1).padStart(2, '0')}</div>
                    <div>
                      <div style={{ fontFamily: "'Archivo', sans-serif", fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>{item.item}</div>
                      <div style={{ height: '6px', background: '#0a0a0a' }}>
                        <div style={{ width: `${w}%`, height: '100%', background: 'linear-gradient(90deg, #FF6B00, #993D00)' }} />
                      </div>
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', color: '#fff', fontWeight: 700, textAlign: 'right' }}>{fmtBRL(item.valor)}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: '#FF6B00', fontWeight: 700, textAlign: 'right' }}>{item.pct.toFixed(1)}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'cronograma' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '20px' }}>
            <div style={{ gridColumn: 'span 12', background: '#111', border: '1px solid #222', padding: '28px', position: 'relative' }}>
              <div className="corner-mark corner-tl" /><div className="corner-mark corner-br" />
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#FF6B00', letterSpacing: '0.2em' }}>CURVA S</div>
                <h3 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: '22px', margin: '4px 0 0 0', textTransform: 'uppercase' }}>Cronograma físico-financeiro · {dados.capa.prazoMeses} meses</h3>
              </div>
              <ResponsiveContainer width="100%" height={360}>
                <AreaChart data={cronograma} margin={{ top: 20, right: 30, bottom: 10, left: 0 }}>
                  <defs>
                    <linearGradient id="gradOrange" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF6B00" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#FF6B00" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#222" strokeDasharray="2 4" />
                  <XAxis dataKey="mes" stroke="#666" tick={{ fontSize: 12, fill: '#888' }} />
                  <YAxis stroke="#666" tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#FF6B00', strokeDasharray: '3 3' }} />
                  <Area type="monotone" dataKey="acumulado" stroke="#FF6B00" strokeWidth={3} fill="url(#gradOrange)" name="Acumulado" />
                  <Line type="monotone" dataKey="mensal" stroke="#fff" strokeWidth={2} strokeDasharray="6 3" dot={{ fill: '#fff', r: 5 }} name="Mensal" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={{ gridColumn: 'span 12', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {cronograma.map((m, i) => {
                const isPico = m.mensal > (TOTAL_OBRA / cronograma.length) * 1.2;
                return (
                  <div key={i} className="kpi-card" style={{ background: isPico ? '#FF6B00' : '#111', border: `1px solid ${isPico ? '#FF6B00' : '#222'}`, padding: '24px', position: 'relative', color: isPico ? '#000' : '#fff' }}>
                    <div className="corner-mark corner-tl" style={{ borderColor: isPico ? '#000' : '#FF6B00' }} />
                    <div className="corner-mark corner-br" style={{ borderColor: isPico ? '#000' : '#FF6B00' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                      <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: '40px', lineHeight: 1, fontWeight: 900 }}>M{i + 1}</div>
                      {isPico && <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', fontWeight: 700, background: '#000', color: '#FF6B00', padding: '4px 8px', letterSpacing: '0.15em' }}>PICO</div>}
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', letterSpacing: '0.15em', opacity: 0.7, marginBottom: '4px' }}>DESEMBOLSO</div>
                    <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: '20px', fontWeight: 900 }}>{fmtBRLfull(m.mensal)}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', marginTop: '4px', opacity: 0.7 }}>{m.pct.toFixed(1)}% ACUMULADO</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'risco' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '20px' }}>
            <div style={{ gridColumn: 'span 12', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {sensibilidade.map((s, i) => {
                const isBase = s.cenario === 'BASE';
                const isPess = s.cenario === 'PESSIMISTA';
                const isOtim = s.cenario === 'OTIMISTA';
                return (
                  <div key={i} className="kpi-card" style={{ background: isBase ? '#FF6B00' : '#111', color: isBase ? '#000' : '#fff', border: `2px solid ${isBase ? '#FF6B00' : (isPess ? '#993D00' : '#666')}`, padding: '28px', position: 'relative' }}>
                    <div className="corner-mark corner-tl" style={{ borderColor: isBase ? '#000' : '#FF6B00' }} />
                    <div className="corner-mark corner-tr" style={{ borderColor: isBase ? '#000' : '#FF6B00' }} />
                    <div className="corner-mark corner-bl" style={{ borderColor: isBase ? '#000' : '#FF6B00' }} />
                    <div className="corner-mark corner-br" style={{ borderColor: isBase ? '#000' : '#FF6B00' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em' }}>▸ CENÁRIO</div>
                      {isPess && <ArrowUpRight size={20} />}
                      {isOtim && <ArrowDownRight size={20} />}
                      {isBase && <Target size={20} />}
                    </div>
                    <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: '32px', fontWeight: 900, lineHeight: 1, marginBottom: '6px' }}>{s.cenario}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', fontWeight: 700, marginBottom: '20px', opacity: 0.85 }}>VARIAÇÃO {s.variacao}</div>
                    <div style={{ borderTop: `1px solid ${isBase ? 'rgba(0,0,0,0.2)' : '#333'}`, paddingTop: '14px' }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', opacity: 0.7, letterSpacing: '0.1em' }}>CUSTO TOTAL</div>
                      <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: '24px', fontWeight: 900 }}>{fmtBRLfull(s.total)}</div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', marginTop: '2px', opacity: 0.7 }}>R$ {(s.m2 || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} / m²</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <footer style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#555', letterSpacing: '0.1em' }}>
          <div><span style={{ color: '#FF6B00', fontWeight: 700 }}>● </span>SINCRONIZADO COM GOOGLE SHEETS · ATUALIZA AUTOMÁTICO</div>
          <div>DASHBOARD · CONFIDENCIAL</div>
        </footer>
      </div>
    </div>
  );
}
