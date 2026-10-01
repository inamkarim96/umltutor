import React, { useEffect, useRef, useState } from 'react';
import { Download, FileJson, Image as ImageIcon, ChevronDown } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
    setModel,
    selectDevelopmentModel,
} from '../../features/diagram';
import { createEmptyModel } from '../../types/umlModel';
import { UseCaseDiagramEditor } from '../../features/diagram';
import { UseCaseDescriptionEditor } from '../../features/description';
import { SSDDiagramEditor } from '../../features/ssd';
import { ClassDiagramEditor } from '../../features/class-diagram';
import { SequenceDiagramEditor } from '../../features/sequence-diagram';
import { exportPracticeModelJson, exportPracticeSection, EXPORT_FORMATS, QUALITY_PRESETS } from './practiceExportUtils';
import './PracticeWorkbench.css';

const PRACTICE_STEPS = [
    { id: 'usecase', label: 'Use Case Diagram' },
    { id: 'description', label: 'Use Case Description' },
    { id: 'ssd', label: 'System Sequence Diagram' },
    { id: 'class-diagram', label: 'Class Diagram' },
    { id: 'sequence-diagram', label: 'Sequence Diagram' },
];

const PracticeWorkbench = ({ activeSection, onSectionChange }) => {
    const dispatch = useAppDispatch();
    const practiceModel = useAppSelector(selectDevelopmentModel);
    const editorRef = useRef(null);
    const [internalSection, setInternalSection] = useState('usecase');
    const [exportError, setExportError] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [exportFormat, setExportFormat] = useState('png');
    const [exportQuality, setExportQuality] = useState('standard');

    const section = activeSection ?? internalSection;

    const setSection = (s) => {
        if (onSectionChange) onSectionChange(s);
        if (activeSection === undefined) setInternalSection(s);
    };

    useEffect(() => {
        dispatch(setModel({ mode: 'development', model: createEmptyModel('practice', 'Practice Workbench') }));
    }, [dispatch]);

    const handleExportJson = () => {
        setExportError('');
        if (!practiceModel) { setExportError('Practice model is not ready yet.'); return; }
        exportPracticeModelJson(practiceModel);
    };

    const handleExport = async () => {
        setExportError('');
        setIsExporting(true);
        setExportProgress(0);
        setShowExportMenu(false);
        try {
            await exportPracticeSection(section, editorRef, {
                format: exportFormat,
                quality: exportQuality,
                includeBackground: true,
                onProgress: setExportProgress,
            });
        } catch (err) {
            setExportError(err.message || 'Failed to export image.');
        } finally {
            setIsExporting(false);
            setExportProgress(0);
        }
    };

    const activeStep = PRACTICE_STEPS.find((s) => s.id === section);

    const renderEditor = () => {
        if (!practiceModel) {
            return <div className="practice-editor-loading">Loading practice editor...</div>;
        }
        switch (section) {
            case 'usecase':
                return <UseCaseDiagramEditor assignmentId={practiceModel.id} initialData={practiceModel.diagram} isReadOnly={false} />;
            case 'description':
                return <UseCaseDescriptionEditor assignmentId={practiceModel.id} isReadOnly={false} isCheckingActive={false} modelOverride={practiceModel} embedded />;
            case 'ssd':
                return <SSDDiagramEditor assignmentId={practiceModel.id} isReadOnly={false} isCheckingActive={false} modelOverride={practiceModel} embedded />;
            case 'class-diagram':
                return <div data-practice-canvas="class-diagram" className="practice-class-wrap"><ClassDiagramEditor assignmentId={practiceModel.id} initialData={practiceModel.classDiagram} isReadOnly={false} embedded /></div>;
            case 'sequence-diagram':
                return <SequenceDiagramEditor assignmentId={practiceModel.id} isReadOnly={false} isCheckingActive={false} modelOverride={practiceModel} embedded />;
            default:
                return null;
        }
    };

    const formatLabel = EXPORT_FORMATS[exportFormat]?.ext?.toUpperCase() || exportFormat.toUpperCase();
    const qualityLabel = QUALITY_PRESETS[exportQuality]?.suffix?.toUpperCase() || exportQuality;

    return (
        <section className="practice-workbench">
            <div className="practice-workbench-head">
                <div>
                    <h3 className="practice-workbench-name">{activeStep?.label}</h3>
                    <p className="practice-workbench-mode">Practice Mode</p>
                </div>
                <div className="practice-toolbar">
                    <button type="button" className="practice-toolbar-btn" onClick={handleExportJson} title="Export JSON">
                        <FileJson size={15} /> JSON
                    </button>

                    {/* Export Dropdown */}
                    <div className="practice-export-dropdown">
                        <button
                            type="button"
                            className="practice-toolbar-btn practice-export-trigger"
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            disabled={isExporting}
                            title="Export Diagram"
                        >
                            <ImageIcon size={15} />
                            <span>{formatLabel}</span>
                            <ChevronDown size={12} />
                        </button>
                        {showExportMenu && (
                            <div className="practice-export-menu">
                                <div className="practice-export-section">
                                    <p className="practice-export-label">Format</p>
                                    <div className="practice-export-options">
                                        {Object.entries(EXPORT_FORMATS).map(([key, val]) => (
                                            <button
                                                key={key}
                                                className={`practice-export-option ${exportFormat === key ? 'active' : ''}`}
                                                onClick={() => setExportFormat(key)}
                                                type="button"
                                            >
                                                {key.toUpperCase()} ({val.ext})
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="practice-export-section">
                                    <p className="practice-export-label">Quality</p>
                                    <div className="practice-export-options">
                                        {Object.entries(QUALITY_PRESETS).map(([key, val]) => (
                                            <button
                                                key={key}
                                                className={`practice-export-option ${exportQuality === key ? 'active' : ''}`}
                                                onClick={() => setExportQuality(key)}
                                                type="button"
                                            >
                                                {val.suffix === 'std' ? 'Standard' : val.suffix === 'hd' ? 'High' : val.suffix.charAt(0).toUpperCase() + val.suffix.slice(1)} ({val.pixelRatio}x)
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button
                                    className="practice-export-confirm"
                                    onClick={handleExport}
                                    disabled={isExporting}
                                >
                                    {isExporting ? (
                                        <>
                                            <span className="practice-export-spinner" />
                                            Exporting... {Math.round(exportProgress * 100)}%
                                        </>
                                    ) : (
                                        `Export as ${formatLabel.toUpperCase()}`
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {exportError && <p className="practice-export-error">{exportError}</p>}
            <div className="practice-editor-panel" ref={editorRef}>
                <div className="practice-editor-canvas">
                    {renderEditor()}
                </div>
            </div>
        </section>
    );
};

export default PracticeWorkbench;
