/**
 * Shared utility for exporting UML models in various formats.
 */

// Redundant report generation logic removed. Export now uses direct UI capture from database-linked components.

export const exportModelAsJSON = async (mode, activeModel) => {
    const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        mode: mode,
        model: activeModel
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `uml-${mode}-model-${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const exportStepWithReport = async (section, format, activeModel, report, itemId = null) => {
    try {
        console.log(`[Export] Starting single-step export for ${section} (${format})`);
        const { jsPDF } = await import('jspdf');
        const html2canvas = (await import('html2canvas')).default;

        // Targeted selector for the specific section or item
        let selector = '';
        if (section === 'usecase') {
            selector = '[data-testid="usecase-canvas"]';
        } else if (section === 'description') {
            selector = itemId ? `[data-description-id="${itemId}"]` : '.use-case-description-editor';
        } else if (section === 'ssd') {
            selector = itemId ? `[data-testid="ssd-card"][data-usecase-id="${itemId}"]` : '[data-testid="ssd-card"]';
        } else if (section === 'class-diagram') {
            selector = '.react-flow';
        } else if (section === 'sequence-diagram') {
            selector = '.react-flow';
        }

        const element = document.querySelector(selector) || document.querySelector('.flex-1.relative.overflow-hidden');
        if (!element) throw new Error(`Could not find element for section: ${section}`);

        // Capture the UI directly as it appears to the user/teacher
        const canvas = await html2canvas(element, {
            backgroundColor: '#ffffff',
            scale: 1.5, // Optimized for file size vs quality
            useCORS: true,
            logging: false
        });

        if (format === 'pdf') {
            const imgData = canvas.toDataURL('image/jpeg', 0.8); // Compressed JPEG
            const pdf = new jsPDF('l', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            // Scaled fit
            const imgWidth = pageWidth - 20;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, 'JPEG', 10, 10, imgWidth, Math.min(imgHeight, pageHeight - 20));
            pdf.save(`UML-${section}-Report.pdf`);
        } else {
            const link = document.createElement('a');
            link.href = canvas.toDataURL(`image/${format === 'jpeg' ? 'jpeg' : 'png'}`);
            link.download = `UML-${section}-Export.${format}`;
            link.click();
        }
    } catch (error) {
        console.error('Step export failed:', error);
        throw error;
    }
};

export const exportCombinedModel = async (activeModel, mode, report, userInfo = {}) => {
    try {
        const { jsPDF } = await import('jspdf');
        const html2canvas = (await import('html2canvas')).default;

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        let yPos = 20;

        // 1. Professional Cover Page Header
        pdf.setFillColor(79, 70, 229); // Indigo-600
        pdf.rect(0, 0, pageWidth, 40, 'F');

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(24);
        pdf.setFont('helvetica', 'bold');
        pdf.text('UML DESIGN REPORT', 20, 25);

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth - 70, 25);

        // Student Info Block
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(12);
        yPos = 55;
        pdf.text(`Student: ${userInfo.studentName || 'N/A'}`, 20, yPos);
        pdf.text(`Teacher: ${userInfo.teacherName || 'N/A'}`, 20, yPos + 7);
        pdf.text(`Class: ${userInfo.className || 'N/A'}`, 20, yPos + 14);
        pdf.text(`Assignment: ${userInfo.assignmentTitle || 'N/A'}`, 20, yPos + 21);

        if (userInfo.reviewerName && userInfo.reviewerName !== userInfo.teacherName) {
            pdf.setTextColor(79, 70, 229);
            pdf.text(`Reviewed by: ${userInfo.reviewerName}`, pageWidth - 80, yPos);
            pdf.setTextColor(0, 0, 0);
        }

        yPos += 35;
        pdf.setDrawColor(229, 231, 235);
        pdf.line(20, yPos, pageWidth - 20, yPos);
        yPos += 15;

        // HELPER: Wait for dynamic components to mount
        const waitForElement = async (selector, maxWaitMs = 5000) => {
            const start = Date.now();
            while (Date.now() - start < maxWaitMs) {
                const el = document.querySelector(selector);
                if (el) return el;
                await new Promise(r => setTimeout(r, 100));
            }
            throw new Error(`Export renderer not found (${selector}). Please ensure export mode is active.`);
        };

        const renderer = await waitForElement('#full-model-export-renderer', 3000);

        // HELPER: Add captured UI section to PDF
        const addSectionToPdf = async (element, title, newPage = true) => {
            if (newPage) {
                pdf.addPage();
                yPos = 20;
            }

            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(79, 70, 229);
            pdf.setFontSize(14);
            pdf.text(title, 20, yPos);
            yPos += 10;

            // Give diagrams like React Flow time to stabilize in the hidden div
            await new Promise(r => setTimeout(r, 600));

            const canvas = await html2canvas(element, {
                scale: 2,
                backgroundColor: '#ffffff',
                logging: false,
                useCORS: true,
                onclone: (clonedDoc) => {
                    // Optional: remove any unwanted UI from the capture if needed
                    const el = clonedDoc.querySelector('.opacity-0');
                    if (el) el.style.opacity = '1';
                }
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.85);
            const imgWidth = pageWidth - 40;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // If image is too tall for one page, we might need simple scaling
            const finalHeight = Math.min(imgHeight, pageHeight - yPos - 10);
            pdf.addImage(imgData, 'JPEG', 20, yPos, imgWidth, finalHeight);
            yPos += finalHeight + 10;
        };

        // --- SECTION 1: USE CASE DIAGRAM & REPORT ---
        const step1 = renderer.querySelector('[data-export-section="usecase"]');
        if (step1) {
            await addSectionToPdf(step1, '1. Use Case Diagram & Checking Report', false);
        }

        // --- SECTION 2: USE CASE DESCRIPTIONS & REPORTS ---
        const step2 = renderer.querySelector('[data-export-section="descriptions"]');
        if (step2) {
            const descBlocks = Array.from(step2.children).filter(el => el.tagName !== 'H1');
            for (let i = 0; i < descBlocks.length; i++) {
                await addSectionToPdf(descBlocks[i], `2.${i + 1} Use Case Description & Report`);
            }
        }

        // --- SECTION 3: SSDS & REPORTS ---
        const step3 = renderer.querySelector('[data-export-section="ssds"]');
        if (step3) {
            const ssdBlocks = Array.from(step3.children).filter(el => el.tagName !== 'H1');
            for (let i = 0; i < ssdBlocks.length; i++) {
                await addSectionToPdf(ssdBlocks[i], `3.${i + 1} System Sequence Diagram & Checking Report`);
            }
        }

        // --- SECTION 4: CLASS DIAGRAM & REPORT ---
        const step4 = renderer.querySelector('[data-export-section="class-diagram"]');
        if (step4) {
            await addSectionToPdf(step4, '4. Class Diagram & Checking Report');
        }

        // --- SECTION 5: SEQUENCE DIAGRAMS & REPORTS ---
        const step5 = renderer.querySelector('[data-export-section="sequence-diagrams"]');
        if (step5) {
            const seqBlocks = Array.from(step5.children).filter(el => el.tagName !== 'H1');
            for (let i = 0; i < seqBlocks.length; i++) {
                await addSectionToPdf(seqBlocks[i], `5.${i + 1} Sequence Diagram & Checking Report`);
            }
        }

        const fileName = `${userInfo.studentName ? userInfo.studentName + ' - ' : ''}${userInfo.assignmentTitle || 'UML-Design-Report'}.pdf`;
        pdf.save(fileName);
    } catch (error) {
        console.error('Combined export failed:', error);
        throw error;
    }
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
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `uml-descriptions-${timestamp}.txt`;
        link.click();
    } else if (format === 'pdf') {
        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF();
        const splitText = pdf.splitTextToSize(textContent, 180);
        pdf.text(splitText, 15, 15);
        pdf.save(`uml-descriptions-${timestamp}.pdf`);
    }
};

export const exportDiagramAsImage = async (activeSection, format) => {
    const selector = activeSection === 'usecase'
        ? '[data-testid="usecase-canvas"] .react-flow'
        : activeSection === 'ssd'
            ? '[data-testid="ssd-canvas"] .react-flow'
            : activeSection === 'class-diagram' || activeSection === 'sequence-diagram'
                ? '.react-flow'
                : `#${activeSection}-section`;

    const diagramElement = document.querySelector(selector);
    if (!diagramElement) {
        if (activeSection === 'description') {
            const descContainer = document.querySelector('.use-case-description-editor') || document.body;
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(descContainer, { backgroundColor: '#ffffff', scale: 2 });
            const dataUrl = canvas.toDataURL(format === 'jpeg' ? 'image/jpeg' : 'image/png');
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `uml-description-view.${format}`;
            link.click();
            return;
        }
        throw new Error(`${activeSection} diagram not found`);
    }

    if (format === 'svg') {
        const svgElement = diagramElement.querySelector('svg.react-flow__svg');
        if (svgElement) {
            const serializer = new XMLSerializer();
            let source = serializer.serializeToString(svgElement);
            if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
                source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
            }
            const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `uml-${activeSection}-diagram.svg`;
            link.click();
            URL.revokeObjectURL(url);
            return;
        }
    }

    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(diagramElement, { backgroundColor: '#ffffff', scale: 2 });
    const dataUrl = canvas.toDataURL(format === 'jpeg' ? 'image/jpeg' : 'image/png');

    if (format === 'pdf') {
        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF('l', 'mm', 'a4');
        const imgWidth = 280;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(dataUrl, 'PNG', 10, 10, imgWidth, imgHeight);
        pdf.save(`uml-${activeSection}-diagram.pdf`);
    } else {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `uml-${activeSection}-diagram.${format}`;
        link.click();
    }
};
