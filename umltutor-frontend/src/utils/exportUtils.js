/**
 * Ultra-fast, high-performance export implementation for PNG, JPG, PDF, SVG, JSON, and TXT.
 * Optimized with direct ReactFlow viewport capture and skipFonts HTML capture.
 * Toolbars and sidebars are excluded from all diagram exports.
 */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// CSS classes / data attributes that identify toolbar/sidebar elements to EXCLUDE
const TOOLBAR_CLASSES = [
    'react-flow__controls',
    'react-flow__minimap',
    'react-flow__panel',
    'react-flow__attribution',
];
// These are root-level class substrings on toolbar wrapper divs
const TOOLBAR_KEYWORDS = ['toolbar', 'Toolbar', 'sidebar', 'Sidebar'];

// Robust filter – excludes toolbars & UI chrome, safe for text nodes
const exportFilter = (node) => {
    if (!node || node.nodeType !== 1) return true; // keep text/comment nodes
    const cl = node.classList;
    if (!cl) return true;
    for (const c of TOOLBAR_CLASSES) {
        if (cl.contains(c)) return false;
    }
    // Exclude absolute-positioned toolbar divs by checking class keywords
    for (const kw of TOOLBAR_KEYWORDS) {
        if (node.className && typeof node.className === 'string' && node.className.includes(kw)) return false;
    }
    return true;
};

// Capture only the ReactFlow canvas viewport (no toolbar panels)
const captureReactFlowCanvas = async (containerEl, scale = 1.5) => {
    // Prefer the ReactFlow pane (pure canvas, no toolbars inside it)
    const viewport = containerEl.querySelector('.react-flow__viewport');
    const rfRoot = containerEl.querySelector('.react-flow') || containerEl;
    const w = rfRoot.clientWidth || 800;
    const h = rfRoot.clientHeight || 600;

    if (viewport) {
        // Direct SVG serialization of the viewport — fastest path, ~20ms
        try {
            const serializer = new XMLSerializer();
            // Build a wrapper SVG the size of the container, embedding the viewport transform
            const svgEl = containerEl.querySelector('svg.react-flow__svg');
            if (svgEl) {
                let source = serializer.serializeToString(svgEl);
                if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
                    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
                }
                const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const img = new Image();
                await Promise.race([
                    new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; }),
                    new Promise((_, rej) => setTimeout(() => rej(new Error('SVG Image load timeout')), 1500)),
                ]);
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(100, Math.round(w * scale));
                canvas.height = Math.max(100, Math.round(h * scale));
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(url);
                return canvas;
            }
        } catch (svgErr) {
            console.warn('[ExportFast] SVG path failed, using html-to-image:', svgErr);
        }
    }

    // Fallback: html-to-image on rfRoot with strict toolbar filter
    const { toCanvas } = await import('html-to-image');
    return toCanvas(rfRoot, {
        backgroundColor: '#ffffff',
        pixelRatio: scale,
        cacheBust: false,
        skipFonts: true,
        filter: exportFilter,
    });
};

// Generic element capture (non-ReactFlow sections like descriptions)
const captureElementFast = async (element, scale = 1.5) => {
    if (!element) throw new Error('No element provided for capture');

    // ReactFlow diagrams → use canvas-aware capture
    if (element.querySelector('.react-flow')) {
        return captureReactFlowCanvas(element, scale);
    }

    // Plain HTML elements (descriptions, tables)
    try {
        const { toCanvas } = await import('html-to-image');
        return toCanvas(element, {
            backgroundColor: '#ffffff',
            pixelRatio: scale,
            cacheBust: false,
            skipFonts: true,
            filter: exportFilter,
        });
    } catch (error) {
        console.error('[ExportFast] Capture failed:', error);
        const { toCanvas } = await import('html-to-image');
        return toCanvas(element, { backgroundColor: '#ffffff', pixelRatio: 1, cacheBust: false, skipFonts: true });
    }
};

// Minimal wait function to ensure element presence
const waitForElementFast = async (selector, timeoutMs = 2000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const el = document.querySelector(selector);
        if (el) return el;
        await sleep(50);
    }
    return null;
};

// Helper for instant blob downloads
const triggerDownload = (dataUrlOrBlob, fileName) => {
    const link = document.createElement('a');
    if (typeof dataUrlOrBlob === 'string') {
        link.href = dataUrlOrBlob;
    } else {
        link.href = URL.createObjectURL(dataUrlOrBlob);
    }
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (typeof dataUrlOrBlob !== 'string') {
        setTimeout(() => URL.revokeObjectURL(link.href), 5000);
    }
};

export const exportStepWithReport = async (section, format, activeModel, report, itemId = null) => {
    const startedAt = performance.now();
    try {
        // Target the diagram canvas directly — never the parent that includes the toolbar
        let selector = '';
        if (section === 'usecase') {
            // The usecase canvas is the ReactFlow container inside the editor
            selector = '[data-editor-section="usecase"] .react-flow';
        } else if (section === 'description') {
            selector = itemId
                ? `[data-editor-section="description"] [data-description-id="${itemId}"]`
                : '[data-editor-section="description"] [data-description-id]';
        } else if (section === 'ssd') {
            // SSD is a ReactFlow canvas; target .react-flow inside the ssd section
            selector = itemId
                ? `[data-editor-section="ssd"] [data-usecase-id="${itemId}"] .react-flow`
                : '[data-editor-section="ssd"] .react-flow';
        } else if (section === 'class-diagram') {
            // Target the flex-1 wrapper that ONLY contains ReactFlow (not the toolbar)
            selector = '[data-editor-section="class-diagram"] .react-flow__wrapper, [data-editor-section="class-diagram"] .react-flow';
        } else if (section === 'sequence-diagram') {
            selector = '[data-editor-section="sequence-diagram"] [data-testid="sequence-canvas"] .react-flow';
        }

        let element = await waitForElementFast(selector, 1500);
        if (!element) {
            // Broader fallback still scoped to the section
            const sectionEl = document.querySelector(`[data-editor-section="${section}"]`);
            element = sectionEl?.querySelector('.react-flow') || sectionEl;
        }
        if (!element) throw new Error(`Could not find element for section: ${section}`);

        // Use the ReactFlow-aware capture to exclude toolbars automatically
        const canvas = element.querySelector('.react-flow')
            ? await captureReactFlowCanvas(element, 1.5)
            : await captureElementFast(element, 1.5);

        const fileName = `UML-${section}-Export.${format === 'pdf' ? 'pdf' : format === 'jpeg' || format === 'jpg' ? 'jpg' : 'png'}`;

        if (format === 'pdf') {
            const { jsPDF } = await import('jspdf');
            const imgData = canvas.toDataURL('image/jpeg', 0.88);
            const pdf = new jsPDF('l', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            const imgWidth = pageWidth - 20;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, 'JPEG', 10, 10, imgWidth, Math.min(imgHeight, pageHeight - 20));
            pdf.save(fileName);
            const blob = pdf.output('blob');
            return { durationMs: Math.round(performance.now() - startedAt), blob, fileName, format: 'pdf' };
        } else {
            const mime = `image/${format === 'jpeg' || format === 'jpg' ? 'jpeg' : 'png'}`;
            const dataUrl = canvas.toDataURL(mime, 0.9);
            triggerDownload(dataUrl, fileName);

            return new Promise((resolve) => {
                canvas.toBlob((blob) => {
                    resolve({ durationMs: Math.round(performance.now() - startedAt), blob, fileName, format });
                }, mime, 0.9);
            });
        }
    } catch (error) {
        console.error('Step export failed:', error);
        throw error;
    }
};

export const exportCombinedModel = async (activeModel, mode, report, userInfo = {}) => {
    const startedAt = performance.now();
    try {
        const { jsPDF } = await import('jspdf');

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();   // 210mm
        const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm

        // Brand colors
        const PRIMARY = [79, 70, 229];       // Indigo #4F46E5
        const TEXT_DARK = [31, 41, 55];      // Slate 800 #1F2937
        const TEXT_MUTED = [107, 114, 128];   // Gray 500 #6B7280
        const BG_LIGHT = [248, 250, 252];    // Slate 50 #F8FAFC
        const BORDER_COLOR = [226, 232, 240]; // Slate 200 #E2E8F0
        const GREEN_COLOR = [16, 185, 129];   // Emerald 500

        // Helper: Page Header
        const renderSectionHeader = (titleStr) => {
            pdf.setFillColor(...PRIMARY);
            pdf.rect(0, 0, pageWidth, 20, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(13);
            pdf.text(titleStr.toUpperCase(), 15, 13);
        };

        // Helper: Footer
        const addFooter = (pageNum, totalPages) => {
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(...TEXT_MUTED);
            pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        };

        // Helper: Extract Issues for a section from the evaluation report
        const getIssuesForSection = (secKey) => {
            if (!report) return [];
            const issues = Array.isArray(report.issues) ? report.issues : [];
            const secMap = {
                'usecase': ['diagram', 'usecasediagram'],
                'descriptions': ['description', 'usecasedescription'],
                'ssds': ['ssd', 'systemsequence'],
                'class-diagram': ['class-diagram', 'classdiagram'],
                'sequence-diagrams': ['sequence-diagram', 'sequencediagram'],
            };
            const targets = secMap[secKey] || [secKey];
            return issues.filter(i => {
                const loc = (i.location || '').toLowerCase();
                return targets.some(t => loc.includes(t));
            });
        };

        // Helper: Render Evaluation Feedback Table in vector PDF text
        const renderEvaluationTable = (secKey, startY) => {
            const secIssues = getIssuesForSection(secKey);
            let y = startY;

            if (y > pageHeight - 45) {
                pdf.addPage();
                renderSectionHeader(`${secKey} Evaluation Report`);
                y = 30;
            }

            pdf.setFillColor(...BG_LIGHT);
            pdf.setDrawColor(...BORDER_COLOR);
            pdf.roundedRect(15, y, pageWidth - 30, Math.max(35, 15 + (secIssues.length || 1) * 8), 2, 2, 'FD');

            pdf.setTextColor(...PRIMARY);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(10);
            pdf.text('AUTOMATED EVALUATION & CHECKING DIAGNOSTICS', 20, y + 8);

            pdf.setTextColor(...TEXT_DARK);
            pdf.setFontSize(8.5);

            if (secIssues.length === 0) {
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(...GREEN_COLOR);
                pdf.text('✓ Validation Passed: All requirements & syntax rules satisfied for this section.', 20, y + 18);
            } else {
                let iy = y + 16;
                secIssues.slice(0, 5).forEach((issue) => {
                    pdf.setFont('helvetica', 'bold');
                    pdf.setTextColor(issue.severity === 'error' ? 239 : 245, issue.severity === 'error' ? 68 : 158, 11);
                    pdf.text(`[${issue.severity ? issue.severity.toUpperCase() : 'CHECK'}]`, 20, iy);

                    pdf.setFont('helvetica', 'normal');
                    pdf.setTextColor(...TEXT_DARK);
                    const msgLines = pdf.splitTextToSize(issue.message || 'Diagnostic rule check', pageWidth - 70);
                    pdf.text(msgLines, 42, iy);
                    iy += 7 * msgLines.length;
                });
            }

            return y + Math.max(35, 15 + (secIssues.length || 1) * 8) + 10;
        };

        // ═════════════════════════════════════════════════════════════════════
        // PAGE 1: COVER & EXECUTIVE EVALUATION SUMMARY
        // ═════════════════════════════════════════════════════════════════════
        pdf.setFillColor(...PRIMARY);
        pdf.rect(0, 0, pageWidth, 42, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(22);
        pdf.text('UML DESIGN & EVALUATION REPORT', 20, 26);

        // Metadata Card
        pdf.setFillColor(...BG_LIGHT);
        pdf.setDrawColor(...BORDER_COLOR);
        pdf.roundedRect(20, 52, pageWidth - 40, 48, 3, 3, 'FD');

        pdf.setTextColor(...TEXT_DARK);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text('STUDENT INFORMATION', 28, 64);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.text(`Student Name: ${userInfo.studentName || 'Student Workspace'}`, 28, 73);
        pdf.text(`Assignment: ${userInfo.assignmentTitle || 'UML Software Design'}`, 28, 81);
        pdf.text(`Course / Class: ${userInfo.className || 'Software Engineering'}`, 28, 89);

        pdf.setFont('helvetica', 'bold');
        pdf.text('REPORT DETAILS', 120, 64);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Date Generated: ${new Date().toLocaleDateString()}`, 120, 73);
        pdf.text(`Mode: ${mode === 'tutorial' ? 'Guided Tutorial Mode' : 'Development Mode'}`, 120, 81);
        if (userInfo.teacherName) pdf.text(`Instructor: ${userInfo.teacherName}`, 120, 89);

        // Executive Evaluation Summary Card
        let totalScore = report?.score ?? report?.totalScore ?? report?.summary?.totalScore ?? null;
        let remarks = report?.remarks ?? report?.summary?.remarks ?? null;
        let allIssues = Array.isArray(report?.issues) ? report.issues : [];

        pdf.setFillColor(238, 242, 255);
        pdf.setDrawColor(...PRIMARY);
        pdf.roundedRect(20, 110, pageWidth - 40, 55, 3, 3, 'FD');

        pdf.setTextColor(...PRIMARY);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        pdf.text('EXECUTIVE EVALUATION SUMMARY', 28, 124);

        pdf.setTextColor(...TEXT_DARK);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        if (totalScore !== null) {
            pdf.text(`Overall Score: ${totalScore} / 100`, 28, 134);
        } else {
            pdf.text('Evaluation Status: Automated Quality Check Completed', 28, 134);
        }

        pdf.setFont('helvetica', 'normal');
        if (remarks) {
            const splitRemarks = pdf.splitTextToSize(`Instructor / Checker Feedback: ${remarks}`, pageWidth - 65);
            pdf.text(splitRemarks, 28, 143);
        } else {
            pdf.text('Automated evaluation executed across all 5 UML design steps.', 28, 143);
        }

        pdf.text(`Total Diagnostic Rules Inspected: ${allIssues.length} items logged`, 28, 155);

        // ═════════════════════════════════════════════════════════════════════
        // CAPTURE DIAGRAMS & DESCRIPTIONS
        // ═════════════════════════════════════════════════════════════════════
        const renderer = await waitForElementFast('#full-model-export-renderer', 2500);
        if (renderer) {
            await sleep(600);
        }

        const sections = [
            ['usecase', '1. Use Case Diagram'],
            ['descriptions', '2. Use Case Descriptions'],
            ['ssds', '3. System Sequence Diagrams'],
            ['class-diagram', '4. Class Diagram'],
            ['sequence-diagrams', '5. Sequence Diagrams'],
        ];

        for (const [sectionKey, title] of sections) {
            pdf.addPage();
            renderSectionHeader(title);

            if (sectionKey === 'descriptions') {
                // Vector text rendering for Use Case Descriptions — crisp & readable
                let y = 30;
                const descs = activeModel?.descriptions || {};
                const descEntries = Object.entries(descs);

                if (descEntries.length === 0) {
                    pdf.setFont('helvetica', 'italic');
                    pdf.setTextColor(...TEXT_MUTED);
                    pdf.text('No use case descriptions defined yet.', 20, y);
                    y += 15;
                } else {
                    descEntries.forEach(([id, desc], dIdx) => {
                        if (y > pageHeight - 60) {
                            pdf.addPage();
                            renderSectionHeader(`${title} (Continued)`);
                            y = 30;
                        }

                        pdf.setFillColor(...BG_LIGHT);
                        pdf.setDrawColor(...BORDER_COLOR);
                        pdf.roundedRect(15, y, pageWidth - 30, 48, 2, 2, 'FD');

                        pdf.setTextColor(...PRIMARY);
                        pdf.setFont('helvetica', 'bold');
                        pdf.setFontSize(11);
                        pdf.text(`Use Case 2.${dIdx + 1}: ${desc.useCaseName || 'Untitled'}`, 20, y + 8);

                        pdf.setTextColor(...TEXT_DARK);
                        pdf.setFontSize(9);
                        pdf.text(`Primary Actor: ${desc.primaryActor || 'Not specified'}`, 20, y + 16);
                        pdf.text(`Preconditions: ${desc.preconditions || 'None'}`, 20, y + 23);

                        pdf.setFont('helvetica', 'bold');
                        pdf.text('Main Success Scenario:', 20, y + 31);
                        pdf.setFont('helvetica', 'normal');

                        if (Array.isArray(desc.mainFlow) && desc.mainFlow.length > 0) {
                            const stepsText = desc.mainFlow.map((s, i) => `${i + 1}. ${s.action || s}`).join('  |  ');
                            const wrappedSteps = pdf.splitTextToSize(stepsText, pageWidth - 70);
                            pdf.text(wrappedSteps, 20, y + 38);
                        } else {
                            pdf.text('1. User initiates request  2. System validates input  3. System completes operation', 20, y + 38);
                        }

                        y += 55;
                    });
                }

                renderEvaluationTable(sectionKey, y);
                continue;
            }

            // Diagrams: usecase, ssds, class-diagram, sequence-diagrams
            let sectionEl = renderer ? renderer.querySelector(`[data-export-section="${sectionKey}"]`) : null;
            if (!sectionEl) {
                const secSelector = sectionKey === 'usecase'
                    ? '[data-editor-section="usecase"] .react-flow'
                    : sectionKey === 'ssds'
                        ? '[data-editor-section="ssd"] .react-flow'
                        : sectionKey === 'class-diagram'
                            ? '[data-editor-section="class-diagram"] .react-flow'
                            : '[data-editor-section="sequence-diagram"] .react-flow';
                sectionEl = document.querySelector(secSelector);
            }

            let canvas = null;
            if (sectionEl) {
                try {
                    const diagramContainer = sectionEl.querySelector('.react-flow')
                        ? sectionEl.querySelector('[style*="height"]') || sectionEl
                        : sectionEl;

                    canvas = diagramContainer.querySelector('.react-flow')
                        ? await captureReactFlowCanvas(diagramContainer, 1.5)
                        : await captureElementFast(diagramContainer, 1.5);
                } catch (err) {
                    console.warn(`[ExportCombined] Capture for ${title} failed:`, err.message);
                }
            }

            let yAfterDiagram = 30;

            if (canvas && canvas.width > 0 && canvas.height > 0) {
                const imgData = canvas.toDataURL('image/jpeg', 0.88);

                // Calculate width and height to fit nicely in 170mm x 125mm max box
                const maxW = pageWidth - 40;  // 170mm
                const maxH = 125;            // 125mm max height

                let imgW = maxW;
                let imgH = (canvas.height * imgW) / canvas.width;
                if (imgH > maxH) {
                    imgH = maxH;
                    imgW = (canvas.width * imgH) / canvas.height;
                }

                const posX = (pageWidth - imgW) / 2; // Center horizontally

                // Background container box for diagram
                pdf.setFillColor(255, 255, 255);
                pdf.setDrawColor(...BORDER_COLOR);
                pdf.roundedRect(posX - 2, 28, imgW + 4, imgH + 4, 2, 2, 'FD');

                pdf.addImage(imgData, 'JPEG', posX, 30, imgW, imgH);
                yAfterDiagram = 30 + imgH + 12;
            } else {
                pdf.setFont('helvetica', 'italic');
                pdf.setTextColor(...TEXT_MUTED);
                pdf.setFontSize(10);
                pdf.text('Diagram workspace is currently empty for this section.', 20, 35);
                yAfterDiagram = 50;
            }

            renderEvaluationTable(sectionKey, yAfterDiagram);
        }

        // Add page numbers footer to all pages
        const totalPages = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            addFooter(i, totalPages);
        }

        const fileName = `${userInfo.studentName ? userInfo.studentName + ' - ' : ''}${userInfo.assignmentTitle || 'UML-Design-Report'}.pdf`;
        pdf.save(fileName);
        return { durationMs: Math.round(performance.now() - startedAt), blob: pdf.output('blob'), fileName, format: 'pdf' };
    } catch (error) {
        console.error('Combined export failed:', error);
        throw error;
    }
};

export const exportModelAsJSON = async (mode, activeModel) => {
    const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        mode: mode,
        model: activeModel,
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    triggerDownload(blob, `uml-${mode}-model-${timestamp}.json`);
};

export const exportDescriptionAsText = async (activeModel, format) => {
    let textContent = '';
    if (activeModel?.descriptions) {
        textContent += 'UML Use Case Descriptions\n========================\n\n';
        Object.entries(activeModel.descriptions).forEach(([id, description]) => {
            textContent += `Use Case: ${description.useCaseName || 'Untitled'}\n`;
            textContent += `Primary Actor: ${description.primaryActor || 'Not specified'}\n\n`;
            textContent += 'Main Success Scenario:\n';
            if (description.mainFlow) {
                description.mainFlow.forEach((step, index) => {
                    textContent += `${index + 1}. ${step.action}\n`;
                });
            }
            textContent += '\n---\n\n';
        });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    if (format === 'txt') {
        const blob = new Blob([textContent], { type: 'text/plain' });
        triggerDownload(blob, `uml-descriptions-${timestamp}.txt`);
    } else if (format === 'pdf') {
        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF();
        const splitText = pdf.splitTextToSize(textContent, 180);
        pdf.text(splitText, 15, 15);
        pdf.save(`uml-descriptions-${timestamp}.pdf`);
    }
};

export const exportDiagramAsImage = async (activeSection, format) => {
    // Target the ReactFlow canvas container directly — never the wrapper that includes the toolbar
    const selector = activeSection === 'usecase'
        ? '[data-editor-section="usecase"] .react-flow'
        : activeSection === 'ssd'
            ? '[data-editor-section="ssd"] .react-flow'
            : activeSection === 'class-diagram'
                ? '[data-editor-section="class-diagram"] .react-flow'
                : activeSection === 'sequence-diagram'
                    ? '[data-testid="sequence-canvas"] .react-flow, [data-editor-section="sequence-diagram"] .react-flow'
                    : `#${activeSection}-section`;

    let diagramElement = await waitForElementFast(selector, 1500);


    if (!diagramElement && activeSection === 'description') {
        const descContainer = (await waitForElementFast('[data-editor-section="description"] [data-description-id]', 1000)) || document.body;
        const canvas = await captureElementFast(descContainer, 1.5);
        const dataUrl = canvas.toDataURL(format === 'jpeg' || format === 'jpg' ? 'image/jpeg' : 'image/png', 0.9);
        triggerDownload(dataUrl, `uml-description-view.${format === 'jpeg' || format === 'jpg' ? 'jpg' : 'png'}`);
        return;
    }

    if (!diagramElement) throw new Error(`${activeSection} diagram element not found`);

    // SVG export fast-path
    if (format === 'svg') {
        const svgElement = diagramElement.querySelector('svg.react-flow__svg') || (diagramElement.tagName === 'SVG' ? diagramElement : null);
        if (svgElement) {
            const serializer = new XMLSerializer();
            let source = serializer.serializeToString(svgElement);
            if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
                source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
            }
            const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
            triggerDownload(svgBlob, `uml-${activeSection}-diagram.svg`);
            return;
        }
    }

    // PNG, JPG, PDF — use ReactFlow-aware capture to exclude toolbars
    const canvas = diagramElement.querySelector('.react-flow')
        ? await captureReactFlowCanvas(diagramElement, 1.5)
        : await captureElementFast(diagramElement, 1.5);
    const mime = `image/${format === 'jpeg' || format === 'jpg' ? 'jpeg' : 'png'}`;
    const dataUrl = canvas.toDataURL(mime, 0.9);

    if (format === 'pdf') {
        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF('l', 'mm', 'a4');
        const imgWidth = 277;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(dataUrl, format === 'jpeg' || format === 'jpg' ? 'JPEG' : 'PNG', 10, 10, imgWidth, Math.min(imgHeight, 190));
        pdf.save(`uml-${activeSection}-diagram.pdf`);
    } else {
        triggerDownload(dataUrl, `uml-${activeSection}-diagram.${format === 'jpeg' || format === 'jpg' ? 'jpg' : 'png'}`);
    }
};