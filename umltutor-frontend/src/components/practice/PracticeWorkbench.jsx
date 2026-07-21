import React, { useEffect, useRef, useState } from 'react';
import { Download, FileJson, Image as ImageIcon } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
    setModel,
    selectDevelopmentModel,
} from '../../features/diagram';
import { setMode } from '../../features/modes';
import { createEmptyModel } from '../../types/umlModel';
import { UseCaseDiagramEditor } from '../../features/diagram';
import { UseCaseDescriptionEditor } from '../../features/description';
import { SSDDiagramEditor } from '../../features/ssd';
import { ClassDiagramEditor } from '../../features/class-diagram';
import { SequenceDiagramEditor } from '../../features/sequence-diagram';
import { exportPracticeModelJson, exportPracticeSectionJpg } from './practiceExportUtils';
import './PracticeWorkbench.css';

const PRACTICE_STORAGE_KEY = 'uml-practice-workbench';

const PRACTICE_STEPS = [
    { id: 'usecase', label: 'Use Case Diagram', step: '1' },
    { id: 'description', label: 'Use Case Description', step: '2' },
    { id: 'ssd', label: 'System Sequence Diagram', step: '3' },
    { id: 'class-diagram', label: 'Class Diagram', step: '4' },
    { id: 'sequence-diagram', label: 'Sequence Diagram', step: '5' },
];

const loadPracticeModel = () => {
    try {
        const saved = localStorage.getItem(PRACTICE_STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === 'object') return parsed;
        }
    } catch {
        // ignore corrupt storage
    }
    return createEmptyModel('practice', 'Practice Workbench');
};

const PracticeWorkbench = ({ activeSection: controlledSection, onSectionChange }) => {
    const dispatch = useAppDispatch();
    const practiceModel = useAppSelector(selectDevelopmentModel);
    const editorRef = useRef(null);
    const [internalSection, setInternalSection] = useState('usecase');
    const [exportError, setExportError] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    const activeSection = controlledSection ?? internalSection;

    const setActiveSection = (section) => {
        if (onSectionChange) {
            onSectionChange(section);
        }
        if (controlledSection === undefined) {
            setInternalSection(section);
        }
    };

    useEffect(() => {
        dispatch(setMode('development'));
        dispatch(setModel({ mode: 'development', model: loadPracticeModel() }));
    }, [dispatch]);

    useEffect(() => {
        if (!practiceModel || practiceModel.id !== 'practice') return undefined;
        const timer = setTimeout(() => {
            localStorage.setItem(PRACTICE_STORAGE_KEY, JSON.stringify(practiceModel));
        }, 600);
        return () => clearTimeout(timer);
    }, [practiceModel]);

    const handleExportJson = () => {
        setExportError('');
        if (!practiceModel) {
            setExportError('Practice model is not ready yet.');
            return;
        }
        exportPracticeModelJson(practiceModel);
    };

    const handleExportJpg = async () => {
        setExportError('');
        setIsExporting(true);
        try {
            await exportPracticeSectionJpg(activeSection, editorRef);
        } catch (err) {
            setExportError(err.message || 'Failed to export image.');
        } finally {
            setIsExporting(false);
        }
    };

    const activeStep = PRACTICE_STEPS.find((s) => s.id === activeSection);

    const renderEditor = () => {
        if (!practiceModel) {
            return (
                <div className="practice-editor-loading">
                    Loading practice editor...
                </div>
            );
        }

        switch (activeSection) {
            case 'usecase':
                return (
                    <UseCaseDiagramEditor
                        assignmentId={practiceModel.id}
                        initialData={practiceModel.diagram}
                        isReadOnly={false}
                    />
                );
            case 'description':
                return (
                    <UseCaseDescriptionEditor
                        assignmentId={practiceModel.id}
                        isReadOnly={false}
                        isCheckingActive={false}
                        modelOverride={practiceModel}
                        embedded
                    />
                );
            case 'ssd':
                return (
                    <SSDDiagramEditor
                        assignmentId={practiceModel.id}
                        isReadOnly={false}
                        isCheckingActive={false}
                        modelOverride={practiceModel}
                        embedded
                    />
                );
            case 'class-diagram':
                return (
                    <div data-practice-canvas="class-diagram" className="practice-class-wrap">
                        <ClassDiagramEditor
                            assignmentId={practiceModel.id}
                            initialData={practiceModel.classDiagram}
                            isReadOnly={false}
                            embedded
                        />
                    </div>
                );
            case 'sequence-diagram':
                return (
                    <SequenceDiagramEditor
                        assignmentId={practiceModel.id}
                        isReadOnly={false}
                        isCheckingActive={false}
                        modelOverride={practiceModel}
                        embedded
                    />
                );
            default:
                return null;
        }
    };

    return (
        <section className="practice-workbench">
            <div className="practice-workbench-header">
                <div>
                    <h2 className="practice-workbench-title">Practice Workbench</h2>
                    <p className="practice-workbench-subtitle">
                        Experiment with all UML editors freely — no validation, no submission. Your work is saved locally in this browser.
                    </p>
                </div>
            </div>

            <div className="practice-workbench-body">
                <aside className="practice-steps">
                    <div className="practice-steps-label">Editors</div>
                    <nav className="practice-steps-list">
                        {PRACTICE_STEPS.map((step) => (
                            <button
                                key={step.id}
                                type="button"
                                className={`practice-step-btn ${activeSection === step.id ? 'active' : ''}`}
                                onClick={() => {
                                    setActiveSection(step.id);
                                    setExportError('');
                                }}
                            >
                                <span className="practice-step-num">{step.step}</span>
                                <span className="practice-step-text">{step.label}</span>
                            </button>
                        ))}
                    </nav>

                    <div className="practice-save-block">
                        <div className="practice-save-label">
                            <Download size={14} />
                            Save
                        </div>
                        <button type="button" className="practice-save-btn" onClick={handleExportJson}>
                            <FileJson size={16} />
                            Export JSON
                        </button>
                        <button
                            type="button"
                            className="practice-save-btn"
                            onClick={handleExportJpg}
                            disabled={isExporting}
                        >
                            <ImageIcon size={16} />
                            {isExporting ? 'Exporting…' : 'Export JPG'}
                        </button>
                        {exportError && <p className="practice-save-error">{exportError}</p>}
                        <p className="practice-save-hint">
                            JSON saves the full practice model. JPG captures the current editor view ({activeStep?.label}).
                        </p>
                    </div>
                </aside>

                <div className="practice-editor-panel" ref={editorRef}>
                    <div className="practice-editor-panel-head">
                        <span className="practice-editor-badge">Practice</span>
                        <h3>{activeStep?.label}</h3>
                    </div>
                    <div className="practice-editor-canvas">
                        {renderEditor()}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default PracticeWorkbench;
