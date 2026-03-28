import React, { useEffect, useMemo } from 'react';
import { useForm, useFieldArray, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppSelector } from '../../app/hooks';
import { selectConstraintsEnabled } from '../../features/modes';
import { User, Activity, ScrollText, ListChecks, Split, AlertCircle, Trash2 } from 'lucide-react';

// --- Validation Schema ---
const mainFlowStepSchema = z.object({
    id: z.string().optional(),
    stepNumber: z.number().int(),
    action: z.string().min(1, 'Step action is required'),
});

const alternativeFlowSchema = z.object({
    id: z.string().optional(),
    relatedStep: z.number().int().min(1, 'Related Step is required'),
    condition: z.string().min(1, 'Condition is required'),
    response: z.string().min(1, 'System Response is required'),
});

const descriptionSchema = z.object({
    useCaseName: z.string().min(1, 'Use case must be selected'),
    primaryActor: z.string().min(1, 'Primary Actor must be selected.'),
    preconditions: z.string().min(1, 'Preconditions are required.'),
    postconditions: z.string().min(1, 'Postconditions are required.'),
    mainFlow: z.array(mainFlowStepSchema).min(1, 'Main Success Scenario must contain at least one step.'),
    alternativeFlows: z.array(alternativeFlowSchema).default([]),
});

export const DescriptionForm = ({
    useCaseId,
    initialData,
    availableUseCases,
    allNodes,
    allEdges,
    onUseCaseChange,
    onSave,
    isReadOnly = false,
    isDevelopmentMode = false,
}) => {
    const constraintsEnabled = useAppSelector(selectConstraintsEnabled);

    // Dynamically find connected actors based on diagram connections
    const connectedActors = useMemo(() => {
        if (!useCaseId) return [];
        const neighborIds = allEdges
            .filter(e => e.source === useCaseId || e.target === useCaseId)
            .map(e => e.source === useCaseId ? e.target : e.source);

        return allNodes
            .filter(n => n.type === 'actor' && neighborIds.includes(n.id))
            .map(n => n.data?.label || 'Unnamed Actor');
    }, [useCaseId, allNodes, allEdges]);

    const methods = useForm({
        resolver: zodResolver(descriptionSchema),
        defaultValues: {
            useCaseName: initialData?.useCaseName || '',
            primaryActor: initialData?.primaryActor || '',
            preconditions: initialData?.preconditions || '',
            postconditions: initialData?.postconditions || '',
            mainFlow: initialData?.mainFlow?.length ? initialData.mainFlow : [{ stepNumber: 1, action: '' }],
            alternativeFlows: initialData?.alternativeFlows || [],
        }
    });

    const { register, getValues, reset, setValue, formState: { errors } } = methods;

    // Keep useCaseName synced for validation
    useEffect(() => {
        const currentUC = availableUseCases.find(uc => uc.id === useCaseId);
        if (currentUC) {
            setValue('useCaseName', currentUC.label);
        }
    }, [useCaseId, availableUseCases, setValue]);

    useEffect(() => {
        if (initialData) {
            reset({
                ...initialData,
                useCaseName: initialData.useCaseName || '',
                primaryActor: initialData.primaryActor || '',
                mainFlow: initialData.mainFlow?.length ? initialData.mainFlow : [{ stepNumber: 1, action: '' }],
            });
        }
    }, [initialData, reset]);

    const handleFieldBlur = () => {
        const currentValues = getValues();
        onSave(currentValues);
    };

    const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-900 transition-all font-medium text-gray-700 dark:text-gray-200";

    if (availableUseCases.length === 0 && !isDevelopmentMode) {
        return (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-6 rounded-2xl flex items-center gap-4 text-amber-700 dark:text-amber-400">
                <AlertCircle size={24} />
                <p className="font-bold">No use cases found in diagram. Please add use cases in Step 1.</p>
            </div>
        );
    }

    return (
        <FormProvider {...methods}>
            <div className="space-y-6 max-w-4xl mx-auto pb-12">
                {/* Warning for Development Mode */}
                {availableUseCases.length === 0 && isDevelopmentMode && (
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-4 rounded-xl flex items-center gap-3 text-amber-700 dark:text-amber-400 mb-6">
                        <AlertCircle size={20} />
                        <p className="text-sm font-bold">Warning: No Use Cases detected in the diagram. You can still write descriptions in Development Mode.</p>
                    </div>
                )}

                {/* 1. Select Use Case */}
                {!isReadOnly && (
                    <div className="space-y-4">
                        <label className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
                            <Activity size={14} />
                            1. Select Use Case
                        </label>
                        <select
                            value={useCaseId || ''}
                            onChange={(e) => onUseCaseChange(e.target.value)}
                            className={`${inputClass} cursor-pointer bg-slate-50/50 dark:bg-slate-900 shadow-inner`}
                        >
                            <option value="" disabled>Choose an active use case...</option>
                            {availableUseCases.map(uc => <option key={uc.id} value={uc.id}>{uc.label}</option>)}
                        </select>
                    </div>
                )}

                {/* 2. Primary Actor Dropdown */}
                <div className="space-y-4">
                    <label className="flex items-center justify-between text-sm font-black uppercase tracking-widest text-slate-400">
                        <div className="flex items-center gap-2">
                            <User size={14} />
                            2. Primary Actor
                        </div>
                    </label>
                    {connectedActors.length > 0 ? (
                        <select
                            {...register('primaryActor')}
                            disabled={isReadOnly}
                            className={`${inputClass} ${isReadOnly ? 'cursor-default' : 'cursor-pointer'} bg-slate-50/50 dark:bg-slate-900 shadow-inner`}
                            onBlur={handleFieldBlur}
                        >
                            <option value="" disabled>Select the primary actor...</option>
                            {connectedActors.map((actor, i) => (
                                <option key={i} value={actor}>{actor}</option>
                            ))}
                        </select>
                    ) : (
                        <div className="p-4 w-full bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-center text-sm italic">
                            No actors connected to this use case in the diagram.
                        </div>
                    )}
                    {errors.primaryActor && <p className="mt-2 text-xs text-red-500 font-bold">{errors.primaryActor.message}</p>}
                </div>

                {/* 3. Preconditions */}
                <div className="space-y-4">
                    <label className="flex items-center justify-between text-sm font-black uppercase tracking-widest text-slate-400">
                        <div className="flex items-center gap-2">
                            <ScrollText size={14} />
                            3. Preconditions
                        </div>
                    </label>
                    <textarea
                        {...register('preconditions')}
                        disabled={isReadOnly}
                        rows={3}
                        className={`${inputClass} resize-none min-h-[100px] bg-slate-50/50 dark:bg-slate-900 shadow-inner ${errors.preconditions ? 'border-red-500 focus:ring-red-500 border-2' : ''}`}
                        onBlur={handleFieldBlur}
                        placeholder="Describe system state before execution..."
                    />
                    {errors.preconditions && <p className="mt-2 text-xs text-red-500 font-bold">{errors.preconditions.message}</p>}
                </div>

                {/* 4. Postconditions */}
                <div className="space-y-4">
                    <label className="flex items-center justify-between text-sm font-black uppercase tracking-widest text-slate-400">
                        <div className="flex items-center gap-2">
                            <ScrollText size={14} />
                            4. Postconditions
                        </div>
                    </label>
                    <textarea
                        {...register('postconditions')}
                        disabled={isReadOnly}
                        rows={3}
                        className={`${inputClass} resize-none min-h-[100px] bg-slate-50/50 dark:bg-slate-900 shadow-inner ${errors.postconditions ? 'border-red-500 focus:ring-red-500 border-2' : ''}`}
                        onBlur={handleFieldBlur}
                        placeholder="Describe system state after successful completion..."
                    />
                    {errors.postconditions && <p className="mt-2 text-xs text-red-500 font-bold">{errors.postconditions.message}</p>}
                </div>

                {/* 5. Main Success Scenario */}
                <MainSuccessScenarioCard isReadOnly={isReadOnly} onFieldBlur={handleFieldBlur} />

                {/* 6. Alternative Flows */}
                <AlternativeFlowsCard isReadOnly={isReadOnly} onFieldBlur={handleFieldBlur} />
            </div>
        </FormProvider>
    );
};

const MainSuccessScenarioCard = ({ isReadOnly, onFieldBlur }) => {
    const { control, register, formState: { errors } } = useFormContext();
    const { fields, append, remove } = useFieldArray({ control, name: 'mainFlow' });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400 uppercase">
                    <ListChecks size={14} />
                    5. Main Success Scenario
                </div>
                {!isReadOnly && (
                    <button
                        type="button"
                        onClick={() => append({ stepNumber: fields.length + 1, action: '' })}
                        className="px-4 py-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-lg font-bold text-xs hover:bg-indigo-100 transition-all border border-indigo-100 dark:border-indigo-800/50"
                    >
                        + Add Step
                    </button>
                )}
            </div>
            {errors.mainFlow?.message && (
                <p className="mt-[-1rem] mb-4 text-xs text-red-500 font-bold px-6">{errors.mainFlow.message}</p>
            )}

            <div className="space-y-4">
                {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-4 group">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-900/30 flex items-center justify-center shrink-0 text-xs font-black text-gray-400 border border-gray-100 dark:border-gray-800">
                            {index + 1}
                        </div>
                        <div className="flex-1">
                            <input
                                {...register(`mainFlow.${index}.action`)}
                                disabled={isReadOnly}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-900 transition-all font-medium"
                                placeholder="Action step content..."
                                onBlur={onFieldBlur}
                            />
                        </div>
                        {!isReadOnly && index > 0 && (
                            <button
                                type="button"
                                onClick={() => remove(index)}
                                className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all border border-transparent hover:border-red-100 dark:hover:border-red-800/50"
                                title="Remove Step"
                            >
                                <Trash2 size={18} />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

const AlternativeFlowsCard = ({ isReadOnly, onFieldBlur }) => {
    const { control, register, watch } = useFormContext();
    const { fields, append, remove } = useFieldArray({ control, name: 'alternativeFlows' });
    const mainFlow = watch('mainFlow');

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
                <Split size={14} />
                6. Alternative Flows (Optional)
            </div>
            <div className="space-y-4">
                {fields.map((field, index) => (
                    <div key={field.id} className="p-6 rounded-2xl bg-gray-50/50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 relative group">
                        {!isReadOnly && (
                            <button
                                type="button"
                                onClick={() => remove(index)}
                                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 transition-all hover:bg-red-50 rounded-lg"
                                title="Remove Alternative Flow"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                            <div className="md:col-span-3 space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Related Step</label>
                                <select
                                    {...register(`alternativeFlows.${index}.relatedStep`, { valueAsNumber: true })}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:bg-gray-800 font-bold text-xs bg-white dark:bg-gray-900 h-10"
                                    onBlur={onFieldBlur}
                                >
                                    {mainFlow.map((_, i) => <option key={i} value={i + 1}>Step {i + 1}</option>)}
                                </select>
                            </div>
                            <div className="md:col-span-9 space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Condition</label>
                                    <input
                                        {...register(`alternativeFlows.${index}.condition`)}
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:bg-gray-800 text-sm font-medium"
                                        placeholder="If this condition is met..."
                                        onBlur={onFieldBlur}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">System Response</label>
                                    <input
                                        {...register(`alternativeFlows.${index}.response`)}
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:bg-gray-800 text-sm font-medium"
                                        placeholder="Then the system performs this action..."
                                        onBlur={onFieldBlur}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {!isReadOnly && (
                    <button
                        type="button"
                        onClick={() => append({ relatedStep: 1, condition: '', response: '' })}
                        className="w-full py-5 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-gray-400 font-bold hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all text-sm"
                    >
                        + Add Alternative Flow
                    </button>
                )}
            </div>
        </div>
    );
};

export default DescriptionForm;

