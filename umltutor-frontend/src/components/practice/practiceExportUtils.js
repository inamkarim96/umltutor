import { exportModelAsJSON } from '../../utils/exportUtils';

const SECTION_SELECTORS = {
    usecase: '[data-testid="usecase-canvas"]',
    description: '[data-testid="usecase-canvas"]', // Description uses same canvas as usecase
    ssd: '[data-testid="ssd-canvas"]',
    'class-diagram': '[data-practice-canvas="class-diagram"]',
    'sequence-diagram': '[data-testid="sequence-canvas"]',
};

// Diagram format options
export const EXPORT_FORMATS = {
    png: { mime: 'image/png', ext: 'png', quality: 1.0 },
    jpg: { mime: 'image/jpeg', ext: 'jpg', quality: 0.95 },
    svg: { mime: 'image/svg+xml', ext: 'svg', quality: 1.0 },
};

// Quality presets
export const QUALITY_PRESETS = {
    draft: { pixelRatio: 1, suffix: 'draft' },
    standard: { pixelRatio: 2, suffix: 'std' },
    high: { pixelRatio: 3, suffix: 'hd' },
    print: { pixelRatio: 4, suffix: 'print' },
};

export const exportPracticeModelJson = (model) => {
    exportModelAsJSON('practice', model);
};

/**
 * Exports a practice diagram section to an image file
 * @param {string} section - Section name (usecase, ssd, class-diagram, etc.)
 * @param {React.RefObject} containerRef - Ref to the practice workbench container
 * @param {Object} options - Export options
 * @param {string} options.format - 'png' | 'jpg' | 'svg'
 * @param {string} options.quality - 'draft' | 'standard' | 'high' | 'print'
 * @param {boolean} options.includeBackground - Whether to include white background
 * @param {Function} options.onProgress - Progress callback (0-1)
 * @param {string} options.customFilename - Custom filename (without extension)
 */
export const exportPracticeSection = async (section, containerRef, options = {}) => {
    const {
        format = 'png',
        quality = 'standard',
        includeBackground = true,
        onProgress,
        customFilename,
    } = options;

    const root = containerRef?.current;
    if (!root) throw new Error('Practice editor not ready');

    const containerSelector = SECTION_SELECTORS[section];
    const containerElement = containerSelector ? root.querySelector(containerSelector) : null;
    if (!containerElement) throw new Error(`Container not found for ${section}.`);

    // Target ONLY the ReactFlow diagram area (excludes header bar + toolbar)
    const diagramElement = containerElement.querySelector('.react-flow') || containerElement.querySelector('[class*="react-flow"]');
    if (!diagramElement) {
        console.error('[PracticeExport] ReactFlow diagram element not found');
        throw new Error(`Diagram area not found for ${section}.`);
    }

    onProgress?.(0.2);

    const formatConfig = EXPORT_FORMATS[format];
    const qualityConfig = QUALITY_PRESETS[quality];

    if (!formatConfig) throw new Error(`Unsupported format: ${format}`);
    if (!qualityConfig) throw new Error(`Unsupported quality: ${quality}`);

    let canvas = null;

    try {
        const { toCanvas, toBlob } = await import('html-to-image');
        
        onProgress?.(0.4);

        // For SVG format, use direct SVG extraction
        if (format === 'svg') {
            const svgElement = diagramElement.querySelector('.react-flow__svg') || diagramElement.querySelector('svg');
            if (!svgElement) throw new Error('SVG canvas not found in diagram');

            const serializer = new XMLSerializer();
            let source = serializer.serializeToString(svgElement);
            if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
                source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
            }

            onProgress?.(0.8);
            return downloadBlob(
                new Blob([source], { type: formatConfig.mime }),
                section,
                formatConfig.ext,
                customFilename
            );
        }

        // For raster formats (PNG/JPG)
        onProgress?.(0.4);
        canvas = await toCanvas(diagramElement, {
            backgroundColor: includeBackground ? '#ffffff' : undefined,
            pixelRatio: qualityConfig.pixelRatio,
            cacheBust: false,
            skipFonts: false,
            imagePlaceholder: '',
        });

        onProgress?.(0.8);

        if (!canvas) throw new Error('Failed to render diagram');

        // Convert canvas to blob
        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob(
                (b) => b ? resolve(b) : reject(new Error('Canvas to blob failed')),
                formatConfig.mime,
                formatConfig.quality
            );
        });

        onProgress?.(0.9);
        return downloadBlob(blob, section, formatConfig.ext, customFilename);

    } catch (err) {
        console.error('[PracticeExport] Export failed:', err);
        throw new Error(`Export failed: ${err.message}. Make sure the diagram has content.`);
    }
};

/**
 * Downloads a blob as a file
 */
function downloadBlob(blob, section, ext, customFilename) {
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = customFilename || `practice-${section}-${timestamp}`;
    const filename = `${baseName}.${ext}`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { filename, size: blob.size };
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use exportPracticeSection instead
 */
export const exportPracticeSectionJpg = async (section, containerRef) => {
    return exportPracticeSection(section, containerRef, {
        format: 'jpg',
        quality: 'standard',
    });
};
