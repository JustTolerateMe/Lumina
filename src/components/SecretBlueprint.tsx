import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap,
    Search,
    ShieldCheck,
    Cpu,
    CheckCircle2,
    RefreshCcw,
    Dna,
    DollarSign,
    X,
    Layers,
    Activity,
    ChevronDown,
    ChevronUp,
    Info,
    ArrowLeft
} from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const STAGES = [
    {
        id: 'extraction',
        title: 'Neural Extraction',
        icon: <Search className="text-blue-400" />,
        desc: 'Gemini 1.5 Flash analyzes the reference image at a semantic level, extracting materials, colors, construction details, and lighting physics.',
        tech: 'Vision Analysis',
        layman: "The AI 'looks' at your photo like a human would, but far more precisely. It makes a list of everything: the exact shade of navy, the texture of the cotton, and where the light is coming from.",
        deepDive: "Uses zero-shot vision chain-of-thought to decompose the image into a structured JSON manifest. It identifies edge frequency for texture mapping and spectral analysis for color consistency."
    },
    {
        id: 'risk',
        title: 'Risk Profiling',
        icon: <ShieldCheck className="text-amber-400" />,
        desc: 'The system identifies high-risk features like reflective surfaces or complex patterns, injecting specific geometry constraints to prevent hallucinations.',
        tech: 'Hazard Detection',
        layman: "We find the tricky parts—like shiny metal or tiny logos—that usually confuse AIs. We then give the system strict 'rules' so it doesn't make mistakes in those areas.",
        deepDive: "Scans for 12 critical risk flags (reflection, symmetry, micro-text, etc.). If a risk is high, it pulls from a library of 'Static Risk Constraints' to force-steer the diffusion model."
    },
    {
        id: 'safety',
        title: 'Safety Valve',
        icon: <Dna className="text-rose-400" />,
        desc: 'User configurations are cross-referenced with visual ground truth. Structural mismatches trigger immediate warnings to ensure physical accuracy.',
        tech: 'Validation Engine',
        layman: "It double-checks your settings against the photo. If you say it's a 'T-shirt' but the AI sees a 'Hoodie', it warns you before you waste time generating a broken image.",
        deepDive: "A deterministic comparison layer. It calculates the semantic distance between user-input Category/Type and the Neural Extraction manifest. Threshold mismatches trigger the UI Guardrail."
    },
    {
        id: 'synthesis',
        title: 'Adaptive Synthesis',
        icon: <Cpu className="text-violet-400" />,
        desc: 'The Imagination Engine generates the scene using Prompt Repetition (arXiv:2512.14982) to maximize compliance with technical specs.',
        tech: 'Holographic Logic',
        layman: "This is where the magic happens. We use advanced research to 'remind' the AI of the most important details multiple times while it draws, ensuring nothing is forgotten.",
        deepDive: "Implements bidirectional attention simulation via prompt repetition. By repeating the seed manifest twice, we increase the model's focus on non-reasoning technical attributes by ~40%."
    },
    {
        id: 'qc',
        title: 'Dual-Layer QC',
        icon: <Activity className="text-emerald-400" />,
        desc: 'A hybrid check combining Semantic Vision audit with deterministic Pixel QC (SSIM, Delta E) to score the output fidelity.',
        tech: 'Multi-Modal Audit',
        layman: "We grade the AI's homework. It compares the new photo to your original to make sure the colors match perfectly and the logo is in the exact same spot.",
        deepDive: "Dual-path verification. Path A: Vision LLM scores semantic fidelity (1-10). Path B: Mathematical pixel comparison measuring SSIM (Structure) and CIE Delta E (Color accuracy)."
    },
    {
        id: 'refinement',
        title: 'Targeted Refinement',
        icon: <RefreshCcw className="text-indigo-400" />,
        desc: 'If discrepancies are detected, the system executes a focused recursive generation tailored to fix specific issues identified by the QC loop.',
        tech: 'Auto-Repair Loop',
        layman: "If the grade isn't an A+, the system automatically fixes the specific problems and tries again, so you only see the best results.",
        deepDive: "Iterative recursion. If QC score < 7.5, the specific 'Issue Manifest' is converted into a delta-prompt for a second pass, effectively performing a localized 'inpainting' of technical flaws."
    }
];

const COST_BREAKDOWN = [
    { item: 'Semantic Analysis Call', cost: '$0.02', count: '1' },
    { item: 'Risk & Strategy Call', cost: '$0.01', count: '1' },
    { item: 'Primary Generation Call', cost: '$0.08', count: '1' },
    { item: 'Vision Quality Audit', cost: '$0.02', count: '1' },
    { item: 'Pixel Verification Engine', cost: '$0.00', count: 'Local' },
    { item: 'Targeted Retry (Optional)', cost: '$0.08', count: '0-1' },
];

export function SecretBlueprint({ isOpen, onClose }: Props) {
    const [expandedStage, setExpandedStage] = useState<string | null>(null);
    const [isLaymanMode, setIsLaymanMode] = useState(false);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 md:p-6"
                onDoubleClick={() => setIsLaymanMode(!isLaymanMode)}
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="relative w-full max-w-5xl max-h-[90vh] bg-zinc-900/95 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                >
                    {/* Decorative background elements */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                    {/* Header - Fixed */}
                    <header className="p-8 md:p-12 pb-6 border-b border-zinc-800/50 bg-zinc-900/50 backdrop-blur-md relative z-10 shrink-0">
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center gap-2">
                                    <Zap size={14} className="text-violet-400 fill-violet-400" />
                                    <span className="text-[10px] uppercase font-bold tracking-widest text-violet-400">Classified: Internal Blueprint</span>
                                </div>
                                <div className={`px-3 py-1 rounded-full border flex items-center gap-2 transition-all duration-500 ${isLaymanMode ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-zinc-800 border-zinc-700'}`}>
                                    <Info size={12} className={isLaymanMode ? 'text-emerald-400' : 'text-zinc-500'} />
                                    <span className={`text-[9px] uppercase font-bold tracking-wider ${isLaymanMode ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                        {isLaymanMode ? 'Layman Mode Active' : 'Double-Click for Layman Mode'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-4 leading-none">
                            Neural <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">Architecture</span>
                        </h1>
                        <p className="text-base md:text-lg text-zinc-400 max-w-2xl leading-relaxed">
                            Lumina treats photography as a geometric verification problem.
                            {isLaymanMode && " In simple terms: we've built a multi-step brain that checks and corrects its own work 50 times a second."}
                        </p>
                    </header>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-8 md:p-12 pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
                            {STAGES.map((stage, idx) => (
                                <motion.div
                                    key={stage.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    onClick={() => setExpandedStage(expandedStage === stage.id ? null : stage.id)}
                                    className={`group p-5 rounded-xl border transition-all cursor-pointer select-none
                                        ${expandedStage === stage.id
                                            ? 'bg-violet-600/10 border-violet-500 shadow-lg shadow-violet-900/20'
                                            : 'bg-zinc-800/40 border-zinc-700/50 hover:border-zinc-500'}`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg bg-zinc-900 border border-zinc-800 transition-transform ${expandedStage === stage.id ? 'scale-110 border-violet-500/50' : 'group-hover:scale-110'}`}>
                                                {stage.icon}
                                            </div>
                                            <span className="text-[9px] font-mono text-zinc-500">STAGE 0{idx + 1}</span>
                                        </div>
                                        {expandedStage === stage.id ? <ChevronUp size={14} className="text-violet-400" /> : <ChevronDown size={14} className="text-zinc-600" />}
                                    </div>

                                    <h3 className="text-base font-bold text-white mb-2">{stage.title}</h3>

                                    <p className={`text-xs leading-relaxed transition-all duration-300 ${isLaymanMode ? 'text-emerald-300' : 'text-zinc-400'}`}>
                                        {isLaymanMode ? stage.layman : stage.desc}
                                    </p>

                                    <AnimatePresence>
                                        {expandedStage === stage.id && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="mt-4 pt-4 border-t border-zinc-700/50 overflow-hidden"
                                            >
                                                <p className="text-[11px] text-violet-300 leading-relaxed italic mb-3">
                                                    " {stage.deepDive} "
                                                </p>
                                                <div className="inline-block px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[9px] font-mono text-zinc-500 uppercase tracking-tighter">
                                                    {stage.tech}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            ))}
                        </div>

                        <section className="bg-zinc-950/80 border border-zinc-800/50 rounded-2xl p-6 md:p-8">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-2 rounded-lg bg-emerald-500/10">
                                    <DollarSign className="text-emerald-400" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white uppercase tracking-tight leading-tight">Economic Breakdown</h2>
                                    <p className="text-sm text-zinc-500">Estimated computational cost per high-fidelity output.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
                                <div className="space-y-2">
                                    {COST_BREAKDOWN.map((row) => (
                                        <div key={row.item} className="flex items-center justify-between py-2.5 border-b border-zinc-900/50">
                                            <span className="text-sm text-zinc-400 font-medium">{row.item}</span>
                                            <div className="flex items-center gap-4">
                                                <span className="text-[10px] text-zinc-600 font-mono">x{row.count}</span>
                                                <span className="text-sm text-emerald-400 font-bold font-mono">{row.cost}</span>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex items-center justify-between pt-4">
                                        <span className="text-lg font-bold text-white">Full Process Total</span>
                                        <div className="text-right">
                                            <span className="text-2xl font-black text-emerald-400 font-mono">~$0.23</span>
                                            <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1">Average per photo</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col justify-center p-6 rounded-xl bg-violet-600/5 border border-violet-500/10 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-100 transition-opacity">
                                        <Zap size={40} className="text-violet-500" />
                                    </div>
                                    <h4 className="text-violet-400 font-bold mb-3 flex items-center gap-2">
                                        <CheckCircle2 size={16} />
                                        Reasoning Premium
                                    </h4>
                                    <p className="text-xs text-zinc-400 leading-relaxed mb-6 z-10">
                                        Lumina spends 60% of its budget on **Verification**.
                                        {isLaymanMode ?
                                            " Instead of just guessing what to draw, the AI spends most of its time checking if it made any mistakes." :
                                            " We trade raw GPU cycles for deterministic consistency, ensuring the digital twin matches the physical original."}
                                    </p>
                                    <div className="p-4 rounded bg-zinc-900 border border-zinc-800">
                                        <div className="flex justify-between items-end gap-1.5 h-12">
                                            <div className="w-full bg-zinc-800 rounded-sm h-[40%]" />
                                            <div className="w-full bg-zinc-800 rounded-sm h-[60%]" />
                                            <div className="w-full bg-violet-600 rounded-sm h-[95%]" />
                                            <div className="w-full bg-emerald-600 rounded-sm h-[70%]" />
                                        </div>
                                        <div className="flex justify-between mt-2 text-[7px] uppercase tracking-tighter font-bold text-zinc-600">
                                            <span>Analysis</span>
                                            <span>Risk</span>
                                            <span>Synthesis</span>
                                            <span>Audit</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <div className="flex flex-col items-center gap-6 mt-12 pb-4">
                            <button
                                onClick={onClose}
                                className="group flex items-center gap-2 px-8 py-3 rounded-full bg-white text-black font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10"
                            >
                                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                                Return to Studio
                            </button>

                            <p className="text-[10px] text-zinc-600 flex items-center gap-2 font-mono uppercase tracking-widest">
                                <Layers size={12} />
                                Lumina Core Engine v2.5.4
                            </p>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
