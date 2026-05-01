import ControlPanel from '../ui/ControlPanel.jsx';
import UploadZone from '../ui/UploadZone.jsx';

export default function Sidebar() {
  return (
    <aside className="absolute left-0 top-0 z-10 flex h-full w-[280px] flex-col overflow-y-auto border-r border-white/[0.08] bg-bg-panel/85 px-5 py-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
      <div className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent-cyan">
          electromagnetic viewer
        </p>
        <h1 className="font-display text-3xl font-bold tracking-normal text-[#f5f7ff]">
          EMViz
        </h1>
        <p className="text-sm leading-6 text-[#a8abc7]">
          See the physics inside your circuit.
        </p>
      </div>

      <UploadZone />
      <ControlPanel />
    </aside>
  );
}
