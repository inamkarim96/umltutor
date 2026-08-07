import { exportModelAsJSON } from '../../utils/exportUtils';

const SECTION_SELECTORS = {
    usecase: '[data-testid="usecase-canvas"]',
    description: '[data-description-id]',
    ssd: '[data-testid="ssd-card"]',
    'class-diagram': '[data-practice-canvas="class-diagram"]',
    'sequence-diagram': '[data-testid="sequence-card"]',
};

export const exportPracticeModelJson = (model) => {
    exportModelAsJSON('practice', model);
};

export const exportPracticeSectionJpg = async (section, containerRef) => {
    const root = containerRef?.current;
    if (!root) throw new Error('Practice editor not ready');

    const selector = SECTION_SELECTORS[section];
    const element = selector ? root.querySelector(selector) : null;
    if (!element) throw new Error(`Nothing to export for ${section}. Add content first.`);

    let canvas = null;
    const svgElement = element.querySelector('svg.react-flow__svg');

    if (svgElement) {
        try {
            const serializer = new XMLSerializer();
            let source = serializer.serializeToString(svgElement);
            if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
                source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
            }

            const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const img = new Image();

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = url;
            });

            canvas = document.createElement('canvas');
            canvas.width = Math.round((element.clientWidth || 800) * 1.5);
            canvas.height = Math.round((element.clientHeight || 600) * 1.5);

            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
        } catch (svgErr) {
            console.warn('[PracticeExport] Direct SVG export fallback:', svgErr);
        }
    }

    if (!canvas) {
        const { toCanvas } = await import('html-to-image');
        canvas = await toCanvas(element, {
            backgroundColor: '#ffffff',
            pixelRatio: 1.5,
            cacheBust: false,
            skipFonts: true,
        });
    }

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/jpeg', 0.9);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `practice-${section}-${timestamp}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
