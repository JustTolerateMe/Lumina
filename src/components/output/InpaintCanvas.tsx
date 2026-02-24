import { useState, useRef, useEffect, useCallback } from 'react';
import { Eraser, Pen, Undo, Trash2 } from 'lucide-react';

interface Props {
    imageSrc: string; // The base generated image (data URI)
    onMaskChange: (maskBase64: string | null) => void;
    isDrawingMode: boolean;
}

interface Point { x: number; y: number }
interface Stroke {
    points: Point[];
    size: number;
    isEraser: boolean;
}

export function InpaintCanvas({ imageSrc, onMaskChange, isDrawingMode }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const bgCanvasRef = useRef<HTMLCanvasElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    const displayCanvasRef = useRef<HTMLCanvasElement>(null);

    const [isDrawing, setIsDrawing] = useState(false);
    const [brushSize, setBrushSize] = useState(30);
    const [isEraser, setIsEraser] = useState(false);
    const [history, setHistory] = useState<Stroke[]>([]);
    const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);

    const [imgDim, setImgDim] = useState({ w: 0, h: 0 });

    // Load image and setup dimensions
    useEffect(() => {
        const img = new Image();
        img.onload = () => {
            setImgDim({ w: img.width, h: img.height });

            // Draw background once
            if (bgCanvasRef.current) {
                bgCanvasRef.current.width = img.width;
                bgCanvasRef.current.height = img.height;
                const ctx = bgCanvasRef.current.getContext('2d');
                if (ctx) ctx.drawImage(img, 0, 0);
            }

            // Setup mask canvas matches original resolution
            if (maskCanvasRef.current) {
                maskCanvasRef.current.width = img.width;
                maskCanvasRef.current.height = img.height;
            }

            // Setup display canvas to match the original resolution
            if (displayCanvasRef.current) {
                displayCanvasRef.current.width = img.width;
                displayCanvasRef.current.height = img.height;
            }
        };
        img.src = imageSrc;
    }, [imageSrc]); // removed redrawDisplay dependency loop

    // Drawing Mechanics
    const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent): Point | null => {
        if (!displayCanvasRef.current || imgDim.w === 0) return null;
        const rect = displayCanvasRef.current.getBoundingClientRect();
        let clientX, clientY;

        if ('touches' in e && e.touches?.[0]) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        // Exact scaling factor from CSS visual size mapped back to intrinsic pixel resolution
        const scaleX = imgDim.w / rect.width;
        const scaleY = imgDim.h / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawingMode) return;
        e.preventDefault();
        const point = getCoordinates(e);
        if (!point) return;

        setIsDrawing(true);
        setCurrentStroke({
            points: [point],
            size: brushSize,
            isEraser
        });
    };

    const draw = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        if (!isDrawing || !currentStroke || !isDrawingMode) return;
        // Don't preventDefault here heavily or it might lock UI, but we need it to stop scrolling
        if (e.cancelable) e.preventDefault();
        const point = getCoordinates(e);
        if (!point) return;

        setCurrentStroke(prev => {
            if (!prev) return null;
            return { ...prev, points: [...prev.points, point] };
        });
    };

    const stopDrawing = () => {
        if (!isDrawing || !currentStroke) return;
        setIsDrawing(false);
        setHistory(prev => [...prev, currentStroke]);
        setCurrentStroke(null);
    };

    useEffect(() => {
        if (isDrawing) {
            window.addEventListener('mouseup', stopDrawing);
            window.addEventListener('touchend', stopDrawing);
            window.addEventListener('mousemove', draw, { passive: false });
            window.addEventListener('touchmove', draw, { passive: false });
        }
        return () => {
            window.removeEventListener('mouseup', stopDrawing);
            window.removeEventListener('touchend', stopDrawing);
            window.removeEventListener('mousemove', draw);
            window.removeEventListener('touchmove', draw);
        };
    }, [isDrawing, currentStroke]);

    // Master Redraw function
    const redrawAll = useCallback(() => {
        if (!maskCanvasRef.current) return;
        const ctx = maskCanvasRef.current.getContext('2d');
        if (!ctx) return;

        // Clear mask
        ctx.clearRect(0, 0, imgDim.w, imgDim.h);
        ctx.fillStyle = 'black'; // Background of mask
        ctx.fillRect(0, 0, imgDim.w, imgDim.h);

        const allStrokes = [...history, ...(currentStroke ? [currentStroke] : [])];

        allStrokes.forEach(stroke => {
            ctx.beginPath();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = stroke.size;

            // If erasing, we actually just draw black on the mask
            // If drawing, we draw white on the mask
            ctx.strokeStyle = stroke.isEraser ? 'black' : 'white';

            stroke.points.forEach((point, i) => {
                if (i === 0) {
                    ctx.moveTo(point.x, point.y);
                    ctx.lineTo(point.x, point.y); // Draw a dot
                } else {
                    ctx.lineTo(point.x, point.y);
                }
            });
            ctx.stroke();
        });

        redrawDisplay();
        exportMask();
    }, [history, currentStroke, imgDim]);

    useEffect(() => {
        if (imgDim.w > 0) redrawAll();
    }, [redrawAll, imgDim.w]);

    // Redraw the actual visible display
    const redrawDisplay = () => {
        if (!displayCanvasRef.current || !bgCanvasRef.current || !maskCanvasRef.current) return;
        const ctx = displayCanvasRef.current.getContext('2d');
        if (!ctx) return;

        const w = imgDim.w;
        const h = imgDim.h;

        // 1. Draw original base image
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(bgCanvasRef.current, 0, 0, w, h);

        // 2. Draw overlay
        if (history.length > 0 || currentStroke) {
            // Create a temporary canvas to colorize the mask
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = imgDim.w;
            tempCanvas.height = imgDim.h;
            const tCtx = tempCanvas.getContext('2d');
            if (tCtx) {
                // We only want to draw the WHITE parts of the mask as a semi-transparent purple overlay
                tCtx.drawImage(maskCanvasRef.current, 0, 0);
                // Replace black background with transparent
                tCtx.globalCompositeOperation = 'source-in';
                tCtx.fillStyle = 'rgba(139, 92, 246, 0.4)'; // violet-500 with opacity
                tCtx.fillRect(0, 0, imgDim.w, imgDim.h);

                // Draw the colored mask over the image
                ctx.globalAlpha = 0.5;
                ctx.drawImage(maskCanvasRef.current, 0, 0, w, h); // Draw raw stroke pattern for bright white line
                ctx.globalAlpha = 1;
                ctx.drawImage(tempCanvas, 0, 0, w, h); // Draw purple fill
            }
        }
    };

    const exportMask = () => {
        if (!maskCanvasRef.current || (history.length === 0 && !currentStroke)) {
            onMaskChange(null);
            return;
        }

        // Check if empty mask
        const hasWhitePixels = history.some(s => !s.isEraser) || (currentStroke && !currentStroke.isEraser);
        if (!hasWhitePixels) {
            onMaskChange(null);
            return;
        }

        // Export raw mask (Black default, White strokes)
        const base64 = maskCanvasRef.current.toDataURL('image/png').split(',')[1];
        onMaskChange(base64 ?? null);
    };

    const handleUndo = () => {
        setHistory(prev => prev.slice(0, -1));
    };

    const handleClear = () => {
        setHistory([]);
    };

    return (
        <div className="w-full h-full flex flex-col overflow-hidden">
            {/* Hidden processing canvases */}
            <canvas ref={bgCanvasRef} className="hidden" />
            <canvas ref={maskCanvasRef} className="hidden" />

            {/* Main Drawing Area */}
            <div
                ref={containerRef}
                className={`flex-1 flex items-center justify-center overflow-hidden bg-zinc-900/50 rounded-xl border relative ${isDrawingMode ? 'cursor-crosshair border-violet-500/50 hover:border-violet-500 touch-none' : 'border-zinc-800'}`}
            >
                <canvas
                    ref={displayCanvasRef}
                    onMouseDown={startDrawing}
                    onTouchStart={startDrawing}
                    className="shadow-2xl max-w-full max-h-full"
                    style={{ objectFit: 'contain' }}
                />

                {!isDrawingMode && (
                    <img
                        src={imageSrc}
                        alt="Generated Output"
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none p-6"
                    />
                )}
            </div>

            {/* Toolbar */}
            {isDrawingMode && (
                <div className="mt-4 p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between animate-in slide-in-from-bottom-2 fade-in">
                    <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded-lg">
                        <button
                            onClick={() => setIsEraser(false)}
                            className={`p-2 rounded-md flex items-center gap-2 text-sm transition-colors ${!isEraser ? 'bg-violet-600/20 text-violet-400' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
                        >
                            <Pen size={14} /> Paint
                        </button>
                        <button
                            onClick={() => setIsEraser(true)}
                            className={`p-2 rounded-md flex items-center gap-2 text-sm transition-colors ${isEraser ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
                        >
                            <Eraser size={14} /> Erase
                        </button>
                    </div>

                    <div className="flex items-center gap-4 flex-1 max-w-xs mx-6">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Size</span>
                        <input
                            type="range"
                            min="5"
                            max="150"
                            value={brushSize}
                            onChange={(e) => setBrushSize(parseInt(e.target.value))}
                            className="flex-1 accent-violet-500 h-1.5 bg-zinc-800 rounded-full appearance-none outline-none"
                        />
                        <span className="text-xs text-zinc-400 w-6 text-right">{brushSize}px</span>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleUndo}
                            disabled={history.length === 0}
                            className="p-2 bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-zinc-400 transition-colors"
                            title="Undo"
                        >
                            <Undo size={14} />
                        </button>
                        <button
                            onClick={handleClear}
                            disabled={history.length === 0}
                            className="p-2 bg-zinc-950 hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-zinc-400 transition-colors"
                            title="Clear All"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
