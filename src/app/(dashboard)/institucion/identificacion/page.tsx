'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Square, Sparkles, Database, Brain, UserPlus, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { ApiResponse } from '@/types';

interface IdentificationResult {
  detected: boolean;
  confidence: number;
  language: { id: string; name: string; family?: string };
  variant: { id: string; name: string; region?: string };
  alternatives: Array<{ language: string; variant: string; confidence: number }>;
  processingTime: string;
  note: string;
}

type Phase = 'idle' | 'recording' | 'recorded' | 'analyzing' | 'result';

export default function IdentificacionPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<IdentificationResult | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [fileName, setFileName] = useState('');

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Waveform drawing
  const drawWaveform = useCallback(() => {
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    if (!analyser || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const barCount = 50;
      const barWidth = w / barCount - 2;
      const step = Math.floor(bufferLength / barCount);

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step] ?? 0;
        const barHeight = (value / 255) * h * 0.8;
        const x = i * (barWidth + 2);
        const y = h - barHeight;

        ctx.fillStyle = '#C4941B';
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [barWidth / 2, barWidth / 2, 0, 0]);
        ctx.fill();
      }
    };
    draw();
  }, []);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup analyser for waveform
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Setup recorder
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.start();

      setPhase('recording');
      setElapsed(0);

      // Timer
      timerRef.current = setInterval(() => setElapsed((prev) => prev + 1), 1000);

      // Start waveform
      drawWaveform();
    } catch {
      toast.error('No se pudo acceder al microfono');
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('recorded');
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setPhase('recorded');
      setElapsed(0);
    }
  }

  async function startAnalysis() {
    setPhase('analyzing');
    setAnalysisProgress(0);
    setAnalysisStep(1);

    // Phase 1: Processing audio (0-30%)
    const p1 = setInterval(() => setAnalysisProgress((p) => Math.min(p + 2, 30)), 100);
    await new Promise((r) => setTimeout(r, 2000));
    clearInterval(p1);
    setAnalysisProgress(30);
    setAnalysisStep(2);

    // Phase 2: Comparing (30-70%)
    const p2 = setInterval(() => setAnalysisProgress((p) => Math.min(p + 2, 70)), 100);
    await new Promise((r) => setTimeout(r, 2000));
    clearInterval(p2);
    setAnalysisProgress(70);
    setAnalysisStep(3);

    // Phase 3: Identifying (70-100%) + API call
    const p3 = setInterval(() => setAnalysisProgress((p) => Math.min(p + 3, 95)), 100);

    try {
      const res = await api.post<ApiResponse<IdentificationResult>>('/language-identification', {});
      clearInterval(p3);
      setAnalysisProgress(100);
      setResult(res.data);
      setPhase('result');
    } catch {
      clearInterval(p3);
      toast.error('Error al analizar el audio');
      setPhase('recorded');
    }
  }

  function resetAll() {
    setPhase('idle');
    setResult(null);
    setAnalysisProgress(0);
    setAnalysisStep(0);
    setElapsed(0);
    setFileName('');
  }

  function handleRequestInterpreter() {
    if (!result) return;
    router.push(`/institucion/nueva-solicitud?languageId=${result.language.id}&variantId=${result.variant.id}&from=identification`);
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-redin-earth-900">Identificacion linguistica con IA</h1>
        <p className="text-sm text-redin-earth-500 mt-1">
          Graba o sube un audio de la persona hablando en su lengua indigena.
          Nuestra inteligencia artificial identificara el idioma y la variante linguistica.
        </p>
        <Badge variant="amber" size="sm" className="mt-2">Prototipo — Funcionalidad en desarrollo</Badge>
      </div>

      {/* Idle: ready to record */}
      {phase === 'idle' && (
        <Card>
          <div className="p-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-redin-gold-100 flex items-center justify-center">
                <Mic className="h-10 w-10 text-redin-gold-500" />
              </div>
            </div>
            <div>
              <p className="font-medium text-redin-earth-900">Presiona para grabar</p>
              <p className="text-sm text-redin-earth-500">O sube un archivo de audio</p>
            </div>

            <button
              onClick={startRecording}
              className="mx-auto w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center shadow-lg"
            >
              <Mic className="h-8 w-8 text-white" />
            </button>

            <div>
              <label className="text-sm text-redin-gold-600 hover:text-redin-gold-700 cursor-pointer inline-flex items-center gap-1">
                <Upload className="h-4 w-4" />
                Subir archivo de audio
                <input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          </div>
        </Card>
      )}

      {/* Recording */}
      {phase === 'recording' && (
        <Card>
          <div className="p-8 text-center space-y-6">
            <div className="flex items-center justify-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-lg font-medium text-redin-earth-900">Grabando...</span>
              <span className="font-mono text-redin-earth-600">
                {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
              </span>
            </div>

            <canvas
              ref={canvasRef}
              width={600}
              height={120}
              className="w-full h-[120px] rounded-lg bg-redin-earth-50 border border-redin-earth-200"
            />

            <button
              onClick={stopRecording}
              className="mx-auto w-20 h-20 rounded-full bg-redin-earth-800 hover:bg-redin-earth-900 transition-colors flex items-center justify-center shadow-lg"
            >
              <Square className="h-6 w-6 text-white" />
            </button>
          </div>
        </Card>
      )}

      {/* Recorded: ready to analyze */}
      {phase === 'recorded' && (
        <Card>
          <div className="p-8 text-center space-y-6">
            <div className="h-20 w-20 mx-auto rounded-full bg-redin-forest-100 flex items-center justify-center">
              <Mic className="h-10 w-10 text-redin-forest-600" />
            </div>
            <p className="font-medium text-redin-earth-900">
              {fileName ? `Archivo: ${fileName}` : `Audio grabado — ${elapsed} segundos`}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={startAnalysis} className="inline-flex items-center gap-2">
                <Sparkles className="h-5 w-5" /> Analizar audio
              </Button>
              <Button variant="outline" onClick={resetAll}>Grabar de nuevo</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Analyzing */}
      {phase === 'analyzing' && (
        <Card>
          <div className="p-8 space-y-6">
            <div className="w-full bg-redin-earth-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-redin-gold-400 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>
            <div className="flex items-center gap-3 justify-center">
              {analysisStep === 1 && <Mic size={20} className="text-redin-gold-500 animate-pulse" />}
              {analysisStep === 2 && <Database size={20} className="text-redin-gold-500 animate-pulse" />}
              {analysisStep === 3 && <Brain size={20} className="text-redin-gold-500 animate-pulse" />}
              <span className="text-sm text-redin-earth-600">
                {analysisStep === 1 && 'Procesando audio...'}
                {analysisStep === 2 && 'Comparando con base de datos linguistica...'}
                {analysisStep === 3 && 'Identificando variante linguistica...'}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Result */}
      {phase === 'result' && result && (
        <div className="bg-white border-2 border-redin-gold-300 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-redin-gold-100 rounded-full flex items-center justify-center">
                <Sparkles size={24} className="text-redin-gold-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-redin-earth-900">Lengua identificada</h3>
                <p className="text-sm text-redin-earth-500">Resultado del analisis de IA</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-redin-forest-600">{Math.round(result.confidence * 100)}%</p>
              <p className="text-xs text-redin-earth-500">Confianza</p>
            </div>
          </div>

          <div className="bg-redin-earth-50 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-redin-earth-500">Lengua:</span>
              <span className="font-semibold text-redin-earth-900">{result.language.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-redin-earth-500">Variante:</span>
              <span className="font-semibold text-redin-earth-900">{result.variant.name}</span>
            </div>
            {result.variant.region && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-redin-earth-500">Region:</span>
                <span className="text-sm text-redin-earth-700">{result.variant.region}</span>
              </div>
            )}
            {result.language.family && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-redin-earth-500">Familia:</span>
                <span className="text-sm text-redin-earth-700">{result.language.family}</span>
              </div>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-700">
              <strong>Prototipo:</strong> Este resultado es una simulacion. La identificacion linguistica
              por inteligencia artificial esta en desarrollo y proximamente utilizara modelos entrenados
              con audios reales de las variantes de Oaxaca.
            </p>
          </div>

          <button
            onClick={handleRequestInterpreter}
            className="w-full py-3 px-6 bg-redin-forest-600 hover:bg-redin-forest-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            <UserPlus size={20} />
            Solicitar interprete de {result.variant.name}
          </button>

          <button
            onClick={resetAll}
            className="w-full py-2 text-sm text-redin-earth-500 hover:text-redin-earth-700 transition-colors"
          >
            Analizar otro audio
          </button>
        </div>
      )}
    </div>
  );
}
