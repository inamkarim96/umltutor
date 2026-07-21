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

    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 1.5,
        useCORS: true,
        logging: false,
    });

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/jpeg', 0.92);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `practice-${section}-${timestamp}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
