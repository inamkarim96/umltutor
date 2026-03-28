import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
    selectTutorialModel,
    selectDevelopmentModel
} from '../features/diagram';
import { selectCurrentMode } from '../features/modes';
import { selectIsGuest } from '../features/auth';
import { exportCombinedModel, exportModelAsJSON, exportDescriptionAsText, exportDiagramAsImage } from '../utils/exportUtils';


/**
 * Hook for manual save and export functionality for guest users
 */
export const useManualSave = (activeSection) => {
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);

    const mode = useSelector(selectCurrentMode);
    const isGuest = useSelector(selectIsGuest);

    // Get the correct model for the current mode
    const tutorialModel = useSelector(selectTutorialModel);
    const developmentModel = useSelector(selectDevelopmentModel);
    const activeModel = mode === 'tutorial' ? tutorialModel : developmentModel;

    const saveToLocal = async () => {
        if (!activeModel) {
            throw new Error('No model to save');
        }

        try {
            setIsSaving(true);
            setSaveError(null);

            if (isGuest) {
                // Guest mode: Show confirmation but don't persist
                console.log('[ManualSave] Guest mode - temporary session only');
            } else {
                console.log('[ManualSave] Authenticated user - persistent save');
                // Backend save implementation would go here
            }

            return true;
        } catch (error) {
            console.error('[ManualSave] Failed to save:', error);
            setSaveError(error.message || 'Failed to save changes');
            throw error;
        } finally {
            setIsSaving(false);
        }
    };

    const exportToFile = async (format = 'json', report = null, userInfo = {}) => {
        if (!activeModel) throw new Error('No model to export');

        try {
            if (format === 'combined') {
                await exportCombinedModel(activeModel, mode, report, userInfo);
            } else if (format === 'json') {
                await exportModelAsJSON(mode, activeModel);
            } else if (format === 'txt' || format === 'pdf' || format === 'docx' || format === 'jpeg' || format === 'png' || format === 'svg') {
                if (activeSection === 'description') {
                    if (format === 'pdf' || format === 'txt' || format === 'docx') {
                        await exportDescriptionAsText(activeModel, format);
                    } else {
                        // Image export for description (screenshot)
                        await exportDiagramAsImage(activeSection, format);
                    }
                } else if (activeSection === 'usecase' || activeSection === 'ssd') {
                    await exportDiagramAsImage(activeSection, format);
                } else {
                    throw new Error(`${format.toUpperCase()} export not available for ${activeSection} editor`);
                }
            } else {
                // Image export for diagrams
                if (activeSection === 'usecase' || activeSection === 'ssd') {
                    await exportDiagramAsImage(activeSection, format);
                } else {
                    throw new Error(`Image export not available for ${activeSection} editor`);
                }
            }

            console.log(`[Export] Exported ${mode} model as ${format.toUpperCase()}`);
            return true;
        } catch (error) {
            console.error('[Export] Failed to export:', error);
            throw error;
        }
    };

    return {
        saveToLocal,
        exportToFile,
        isSaving,
        saveError,
        canSave: !!activeModel // Can save if model exists
    };
};

export default useManualSave;


