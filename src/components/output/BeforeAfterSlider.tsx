import { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { MousePointer2 } from 'lucide-react';

interface Props {
    beforeImage: string; // data URI
    afterImage: string;  // data URI
}

export function BeforeAfterSlider({ beforeImage, afterImage }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);
    const dragX = useMotionValue(0);

    // Default slider to 50%
    useEffect(() => {
        if (containerRef.current) {
            const width = containerRef.current.offsetWidth;
            setContainerWidth(width);
            dragX.set(width / 2);
        }
    }, [dragX]);

    // Update width on resize
    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                const width = containerRef.current.offsetWidth;
                setContainerWidth(width);
                // Ensure thumb stays within bounds
                const currentX = dragX.get();
                if (currentX > width) dragX.set(width);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [dragX]);

    // Calculate clip path based on drag position
    const clipPath = useTransform(dragX, (x) => `inset(0 0 0 ${x}px)`);

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full min-h-[400px] select-none overflow-hidden rounded-xl shadow-2xl bg-zinc-900 border border-zinc-800"
        >
            {/* Background/Before Image */}
            <img
                src={beforeImage}
                alt="Original Reference"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-50 blur-sm brightness-50"
            />

            <div className="absolute inset-0 flex items-center justify-center p-2">
                <img
                    src={beforeImage}
                    alt="Original Reference"
                    className="w-full h-full object-contain pointer-events-none"
                />
            </div>

            {/* Foreground/After Image (Clipped) */}
            <motion.div
                className="absolute inset-0 flex items-center justify-center p-2"
                style={{ clipPath }}
            >
                <img
                    src={afterImage}
                    alt="AI Generated Output"
                    className="w-full h-full object-contain pointer-events-none"
                />
            </motion.div>

            {/* Draggable Handle */}
            <motion.div
                className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-10 hover:w-1.5 transition-[width] outline-none"
                style={{ x: dragX }}
                drag="x"
                dragConstraints={{ left: 0, right: containerWidth }}
                dragElastic={0}
                dragMomentum={false}
            >
                {/* Thumb */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg border border-zinc-200">
                    <div className="flex items-center gap-0.5 text-zinc-400">
                        <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor">
                            <path d="M7 1L2 6l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor">
                            <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </div>
            </motion.div>

            {/* Labels */}
            <div className="absolute top-4 left-4 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-medium text-white pointer-events-none z-20 uppercase tracking-widest border border-white/10">
                Original
            </div>
            <div className="absolute top-4 right-4 px-2 py-1 bg-violet-600/80 backdrop-blur-md rounded text-[10px] font-medium text-white pointer-events-none z-20 uppercase tracking-widest border border-violet-400/20">
                Generated
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-medium text-white/50 pointer-events-none z-20 items-center justify-center flex gap-1.5">
                <MousePointer2 size={12} /> Drag to compare
            </div>
        </div>
    );
}
