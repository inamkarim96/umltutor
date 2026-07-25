import React, { useEffect, useRef, useState } from 'react';
import { Download, FileJson, Image as ImageIcon } from 'lucide-react';
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
import { exportPracticeModelJson, exportPracticeSectionJpg } from './practiceExportUtils';
import './PracticeWorkbench.css';

const PRACTICE_STORAGE_KEY = 'uml-practice-workbench';

const PRACTICE_STEPS = [
    { id: 'usecase', label: 'Use Case Diagram' },
    { id: 'description', label: 'Use Case Description' },
    { id: 'ssd', label: 'System Sequence Diagram' },
    { id: 'class-diagram', label: 'Class Diagram' },
    { id: 'sequence-diagram', label: 'Sequence Diagram' },
];

const loadPracticeModel = () => {
    try {
        const saved = localStorage.getItem(PRACTICE_STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === 'object') return parsed;
        }
    } catch {
    }
    return createEmptyModel('practice', 'Practice Workbench');
};

const PracticeWorkbench = ({ activeSection, onSectionChange }) => {
    const dispatch = useAppDispatch();
    const practiceModel = useAppSelector(selectDevelopmentModel);
    const editorRef = useRef(null);
    const [internalSection, setInternalSection] = useState('usecase');
    const [exportError, setExportError] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    const section = activeSection ?? internalSection;

    const setSection = (s) => {
        if (onSectionChange) onSectionChange(s);
        if (activeSection === undefined) setInternalSection(s);
    };

    useEffect(() => {
        dispatch(setModel({ mode: 'development', model: loadPracticeModel() }));
    }, [dispatch]);

    useEffect(() => {
        if (!practiceModel || practiceModel.id !== 'practice') return;
        const timer = setTimeout(() => {
            localStorage.setItem(PRACTICE_STORAGE_KEY, JSON.stringify(practiceModel));
        }, 600);
        return () => clearTimeout(timer);
    }, [practiceModel]);

    const handleExportJson = () => {
        setExportError('');
        if (!practiceModel) { setExportError('Practice model is not ready yet.'); return; }
        exportPracticeModelJson(practiceModel);
    };

    const handleExportJpg = async () => {
        setExportError('');
        setIsExporting(true);
        try { await exportPracticeSectionJpg(section, editorRef); } catch (err) { setExportError(err.message || 'Failed to export image.'); }
        finally { setIsExporting(false); }
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

    return (
        <section className="practice-workbench">
            <div className="practice-workbench-head">
                <div>
                    <h3 className="practice-workbench-name">{activeStep?.label}</h3>
                    <p className="practice-workbench-mode">Practice Mode — saved locally</p>
                </div>
                <div className="practice-toolbar">
                    <button type="button" className="practice-toolbar-btn" onClick={handleExportJson} title="Export JSON">
                        <FileJson size={15} /> JSON
                    </button>
                    <button type="button" className="practice-toolbar-btn" onClick={handleExportJpg} disabled={isExporting} title="Export JPG">
                        <ImageIcon size={15} /> {isExporting ? '…' : 'JPG'}
                    </button>
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
