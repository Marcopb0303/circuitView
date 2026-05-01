import { useRef, useState } from 'react';
import { decodeAscBytes } from '../../parser/textEncoding.js';
import { useCircuitStore } from '../../store/circuitStore.js';

export default function UploadZone() {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const { loadCircuit, isParsing, parseError, circuit, circuitName } =
    useCircuitStore((state) => ({
      loadCircuit: state.loadCircuit,
      isParsing: state.isParsing,
      parseError: state.parseError,
      circuit: state.circuit,
      circuitName: state.circuitName,
    }));

  const handleFiles = async (files) => {
    const file = files?.[0];
    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith('.asc')) {
      useCircuitStore.setState({
        circuit: null,
        circuitName: null,
        parseError: 'Please choose an LTspice .asc file.',
        isParsing: false,
      });
      return;
    }

    const text = decodeAscBytes(await file.arrayBuffer());
    loadCircuit(text, file.name);
  };

  return (
    <section className="mt-8">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#6060a0]">
        Circuit Input
      </p>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        className={`mt-3 flex min-h-[132px] w-full flex-col items-start justify-center rounded-lg border border-dashed p-4 text-left transition ${
          isDragging
            ? 'border-accent-cyan bg-accent-cyan/10 shadow-lg shadow-cyan-500/10'
            : 'border-white/[0.14] bg-bg-panel2/70 hover:border-accent-cyan/70 hover:bg-bg-panel2'
        }`}
      >
        <span className="font-mono text-sm font-bold text-[#f5f7ff]">
          Drop .asc file
        </span>
        <span className="mt-2 text-sm leading-6 text-[#a8abc7]">
          Upload an LTspice schematic to render its components and wires in 3D.
        </span>
        <span className="mt-3 font-mono text-xs uppercase tracking-[0.14em] text-accent-cyan">
          {isParsing ? 'Parsing...' : 'Browse files'}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".asc"
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />

      {parseError ? (
        <p className="mt-3 rounded-md border border-red-400/20 bg-red-500/10 p-3 text-sm leading-5 text-red-200">
          {parseError}
        </p>
      ) : null}

      {circuit ? (
        <div className="mt-4 rounded-lg border border-white/[0.07] bg-bg-panel2/70 p-4">
          <p className="truncate font-mono text-xs uppercase tracking-[0.14em] text-accent-cyan">
            {circuitName}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm text-[#c7cae6]">
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6060a0]">
                Parts
              </dt>
              <dd className="mt-1 text-lg text-[#f5f7ff]">
                {circuit.components.length}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6060a0]">
                Wires
              </dt>
              <dd className="mt-1 text-lg text-[#f5f7ff]">
                {circuit.wires.length}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
    </section>
  );
}
