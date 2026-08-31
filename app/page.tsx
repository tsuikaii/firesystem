'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type View = 'overview' | 'alarms' | 'devices' | 'buildings' | 'patrol' | 'reports';
type DemoStatus = 'idle' | 'pending' | 'confirmed' | 'processing' | 'closed';
type AMapMode = 'standard' | 'satellite' | 'traffic';

type AlertItem = { id: number; level: string; title: string; place: string; time: string; device: string; status: string };
type BuildingInfo = { name: string; type: string; floors: number; devices: number; online: number; owner: string };

const parks = {
  lingang: {
    name: '西安高新智造园', address: '西安市高新区丈八一路 18 号', devices: 286, online: 277, buildings: 5,
    blocks: [
      { name: '丈八研发中心', type: '科研办公', floors: 8, devices: 92, online: 90, owner: '周海' },
      { name: '软件新城数据楼', type: '数据中心', floors: 6, devices: 58, online: 58, owner: '林静' },
      { name: '鱼化综合仓储中心', type: '丙类仓库', floors: 2, devices: 61, online: 58, owner: '张勇' },
      { name: '高新智造中心', type: '工业厂房', floors: 5, devices: 47, online: 45, owner: '陈安' },
      { name: '西太路消防水泵站', type: '设备用房', floors: 3, devices: 28, online: 26, owner: '何志明' },
    ],
  },
  qingpu: {
    name: '西安软件新城', address: '西安市高新区云水一路 88 号', devices: 148, online: 144, buildings: 3,
    blocks: [
      { name: '云水研发一号楼', type: '科研办公', floors: 9, devices: 64, online: 63, owner: '沈楠' },
      { name: '数字技术验证中心', type: '实验建筑', floors: 4, devices: 52, online: 50, owner: '顾云' },
      { name: '软件新城服务中心', type: '公共建筑', floors: 5, devices: 32, online: 31, owner: '王若' },
    ],
  },
} as const;

const xianSites = [
  { id: 'zhangba', name: '丈八研发中心', address: '丈八一路 · 高新区', position: [108.8802, 34.1968] as [number, number], devices: 92, status: 'normal' },
  { id: 'software', name: '软件新城数据楼', address: '云水一路 · 软件新城', position: [108.8218, 34.1963] as [number, number], devices: 58, status: 'normal' },
  { id: 'smart', name: '高新智造中心', address: '锦业路 · 高新区', position: [108.8886, 34.1905] as [number, number], devices: 61, status: 'warning' },
  { id: 'storage', name: '鱼化综合仓储中心', address: '鱼化寨街道', position: [108.8428, 34.2346] as [number, number], devices: 47, status: 'normal' },
  { id: 'pump', name: '西太路消防水泵站', address: '西太路 · 高新区', position: [108.8586, 34.1516] as [number, number], devices: 28, status: 'normal' },
] as const;

interface AMapMap {
  add: (item: unknown) => void;
  addControl: (control: unknown) => void;
  setFitView: (items?: unknown[], immediately?: boolean, avoid?: number[], maxZoom?: number) => void;
  setLayers: (layers: unknown[]) => void;
  setMapStyle: (style: string) => void;
  destroy: () => void;
}

interface AMapMarker {
  on: (event: string, handler: () => void) => void;
}

interface AMapNamespace {
  Map: new (container: HTMLElement, options: Record<string, unknown>) => AMapMap;
  Marker: new (options: Record<string, unknown>) => AMapMarker;
  Pixel: new (x: number, y: number) => unknown;
  Scale: new (options?: Record<string, unknown>) => unknown;
  ToolBar: new (options?: Record<string, unknown>) => unknown;
  createDefaultLayer: (options?: Record<string, unknown>) => unknown;
  TileLayer: {
    Satellite: new (options?: Record<string, unknown>) => unknown;
    RoadNet: new (options?: Record<string, unknown>) => unknown;
    Traffic: new (options?: Record<string, unknown>) => unknown;
  };
}

declare global {
  interface Window {
    AMap?: AMapNamespace;
    _AMapSecurityConfig?: { securityJsCode?: string };
    __fireAmapReady?: () => void;
  }
}

const systems = [
  { name: '火灾自动报警', total: 126, online: 124, icon: 'smoke', filter: '火灾报警' },
  { name: '消防给水监测', total: 68, online: 65, icon: 'water', filter: '消防给水' },
  { name: '电气火灾监测', total: 54, online: 51, icon: 'bolt', filter: '电气火灾' },
  { name: '防火门监控', total: 38, online: 38, icon: 'door', filter: '防火门' },
];

const baseAlerts: AlertItem[] = [
  { id: 1, level: '高', title: '3号楼烟感报警', place: '3号楼 · 2F东侧走廊', time: '10:26:18', device: 'JTY-GD-0338', status: '处置中' },
  { id: 2, level: '中', title: '管网压力偏低', place: '泵房 · 湿式报警阀组', time: '09:42:06', device: 'PT-01-029', status: '待复核' },
  { id: 3, level: '低', title: '设备通信中断', place: '仓储中心 · 1F北区', time: '08:55:31', device: 'GW-C03-012', status: '已关闭' },
];

const devices = [
  { name: '智能光电感烟探测器', code: 'JTY-GD-0338', system: '火灾报警', zone: '丈八研发中心', place: '丈八研发中心 2F东侧走廊', value: '正常', signal: 92, state: '在线', seen: '刚刚' },
  { name: '无线压力采集终端', code: 'PT-01-029', system: '消防给水', zone: '高新智造中心', place: '高新智造中心 2F西区', value: '0.38 MPa', signal: 86, state: '在线', seen: '12秒前' },
  { name: '剩余电流监测器', code: 'ELE-A11-086', system: '电气火灾', zone: '软件新城数据楼', place: '软件新城数据楼 配电室A11柜', value: '126 mA', signal: 96, state: '在线', seen: '19秒前' },
  { name: '防火门门磁传感器', code: 'DM-04-105', system: '防火门', zone: '丈八研发中心', place: '丈八研发中心 4F疏散楼梯', value: '关闭', signal: 78, state: '在线', seen: '26秒前' },
  { name: '消防水箱液位计', code: 'LT-T2-014', system: '消防给水', zone: '西太路消防水泵站', place: '西太路消防水泵站 屋顶水箱', value: '82.6%', signal: 88, state: '在线', seen: '31秒前' },
  { name: '无线温感探测器', code: 'JTW-ZD-0921', system: '火灾报警', zone: '鱼化综合仓储中心', place: '鱼化综合仓储中心 1F北区', value: '--', signal: 0, state: '离线', seen: '18分钟前' },
];

const navItems = [
  ['overview', '指挥总览', 'overview'], ['alarms', '报警中心', 'alarms'], ['devices', '设备监控', 'devices'],
  ['buildings', '建筑档案', 'buildings'], ['patrol', '巡检任务', 'patrol'], ['reports', '统计报表', 'reports'],
] as const;

function NavGlyph({ kind }: { kind: string }) {
  return <span className={`nav-glyph nav-glyph-${kind}`} aria-hidden="true"><i /></span>;
}

type IconName = 'user' | 'lock' | 'eye' | 'shield' | 'smoke' | 'water' | 'bolt' | 'door' | 'building' | 'search' | 'inbox' | 'alert' | 'logout' | 'signal';

function AppIcon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (name === 'user') return <svg {...common}><circle cx="12" cy="8" r="3.5" /><path d="M5.5 20c.7-4 2.8-6 6.5-6s5.8 2 6.5 6" /></svg>;
  if (name === 'lock') return <svg {...common}><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" /></svg>;
  if (name === 'eye') return <svg {...common}><path d="M2.8 12s3.3-5 9.2-5 9.2 5 9.2 5-3.3 5-9.2 5-9.2-5-9.2-5Z" /><circle cx="12" cy="12" r="2.2" /></svg>;
  if (name === 'shield') return <svg {...common}><path d="M12 2.8 19 6v5.2c0 4.6-2.6 7.8-7 10-4.4-2.2-7-5.4-7-10V6l7-3.2Z" /><path d="m9 12 2 2 4-4" /></svg>;
  if (name === 'smoke') return <svg {...common}><path d="M6 17h12M8 17v-5a4 4 0 0 1 8 0v5M9 7.5c-1.5-1.2-.8-3 .2-4M13 7c-1.4-1.3-.6-3.2.5-4.5M17 7.5c1-1 .8-2.3.2-3" /></svg>;
  if (name === 'water') return <svg {...common}><path d="M12 3S6.5 9.4 6.5 14a5.5 5.5 0 0 0 11 0C17.5 9.4 12 3 12 3Z" /><path d="M9.5 15.5c.5 1.2 1.4 1.8 2.7 2" /></svg>;
  if (name === 'bolt') return <svg {...common}><path d="m13.5 2-8 12h6l-1 8 8-12h-6l1-8Z" /></svg>;
  if (name === 'door') return <svg {...common}><path d="M6 21V3h12v18M9 21V6h6v15M12.8 13h.1" /></svg>;
  if (name === 'building') return <svg {...common}><path d="M4 21V6l8-3 8 3v15M8 9h1M15 9h1M8 13h1M15 13h1M9 21v-4h6v4" /></svg>;
  if (name === 'search') return <svg {...common}><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 5 5" /></svg>;
  if (name === 'inbox') return <svg {...common}><path d="M4 5h16v14H4zM4 14h4l2 2h4l2-2h4" /></svg>;
  if (name === 'alert') return <svg {...common}><path d="M12 3 2.8 20h18.4L12 3Z" /><path d="M12 9v5M12 17.2v.1" /></svg>;
  if (name === 'logout') return <svg {...common}><path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" /></svg>;
  return <svg {...common}><path d="M4 18h2v-4H4v4Zm5 0h2V9H9v9Zm5 0h2V5h-2v13Zm5 0h2V2h-2v16Z" /></svg>;
}

function iconForSystem(system: string): IconName {
  if (system.includes('给水')) return 'water';
  if (system.includes('电气')) return 'bolt';
  if (system.includes('防火门')) return 'door';
  return 'smoke';
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (username.trim() === 'admin' && password === '123456') onLogin();
    else setError('账号或密码不正确，请使用页面提供的演示账号。');
  }

  return <main className="login-page">
    <header className="login-brand">
      {/* eslint-disable-next-line @next/next/no-img-element -- static local company mark */}
      <img src="/company-logo.png" alt="西安北方应急技术公司标志" width="54" height="54" />
      <div><strong>社会消防综合服务（陕西）中心</strong><small>社会消防设施数字化监管平台</small></div>
    </header>
    <section className="login-visual" aria-label="平台能力概览">
      <div className="login-visual-copy"><span>XI&apos;AN FIRE SAFETY OPERATIONS</span><h1>一张地图掌握全域消防态势</h1><p>连接建筑、设备、报警与巡检数据，为投资演示提供完整、可信的业务闭环。</p><div className="login-proof"><span><b>286</b> 接入设备</span><span><b>24h</b> 实时监测</span><span><b>96.9%</b> 在线率</span></div></div>
    </section>
    <section className="login-panel">
      <form className="login-card" onSubmit={submit}>
        <div className="login-card-icon"><AppIcon name="shield" size={23} /></div>
        <span className="login-kicker">SECURE ACCESS</span>
        <h2>欢迎登录</h2>
        <p>请使用平台账号进入消防安全运营中心</p>
        <label><span>账号</span><div className="login-field"><AppIcon name="user" /><input value={username} onChange={event => { setUsername(event.target.value); setError(''); }} autoComplete="username" aria-label="登录账号" /></div></label>
        <label><span>密码</span><div className="login-field"><AppIcon name="lock" /><input type={showPassword ? 'text' : 'password'} value={password} onChange={event => { setPassword(event.target.value); setError(''); }} autoComplete="current-password" aria-label="登录密码" /><button type="button" aria-label={showPassword ? '隐藏密码' : '显示密码'} onClick={() => setShowPassword(!showPassword)}><AppIcon name="eye" /></button></div></label>
        <div className="login-options"><label><input type="checkbox" defaultChecked /> <span>记住账号</span></label><span>安全访问 · 演示环境</span></div>
        {error && <div className="login-error"><AppIcon name="alert" size={15} />{error}</div>}
        <button className="login-submit" type="submit">进入运营中心 <span>→</span></button>
        <div className="demo-account"><AppIcon name="shield" size={15} /><span>演示账号</span><b>admin</b><i>/</i><b>123456</b></div>
      </form>
    </section>
    <footer className="login-footer">© 2026 西安北方应急技术有限公司 · 消防设施联网监测演示系统</footer>
  </main>;
}

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  const [view, setView] = useState<View>('overview');
  const [parkId, setParkId] = useState<keyof typeof parks>('lingang');
  const [siteOpen, setSiteOpen] = useState(false);
  const [demoStatus, setDemoStatus] = useState<DemoStatus>('idle');
  const [selectedAlert, setSelectedAlert] = useState<number | null>(null);
  const [deviceFilter, setDeviceFilter] = useState('全部设备');
  const [toast, setToast] = useState('');
  const parkMenuRef = useRef<HTMLDivElement>(null);
  const park = parks[parkId];

  useEffect(() => {
    if (!siteOpen) return;
    function closeOnOutside(event: PointerEvent) {
      if (!parkMenuRef.current?.contains(event.target as Node)) setSiteOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setSiteOpen(false);
    }
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [siteOpen]);

  const demoVisible = demoStatus !== 'idle';
  const demoActive = demoStatus !== 'idle' && demoStatus !== 'closed';
  const statusLabel = demoStatus === 'pending' ? '待确认' : demoStatus === 'confirmed' ? '已确认' : demoStatus === 'processing' ? '处置中' : demoStatus === 'closed' ? '已关闭' : '';
  const alerts = useMemo<AlertItem[]>(() => demoVisible
    ? [{ id: 99, level: '高', title: '消防水压快速下降', place: '生产中心 · 2F西区', time: '刚刚', device: 'PT-01-029', status: statusLabel }, ...baseAlerts]
    : baseAlerts, [demoVisible, statusLabel]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  }

  function triggerDemo() {
    if (demoVisible) {
      setDemoStatus('idle'); setSelectedAlert(null); showToast('演示数据已重置'); return;
    }
    setDemoStatus('pending'); showToast('已接收到一条高等级消防报警');
  }

  function advanceDemo() {
    if (selectedAlert !== 99) return;
    if (demoStatus === 'pending') { setDemoStatus('confirmed'); showToast('报警已确认，处置计时已开始'); }
    else if (demoStatus === 'confirmed') { setDemoStatus('processing'); showToast('工单已派发给园区维保组'); }
    else if (demoStatus === 'processing') { setDemoStatus('closed'); showToast('报警已闭环，所有看板数据已同步'); }
  }

  function openDevices(filter = '全部设备') { setDeviceFilter(filter); setView('devices'); }

  if (!authenticated) return <LoginScreen onLogin={() => setAuthenticated(true)} />;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="brand-mark" aria-label="返回指挥总览" onClick={() => setView('overview')}>
          {/* eslint-disable-next-line @next/next/no-img-element -- static local brand asset avoids the Vinext image shim */}
          <img src="/company-logo.png" alt="西安北方应急技术公司标志" width="46" height="46" />
        </button>
        <nav className="side-nav" aria-label="主导航">
          {navItems.map(([icon, label, target]) => (
            <button className={`nav-item ${view === target ? 'active' : ''}`} key={label} title={label} onClick={() => setView(target)}><NavGlyph kind={icon} /><small>{label}</small></button>
          ))}
        </nav>
        <button className="nav-item settings" title="系统设置" onClick={() => showToast('设置面板已在演示版中锁定')}><NavGlyph kind="settings" /><small>系统设置</small></button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <div className="eyebrow"><span className="live-dot" /> 系统运行正常 · 数据实时更新</div>
            <h1>社会消防综合服务（陕西）中心</h1>
          </div>
          <div className="top-actions">
            <div className="park-selector-wrap" ref={parkMenuRef}>
              <button className="site-select" aria-expanded={siteOpen} onClick={() => setSiteOpen(!siteOpen)}><span>当前园区</span><strong>{park.name}</strong><i>{siteOpen ? '⌃' : '⌄'}</i></button>
              {siteOpen && <div className="park-menu">{Object.entries(parks).map(([id, item]) => <button className={parkId === id ? 'selected' : ''} key={id} onClick={() => { setParkId(id as keyof typeof parks); setSiteOpen(false); showToast(`已切换至${item.name}`); }}><span>{item.name}<small>{item.address}</small></span><b>{item.devices} 台</b></button>)}</div>}
            </div>
            <button className="ghost-button" onClick={() => document.documentElement.requestFullscreen?.()}>全屏展示</button>
            <button className={demoActive ? 'demo-button triggered' : 'demo-button'} onClick={triggerDemo}><span className="button-pulse" />{demoVisible ? '重置演示' : '触发演示报警'}</button>
            <button className="user-badge" title="退出登录" aria-label="退出登录" onClick={() => setAuthenticated(false)}><AppIcon name="logout" size={18} /></button>
          </div>
        </header>

        {view === 'overview' && <Overview park={park} alerts={alerts} demoActive={demoActive} demoStatus={demoStatus} openAlert={setSelectedAlert} setView={setView} openDevices={openDevices} showToast={showToast} />}
        {view === 'alarms' && <AlarmCenter alerts={alerts} demoStatus={demoStatus} openAlert={setSelectedAlert} />}
        {view === 'devices' && <DeviceCenter key={deviceFilter} initialFilter={deviceFilter} showToast={showToast} />}
        {view === 'buildings' && <BuildingArchive park={park} showToast={showToast} openDevices={openDevices} />}
        {view === 'patrol' && <PatrolCenter showToast={showToast} />}
        {view === 'reports' && <ReportsPage showToast={showToast} />}
      </section>

      {selectedAlert !== null && <AlarmDrawer alert={alerts.find(item => item.id === selectedAlert) ?? baseAlerts[0]} demoStatus={demoStatus} isDemo={selectedAlert === 99} onClose={() => setSelectedAlert(null)} onAdvance={advanceDemo} onBack={() => { setSelectedAlert(null); setView('overview'); }} />}
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
    </main>
  );
}

function Overview({ park, alerts, demoActive, demoStatus, openAlert, setView, openDevices, showToast }: {
  park: typeof parks[keyof typeof parks]; alerts: AlertItem[]; demoActive: boolean; demoStatus: DemoStatus;
  openAlert: (id: number) => void; setView: (view: View) => void; openDevices: (filter?: string) => void; showToast: (message: string) => void;
}) {
  return <div className="dashboard">
    <section className="kpi-row" aria-label="核心指标">
      <Kpi title="接入设备" value={String(park.devices)} unit="台" note="查看全部设备资产" tone="cyan" onClick={() => openDevices()} />
      <Kpi title="设备在线率" value={demoActive ? '95.8' : ((park.online / park.devices) * 100).toFixed(1)} unit="%" note={`在线 ${park.online} 台`} tone="blue" onClick={() => openDevices('在线设备')} />
      <Kpi title="今日报警" value={demoActive ? '4' : '3'} unit="起" note={`未处理 ${demoStatus === 'pending' ? 2 : 1} 起`} tone="red" danger={demoActive} onClick={() => setView('alarms')} />
      <Kpi title="隐患闭环率" value={demoStatus === 'closed' ? '96.4' : '94.6'} unit="%" note="查看处置统计" tone="green" onClick={() => setView('reports')} />
    </section>

    <section className="content-grid">
      <div className="left-column">
        <Panel title="系统运行状态" extra="点击查看设备">
          <div className="system-list">{systems.map(system => <button className="system-row" key={system.name} onClick={() => openDevices(system.filter)}><span className="system-icon"><AppIcon name={system.icon as IconName} /></span><span className="system-copy"><strong>{system.name}</strong><small>{system.online} / {system.total} 在线</small></span><span className="online-tag">查看 ›</span></button>)}</div>
        </Panel>
        <Panel title="近 7 日报警趋势" extra="总计 17 起">
          <button className="mini-chart" aria-label="查看近7日报警报表" onClick={() => setView('reports')}>{[38,58,30,74,48,62,demoActive ? 90 : 54].map((height, i) => <span className="bar-wrap" key={i}><i className="bar" style={{ height: `${height}%` }} /><small>{['一','二','三','四','五','六','日'][i]}</small></span>)}</button>
        </Panel>
      </div>

      <CampusMap park={park} demoActive={demoActive} openAlert={openAlert} openDevices={openDevices} showToast={showToast} />

      <div className="right-column">
        <Panel title="实时报警" extra={`${alerts.length} 条`}>
          <div className="alert-list">{alerts.slice(0,4).map(alert => <button className={alert.id === 99 && demoActive ? 'alert-row newest' : 'alert-row'} key={alert.id} onClick={() => openAlert(alert.id)}><span className={`level level-${alert.level}`}>{alert.level}</span><span className="alert-copy"><strong>{alert.title}</strong><small>{alert.place}</small></span><time>{alert.time}</time></button>)}</div>
          <button className="panel-link" onClick={() => setView('alarms')}>进入报警处置中心 <span>→</span></button>
        </Panel>
        <Panel title="设备健康度" extra="点击查看明细">
          <button className="health-wrap" onClick={() => openDevices()}><span className="health-ring"><span><strong>{demoActive ? '95.8' : '96.9'}</strong><small>综合健康度</small></span></span><span className="health-legend"><span><i className="green" />正常设备 <b>271</b></span><span><i className="amber" />故障设备 <b>8</b></span><span><i className="gray" />离线设备 <b>7</b></span></span></button>
        </Panel>
      </div>
    </section>
  </div>;
}

function CampusMap({ park, demoActive, openAlert, openDevices, showToast }: { park: typeof parks[keyof typeof parks]; demoActive: boolean; openAlert: (id: number) => void; openDevices: (filter?: string) => void; showToast: (m: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AMapMap | null>(null);
  const markersRef = useRef<AMapMarker[]>([]);
  const markerElementsRef = useRef<HTMLElement[]>([]);
  const [mode, setMode] = useState<AMapMode>('standard');
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>(() => process.env.NEXT_PUBLIC_AMAP_KEY && process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE ? 'loading' : 'error');
  const [selectedSite, setSelectedSite] = useState<(typeof xianSites)[number] | null>(xianSites[0]);

  useEffect(() => {
    let disposed = false;
    const key = process.env.NEXT_PUBLIC_AMAP_KEY;
    const securityJsCode = process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE;

    function initializeMap() {
      if (disposed || !containerRef.current || !window.AMap || mapRef.current) return;
      const AMap = window.AMap;
      const map = new AMap.Map(containerRef.current, {
        viewMode: '3D',
        zoom: 12.2,
        center: [108.8665, 34.1965],
        pitch: 36,
        mapStyle: 'amap://styles/darkblue',
        features: ['bg', 'road', 'building', 'point'],
      });

      const markerElements: HTMLElement[] = [];
      const markers = xianSites.map((site) => {
        const content = document.createElement('button');
        content.type = 'button';
        content.className = `amap-site-marker ${site.status}`;
        content.setAttribute('aria-label', `查看${site.name}`);
        content.innerHTML = `<i></i><span><b>${site.name}</b><small>${site.devices} 台设备 · ${site.status === 'warning' ? '1 项关注' : '运行正常'}</small></span>`;
        markerElements.push(content);
        const marker = new AMap.Marker({
          position: site.position,
          content,
          anchor: 'bottom-center',
          offset: new AMap.Pixel(0, -3),
          zIndex: site.status === 'warning' ? 120 : 100,
        });
        marker.on('click', () => setSelectedSite(site));
        return marker;
      });

      map.add(markers);
      map.addControl(new AMap.Scale({ position: 'LB' }));
      map.addControl(new AMap.ToolBar({ position: { right: '14px', top: '76px' } }));
      map.setFitView(markers, false, [70, 70, 76, 70], 12.4);
      mapRef.current = map;
      markersRef.current = markers;
      markerElementsRef.current = markerElements;
      setMapStatus('ready');
    }

    if (!key || !securityJsCode) {
      return;
    }

    window._AMapSecurityConfig = { securityJsCode };
    window.__fireAmapReady = initializeMap;
    const existingScript = document.getElementById('amap-jsapi') as HTMLScriptElement | null;
    if (window.AMap) initializeMap();
    else if (existingScript) existingScript.addEventListener('load', initializeMap, { once: true });
    else {
      const script = document.createElement('script');
      script.id = 'amap-jsapi';
      script.async = true;
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}&plugin=AMap.Scale,AMap.ToolBar&callback=__fireAmapReady`;
      script.addEventListener('error', () => setMapStatus('error'), { once: true });
      document.head.appendChild(script);
    }

    return () => {
      disposed = true;
      mapRef.current?.destroy();
      mapRef.current = null;
      markersRef.current = [];
      markerElementsRef.current = [];
      delete window.__fireAmapReady;
    };
  }, []);

  useEffect(() => {
    markerElementsRef.current.forEach((element, index) => {
      element.classList.toggle('selected', xianSites[index].id === selectedSite?.id);
      element.classList.toggle('alarm', demoActive && index === 0);
    });
  }, [demoActive, selectedSite]);

  function changeMode(next: AMapMode) {
    const map = mapRef.current;
    const AMap = window.AMap;
    if (!map || !AMap) return;
    if (next === 'satellite') {
      map.setLayers([new AMap.TileLayer.Satellite(), new AMap.TileLayer.RoadNet()]);
    } else if (next === 'traffic') {
      map.setLayers([AMap.createDefaultLayer(), new AMap.TileLayer.Traffic({ autoRefresh: true, interval: 180 })]);
      map.setMapStyle('amap://styles/darkblue');
    } else {
      map.setLayers([AMap.createDefaultLayer()]);
      map.setMapStyle('amap://styles/darkblue');
    }
    setMode(next);
    showToast(next === 'satellite' ? '已切换卫星图层' : next === 'traffic' ? '已开启实时路况图层' : '已切换科技底图');
  }

  function fitSites() {
    mapRef.current?.setFitView(markersRef.current, false, [70, 70, 76, 70], 12.4);
    showToast('已定位西安市高新区全部点位');
  }

  return <article className="panel map-panel amap-panel">
    <header className="panel-header"><div><i /><h2>西安消防态势地图</h2></div><span>{park.name} · 高德实时底图</span></header>
    <div className="map-toolbar map-layer-switcher" aria-label="地图图层切换">
      {([['standard', '科技底图'], ['satellite', '卫星地图'], ['traffic', '实时路况']] as [AMapMode, string][]).map(([id, label]) => <button className={mode === id ? 'selected' : ''} key={id} onClick={() => changeMode(id)}>{label}</button>)}
      <button onClick={fitSites}>全部点位</button>
    </div>
    <div className="amap-canvas" ref={containerRef} aria-label="西安市消防设施交互地图" />
    {mapStatus === 'loading' && <div className="amap-loading"><span /><strong>正在加载西安市地图</strong><small>高德 JS API 2.0</small></div>}
    {mapStatus === 'error' && <div className="amap-loading error"><strong>地图暂时无法加载</strong><small>请检查网络或本地高德密钥配置</small></div>}
    <div className="amap-summary"><small>已接入西安建筑点位</small><strong>5</strong><span>在线设备 277 / 286</span></div>
    {selectedSite && <div className="amap-site-card">
      <button className="amap-card-close" aria-label="关闭点位卡片" onClick={() => setSelectedSite(null)}>×</button>
      <small>{selectedSite.address}</small>
      <strong>{selectedSite.name}</strong>
      <div><span><b>{selectedSite.devices}</b> 接入设备</span><span><b>{selectedSite.status === 'warning' ? '1' : '0'}</b> 当前告警</span></div>
      <footer><button onClick={() => openDevices()}>设备列表</button><button onClick={() => demoActive && selectedSite.id === 'zhangba' ? openAlert(99) : showToast(`${selectedSite.name}运行档案已展开`)}>运行档案</button></footer>
    </div>}
    <div className="amap-legend"><span><i className="normal" />正常</span><span><i className="warning" />关注</span><span><i className="alarm" />报警</span></div>
  </article>;
}

/* eslint-disable @typescript-eslint/no-unused-vars -- retained as a lightweight offline fallback for the demo */
function CampusLayer({ park, demoActive, chooseBuilding, openAlert }: { park: typeof parks[keyof typeof parks]; demoActive: boolean; chooseBuilding: (b: BuildingInfo) => void; openAlert: (id: number) => void }) {
  return <div className="campus-layer"><div className="campus-boundary" /><div className="map-road road-main" /><div className="map-road road-cross" /><div className="green-zone green-one">生态中庭</div><div className="green-zone green-two">应急集合点</div>{park.blocks.map((block,index) => <button className={`map-building zone-${index + 1} ${demoActive && index === 0 ? 'alerting' : ''}`} key={block.name} onClick={() => demoActive && index === 0 ? openAlert(99) : chooseBuilding(block)}><span className="building-grid" /><strong>{block.name}</strong><small>{block.floors} 层 · {block.devices} 台设备</small><i /></button>)}<div className="water-basin"><span>消防水池</span><b>98%</b></div>{demoActive && <button className="campus-alarm-pin" onClick={() => openAlert(99)}><i>!</i><span>水压异常<small>生产中心 2F</small></span></button>}</div>;
}

function BuildingLayer({ building, onFloor }: { building: BuildingInfo; onFloor: () => void }) {
  return <div className="building-layer"><div className="building-context"><span>当前建筑</span><strong>{building.name}</strong><small>{building.type} · {building.floors} 层 · {building.devices} 台设备</small></div><div className="building-model"><div className="model-core">消防控制室</div><div className="model-wing wing-a">A区生产</div><div className="model-wing wing-b">B区生产</div><div className="model-wing wing-c">设备机房</div><div className="model-yard">疏散广场</div></div><div className="floor-stack">{Array.from({length: Math.min(building.floors,6)},(_,i) => building.floors - i).map(floor => <button key={floor} onClick={onFloor}><b>{floor}F</b><span>{floor === 2 ? '西区有 1 条报警' : '运行正常'}</span><i className={floor === 2 ? 'warn' : ''} /></button>)}</div></div>;
}

function FloorLayer({ demoActive, selectDevice, openAlert }: { demoActive: boolean; selectDevice: (s: string) => void; openAlert: (id: number) => void }) {
  return <div className="floor-layer"><div className="floor-title"><strong>生产中心 · 2F</strong><span>建筑面积 2,860㎡ · 设备 24 台</span></div><div className="floor-plan"><div className="room room-a">西区生产车间</div><div className="room room-b">东区生产车间</div><div className="room room-c">配电间</div><div className="room room-d">备件库</div><div className="corridor">疏散走廊</div>{['烟感 2F-01','温感 2F-07','手报 2F-03','门磁 2F-12'].map((name,index) => <button className={`floor-device point-${index + 1}`} key={name} onClick={() => selectDevice(name)} title={name}><i /></button>)}<button className={`floor-device point-alarm ${demoActive ? 'active' : ''}`} onClick={() => demoActive ? openAlert(99) : selectDevice('压力采集终端 PT-01-029')} title="消防水压点位"><i>!</i></button><div className="exit-mark exit-a">安全出口</div><div className="exit-mark exit-b">安全出口</div></div></div>;
}

function DeviceLayer({ demoActive, selectDevice, openAlert }: { demoActive: boolean; selectDevice: (s: string) => void; openAlert: (id: number) => void }) {
  const points = ['智能烟感 JTY-0338','水箱液位 LT-T2','防火门磁 DM-105','剩余电流 ELE-086','消防电源 PS-022','消火栓压力 PT-029','温感 JTW-921'];
  return <div className="device-layer"><div className="device-map-base"><div className="block-outline block-1" /><div className="block-outline block-2" /><div className="block-outline block-3" /><div className="block-outline block-4" /></div>{points.map((point,index) => <button key={point} className={`map-point mp-${index + 1}`} onClick={() => demoActive && index === 5 ? openAlert(99) : selectDevice(point)}><i className={demoActive && index === 5 ? 'alarm' : index === 2 ? 'warning' : ''} /><span>{point.split(' ')[0]}</span></button>)}</div>;
}
/* eslint-enable @typescript-eslint/no-unused-vars */

function AlarmCenter({ alerts, demoStatus, openAlert }: { alerts: AlertItem[]; demoStatus: DemoStatus; openAlert: (id: number) => void }) {
  const [filter, setFilter] = useState('全部报警'); const [query, setQuery] = useState('');
  const visible = alerts.filter(alert => (filter === '全部报警' || (filter === '待处理' && ['待确认','待复核'].includes(alert.status)) || (filter === '处理中' && ['处置中','已确认'].includes(alert.status)) || (filter === '已关闭' && alert.status === '已关闭')) && `${alert.title}${alert.device}${alert.place}`.includes(query));
  return <div className="management-page"><PageHeading kicker="ALARM RESPONSE" title="报警处置中心" description="对报警进行确认、派单、处置与复核，形成完整闭环。" /><section className="summary-row"><SummaryCard label="待确认" value={demoStatus === 'pending' ? '2' : '1'} tone="red" onClick={() => setFilter('待处理')} /><SummaryCard label="处置中" value={demoStatus === 'processing' ? '4' : '3'} tone="amber" onClick={() => setFilter('处理中')} /><SummaryCard label="今日已关闭" value={demoStatus === 'closed' ? '13' : '12'} tone="green" onClick={() => setFilter('已关闭')} /><SummaryCard label="平均响应时间" value="01:42" tone="blue" onClick={() => setFilter('全部报警')} /></section><section className="data-panel"><div className="data-toolbar"><div className="filter-pills">{['全部报警','待处理','处理中','已关闭'].map(item => <button className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)} key={item}>{item}</button>)}</div><label className="search-box"><AppIcon name="search" size={14} /><input value={query} onChange={e => setQuery(e.target.value)} aria-label="搜索报警" placeholder="搜索设备、位置或编号" /></label></div><div className="alarm-table table-head"><span>等级 / 报警事件</span><span>设备编号</span><span>位置</span><span>发生时间</span><span>状态</span><span /></div>{visible.map(alert => <button className={`alarm-table table-row ${alert.id === 99 ? 'highlight' : ''}`} key={alert.id} onClick={() => openAlert(alert.id)}><span className="event-cell"><i className={`level level-${alert.level}`} title={`${alert.level}等级报警`}><AppIcon name="alert" size={13} /></i><b>{alert.title}</b></span><span>{alert.device}</span><span>{alert.place}</span><span>{alert.time}</span><span className={`status-text status-${alert.status}`}>{alert.status}</span><span className="row-arrow">›</span></button>)}{visible.length === 0 && <EmptyState text="没有符合条件的报警记录" />}</section></div>;
}

function DeviceCenter({ initialFilter, showToast }: { initialFilter: string; showToast: (message: string) => void }) {
  const systemTabs = ['全部系统', '火灾报警', '电气火灾', '消防给水', '防火门'];
  const [activeSystem, setActiveSystem] = useState(() => systemTabs.includes(initialFilter) ? initialFilter : '全部系统');
  const [statusFilter, setStatusFilter] = useState(() => initialFilter === '在线设备' || initialFilter === '离线设备' ? initialFilter : '全部状态');
  const [selectedZone, setSelectedZone] = useState('全部区域');
  const [query, setQuery] = useState('');
  const visible = devices.filter(item => (activeSystem === '全部系统' || item.system === activeSystem) && (statusFilter === '全部状态' || statusFilter === '在线设备' && item.state === '在线' || statusFilter === '离线设备' && item.state === '离线' || statusFilter === '异常设备' && (item.state === '离线' || item.value.includes('0.38'))) && (selectedZone === '全部区域' || item.zone === selectedZone) && `${item.name}${item.code}${item.place}`.includes(query));

  return <div className="management-page monitoring-page">
    <PageHeading kicker="DEVICE MONITORING" title="消防设施数据监测" description="按区域与消防子系统集中查看设备状态、实时监测值及通信质量。" />
    <section className="monitoring-shell">
      <aside className="zone-tree-panel">
        <label className="zone-search"><AppIcon name="search" size={15} /><input aria-label="搜索区域" placeholder="搜索区域或建筑" /></label>
        <div className="zone-tree-title"><AppIcon name="building" size={16} /><span>西安市重点联网单位</span></div>
        <button className={selectedZone === '全部区域' ? 'selected' : ''} onClick={() => setSelectedZone('全部区域')}><AppIcon name="building" size={15} /><span>全部区域<small>5 个建筑点位</small></span><b>286</b></button>
        {xianSites.map(site => <button className={selectedZone === site.name ? 'selected' : ''} key={site.id} onClick={() => setSelectedZone(site.name)}><AppIcon name="building" size={15} /><span>{site.name}<small>{site.address}</small></span><b>{site.devices}</b></button>)}
      </aside>
      <div className="monitoring-main">
        <nav className="system-tabs" aria-label="消防子系统">{systemTabs.map(item => <button className={activeSystem === item ? 'selected' : ''} key={item} onClick={() => setActiveSystem(item)}><AppIcon name={item === '电气火灾' ? 'bolt' : item === '消防给水' ? 'water' : item === '防火门' ? 'door' : item === '全部系统' ? 'signal' : 'smoke'} size={15} />{item}</button>)}</nav>
        <section className="monitor-summary-grid">
          <button onClick={() => setStatusFilter('全部状态')}><span><AppIcon name="signal" /></span><small>设备总数</small><strong>286</strong><div><i /> 在线设备 277 <em>96.9%</em></div></button>
          <button onClick={() => setStatusFilter('在线设备')}><span><AppIcon name="shield" /></span><small>设备监测值</small><strong>612</strong><div><i /> 正常监测值 605 <em>98.9%</em></div></button>
          <button onClick={() => setStatusFilter('全部状态')}><span><AppIcon name="smoke" /></span><small>传感器总数</small><strong>214</strong><div><i /> 在线传感器 209 <em>97.7%</em></div></button>
          <button onClick={() => setStatusFilter('异常设备')}><span><AppIcon name="alert" /></span><small>异常监测值</small><strong>7</strong><div className="warning"><i /> 需要关注 <em>1.1%</em></div></button>
        </section>
        <section className="monitor-device-panel">
          <header><button className="refresh-control" onClick={() => showToast('设备状态已刷新')}><span>↻</span>刷新</button><div className="monitor-filters"><span>快速筛选</span>{['全部状态','在线设备','离线设备','异常设备'].map(item => <button className={statusFilter === item ? 'selected' : ''} key={item} onClick={() => setStatusFilter(item)}>{item}</button>)}<label><AppIcon name="search" size={14} /><input value={query} onChange={event => setQuery(event.target.value)} aria-label="搜索设备" placeholder="设备名称、编号" /></label></div></header>
          <div className="monitor-device-list">{visible.map(device => <article className={device.state === '离线' ? 'monitor-device-card offline' : 'monitor-device-card'} key={device.code}>
            <div className="monitor-device-title"><span><AppIcon name={iconForSystem(device.system)} size={20} /></span><div><strong>{device.name}</strong><small><i className={device.state === '在线' ? 'online' : 'offline'} />{device.state} · 信号 {device.signal}% · {device.value === '--' ? '无监测值' : '监测正常'}</small></div></div>
            <dl><div><dt>设备编号</dt><dd>{device.code}</dd></div><div><dt>所属区域</dt><dd>{device.zone}</dd></div><div><dt>详细位置</dt><dd>{device.place}</dd></div><div><dt>当前值</dt><dd className="metric-value">{device.value}</dd></div><div><dt>上报时间</dt><dd>{device.seen}</dd></div></dl>
            <footer><button onClick={() => showToast(`已定位 ${device.name}`)}>地图定位</button><button onClick={() => showToast(`已打开 ${device.name} 的实时趋势`)}>实时趋势</button><button onClick={() => showToast(`已打开 ${device.code} 设备档案`)}>设备详情</button></footer>
          </article>)}{visible.length === 0 && <EmptyState text="当前筛选条件下没有设备" />}</div>
        </section>
      </div>
    </section>
  </div>;
}

function BuildingArchive({ park, showToast, openDevices }: { park: typeof parks[keyof typeof parks]; showToast: (m: string) => void; openDevices: (filter?: string) => void }) {
  return <div className="management-page"><PageHeading kicker="BUILDING ARCHIVE" title="建筑与消防档案" description={`${park.name} · ${park.address}`} /><section className="building-card-grid">{park.blocks.map((block,index) => <button className="building-card" key={block.name} onClick={() => showToast(`已打开${block.name}建筑档案`)}><div className={`building-thumb thumb-${index + 1}`}><span /><i>{block.floors}F</i></div><div className="building-card-head"><span>{block.type}</span><b className={block.online === block.devices ? '' : 'warning'}>{block.online === block.devices ? '运行正常' : `${block.devices - block.online} 台异常`}</b></div><h3>{block.name}</h3><p><span>消防设备 <b>{block.devices}</b></span><span>在线设备 <b>{block.online}</b></span><span>安全负责人 <b>{block.owner}</b></span></p><div className="card-link">查看完整档案 <span>→</span></div></button>)}</section><button className="floating-page-action" onClick={() => openDevices()}>查看园区全部设备 →</button></div>;
}

function PatrolCenter({ showToast }: { showToast: (m: string) => void }) {
  const [filter, setFilter] = useState('今日任务');
  const tasks = [{name:'生产中心消防设施日巡检',area:'生产中心 1—4F',owner:'王磊',progress:72,status:'进行中'},{name:'消防泵房压力专项检查',area:'动力中心 B1',owner:'刘工',progress:100,status:'已完成'},{name:'仓储中心防火门检查',area:'仓储中心 1—2F',owner:'张勇',progress:35,status:'进行中'},{name:'研发中心月度联动测试',area:'研发中心',owner:'林静',progress:0,status:'待开始'}];
  return <div className="management-page"><PageHeading kicker="INSPECTION TASKS" title="巡检任务" description="跟踪日常巡查、专项检查和隐患整改进度。" /><section className="patrol-overview"><div><small>今日计划</small><strong>12</strong><span>项任务</span></div><div><small>已完成</small><strong>8</strong><span>完成率 66.7%</span></div><div className="patrol-progress"><span><i style={{width:'66.7%'}} /></span><small>计划进度</small></div></section><section className="data-panel"><div className="data-toolbar"><div className="filter-pills">{['今日任务','本周计划','隐患整改'].map(item => <button className={filter === item ? 'selected' : ''} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div><button className="toolbar-action" onClick={() => showToast('已创建一条新的演示巡检任务')}>＋ 新建任务</button></div><div className="task-list">{tasks.map(task => <button key={task.name} className="task-row" onClick={() => showToast(`已打开任务：${task.name}`)}><span className="task-check">{task.status === '已完成' ? '✓' : ''}</span><span><strong>{task.name}</strong><small>{task.area} · 执行人 {task.owner}</small></span><span className="task-progress"><i><em style={{width:`${task.progress}%`}} /></i><b>{task.progress}%</b></span><span className={`task-status ${task.status}`}>{task.status}</span><i className="row-arrow">›</i></button>)}</div></section></div>;
}

function ReportsPage({ showToast }: { showToast: (m: string) => void }) {
  const download = () => { const blob = new Blob(['智慧消防安全运营中心\n2026年8月演示报告\n设备在线率：96.9%\n报警闭环率：94.6%'], {type:'text/plain;charset=utf-8'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='智慧消防演示报告.txt'; a.click(); URL.revokeObjectURL(url); showToast('演示报告已导出'); };
  return <div className="management-page"><PageHeading kicker="OPERATIONS REPORT" title="运营分析报告" description="从设备、报警和巡检三个维度查看消防安全运行质量。" /><section className="report-grid"><article className="report-main"><header><div><small>本月消防安全评分</small><strong>92.8<span>分</span></strong></div><button onClick={download}>导出演示报告 ↓</button></header><div className="report-bars">{[['设备在线率',97],['报警及时响应率',94],['隐患闭环率',95],['巡检完成率',89]].map(([label,value]) => <button key={label} onClick={() => showToast(`正在查看${label}明细`)}><span>{label}<b>{value}%</b></span><i><em style={{width:`${value}%`}} /></i></button>)}</div></article><article className="report-card"><span>报警同比</span><strong>−18.6%</strong><small>较上月减少 5 起</small></article><article className="report-card"><span>平均闭环用时</span><strong>18m 24s</strong><small>较上月缩短 3m 10s</small></article></section><section className="panel monthly-panel"><header className="panel-header"><div><i /><h2>近 12 月报警与闭环趋势</h2></div><span>点击月份查看明细</span></header><div className="monthly-chart">{[42,56,37,69,51,48,73,61,45,54,39,32].map((height,index) => <button key={index} onClick={() => showToast(`已选择 ${index + 1} 月数据`)}><i style={{height:`${height}%`}} /><span>{index + 1}月</span></button>)}</div></section></div>;
}

function AlarmDrawer({ alert, demoStatus, isDemo, onClose, onAdvance, onBack }: { alert: AlertItem; demoStatus: DemoStatus; isDemo: boolean; onClose: () => void; onAdvance: () => void; onBack: () => void }) {
  const stage = !isDemo ? 4 : demoStatus === 'pending' ? 1 : demoStatus === 'confirmed' ? 2 : demoStatus === 'processing' ? 3 : 4;
  const action = demoStatus === 'pending' ? '确认报警' : demoStatus === 'confirmed' ? '派发维保工单' : demoStatus === 'processing' ? '填写结果并关闭' : '返回指挥总览';
  return <div className="drawer-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}><aside className="alarm-drawer" role="dialog" aria-modal="true" aria-label="报警处置详情"><header className="drawer-header"><div><span className={`level level-${alert.level}`} title={`${alert.level}等级报警`}><AppIcon name="alert" size={14} /></span><div><small>报警事件 #{String(alert.id).padStart(6,'0')}</small><h2>{alert.title}</h2></div></div><button onClick={onClose} aria-label="关闭">×</button></header><div className="alarm-hero"><div className="alarm-visual"><span className="camera-label">现场联动预览</span><div className="camera-building"><i /><i /><i /><strong>生产中心</strong></div><div className="camera-time">CAM-02 · LIVE</div></div><div className="alarm-metric"><small>当前管网压力</small><strong>{isDemo && demoStatus === 'closed' ? '0.62' : '0.38'}<i>MPa</i></strong><span>正常范围 0.50 — 0.80 MPa</span><div className="pressure-line"><em style={{width:isDemo && demoStatus === 'closed' ? '68%' : '34%'}} /></div></div></div><section className="detail-grid"><div><small>设备编号</small><strong>{alert.device}</strong></div><div><small>报警位置</small><strong>{alert.place}</strong></div><div><small>发生时间</small><strong>2026-08-30 {alert.time === '刚刚' ? '10:32:46' : alert.time}</strong></div><div><small>现场负责人</small><strong>周海 · 138****6072</strong></div></section><section className="workflow"><h3>处置进度</h3><div className="workflow-steps">{['接收报警','人工确认','工单派发','处置完成'].map((label,index) => <div className={stage > index ? 'step done' : stage === index ? 'step current' : 'step'} key={label}><i>{stage > index ? '✓' : index + 1}</i><span>{label}<small>{stage > index ? ['10:32:46','10:33:21','10:34:05','10:41:38'][index] : stage === index ? '等待操作' : '--'}</small></span></div>)}</div></section><section className="handling-note"><label>处置意见</label><textarea defaultValue={demoStatus === 'processing' ? '现场人员已到达，正在检查管网压力及阀组状态。' : ''} placeholder="填写现场核查或处置情况…" /></section><footer className="drawer-footer"><button className="secondary-action" onClick={onClose}>暂时返回</button>{isDemo ? <button className="primary-action" onClick={demoStatus === 'closed' ? onBack : onAdvance}>{action}<span>→</span></button> : <button className="primary-action" onClick={onClose}>查看历史处置记录<span>→</span></button>}</footer></aside></div>;
}

function PageHeading({ kicker, title, description }: { kicker: string; title: string; description: string }) { return <header className="page-heading"><div><span>{kicker}</span><h2>{title}</h2><p>{description}</p></div><div className="sync-state"><i />实时数据已同步<small>最后更新 10:32:46</small></div></header>; }
function SummaryCard({ label, value, tone, onClick }: { label: string; value: string; tone: string; onClick: () => void }) { return <button className={`summary-card summary-${tone}`} onClick={onClick}><span>{label}</span><strong>{value}</strong><i /><em>查看明细 →</em></button>; }
function Kpi({ title, value, unit, note, tone, danger = false, onClick }: { title: string; value: string; unit: string; note: string; tone: string; danger?: boolean; onClick: () => void }) { return <button className={`kpi-card tone-${tone} ${danger ? 'danger' : ''}`} onClick={onClick}><div className="kpi-top"><span>{title}</span><i>↗</i></div><div className="kpi-value"><strong>{value}</strong><small>{unit}</small></div><p>{note}</p><div className="sparkline"><span /><span /><span /><span /><span /><span /></div></button>; }
function Panel({ title, extra, children, className = '' }: { title: string; extra?: string; children: React.ReactNode; className?: string }) { return <article className={`panel ${className}`}><header className="panel-header"><div><i /><h2>{title}</h2></div>{extra && <span>{extra}</span>}</header>{children}</article>; }
function EmptyState({ text }: { text: string }) { return <div className="empty-state"><span><AppIcon name="inbox" size={24} /></span>{text}</div>; }
