import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { useAppSelector, useAppDispatch } from '../../../app/hooks';
import { selectCurrentMode, selectIsCheckingActive } from '../../../features/modes';
import { useCheckingErrors } from '../../../hooks/useCheckingErrors';

const ClassNode = ({ id, data, selected }) => {
    const { setNodes } = useReactFlow();
    const dispatch = useAppDispatch();
    const currentMode = useAppSelector(selectCurrentMode);
    const checkingModeActive = useAppSelector(selectIsCheckingActive);
    const isReadOnly = data.isReadOnly || false;

    // Local state for editing
    const [isEditingName, setIsEditingName] = useState(false);
    const [className, setClassName] = useState(data.label || 'NewClass');
    const [attributes, setAttributes] = useState(data.attributes || []);
    const [methods, setMethods] = useState(data.methods || []);

    const nameInputRef = useRef(null);

    const checkErrors = useCheckingErrors('class-diagram', id);
    const hasErrors = checkingModeActive && checkErrors.length > 0;

    useEffect(() => {
        if (isEditingName && nameInputRef.current) {
            nameInputRef.current.focus();
            nameInputRef.current.select();
        }
    }, [isEditingName]);

    const updateNodeData = useCallback((newData) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === id) {
                    return { ...node, data: { ...node.data, ...newData } };
                }
                return node;
            })
        );
    }, [id, setNodes]);

    const handleNameBlur = () => {
        setIsEditingName(false);
        updateNodeData({ label: className });
    };

    const handleAttributeChange = (index, value) => {
        const newAttrs = [...attributes];
        newAttrs[index] = value;
        setAttributes(newAttrs);
    };

    const handleAttributeBlur = () => {
        updateNodeData({ attributes });
    };

    const addAttribute = () => {
        if (isReadOnly) return;
        const newAttrs = [...attributes, '+ attribute: type'];
        setAttributes(newAttrs);
        updateNodeData({ attributes: newAttrs });
    };

    const handleMethodChange = (index, value) => {
        const newMethods = [...methods];
        newMethods[index] = value;
        setMethods(newMethods);
    };

    const handleMethodBlur = () => {
        updateNodeData({ methods });
    };

    const addMethod = () => {
        if (isReadOnly) return;
        const newMethods = [...methods, '+ method()'];
        setMethods(newMethods);
        updateNodeData({ methods: newMethods });
    };

    const removeAttribute = (index) => {
        if (isReadOnly) return;
        const newAttrs = attributes.filter((_, i) => i !== index);
        setAttributes(newAttrs);
        updateNodeData({ attributes: newAttrs });
    };

    const removeMethod = (index) => {
        if (isReadOnly) return;
        const newMethods = methods.filter((_, i) => i !== index);
        setMethods(newMethods);
        updateNodeData({ methods: newMethods });
    };

    return (
        <div className={`flex flex-col bg-white border-2 rounded shadow-md min-w-[150px] ${selected ? 'border-indigo-500' : 'border-gray-800'} ${hasErrors ? 'border-red-500 bg-status-red/10' : ''}`}>
            {/* Class Name Compartment */}
            <div className="p-2 border-b-2 border-gray-800 text-center bg-surface-3 font-bold font-body">
                {isEditingName ? (
                    <input
                        ref={nameInputRef}
                        className="w-full text-center outline-none bg-transparent"
                        value={className}
                        onChange={(e) => setClassName(e.target.value)}
                        onBlur={handleNameBlur}
                        onKeyDown={(e) => e.key === 'Enter' && handleNameBlur()}
                    />
                ) : (
                    <div onDoubleClick={() => !isReadOnly && setIsEditingName(true)} className="cursor-text">
                        {className}
                    </div>
                )}
            </div>

            {/* Attributes Compartment */}
            <div className="p-2 border-b-2 border-gray-800 min-h-[30px] flex flex-col gap-1">
                {attributes.map((attr, idx) => (
                    <div key={idx} className="flex items-center group/attr">
                        <input
                            className="flex-1 text-xs outline-none bg-transparent hover:bg-surface-3 focus:bg-white"
                            value={attr}
                            readOnly={isReadOnly}
                            onChange={(e) => handleAttributeChange(idx, e.target.value)}
                            onBlur={handleAttributeBlur}
                        />
                        {!isReadOnly && (
                            <button 
                                onClick={() => removeAttribute(idx)}
                                className="opacity-0 group-hover/attr:opacity-100 text-status-red text-[10px] ml-1"
                            >
                                ×
                            </button>
                        )}
                    </div>
                ))}
                {!isReadOnly && (
                    <button 
                        onClick={addAttribute}
                        className="text-[10px] text-gray-400 hover:text-indigo-500 text-left"
                    >
                        + add attribute
                    </button>
                )}
            </div>

            {/* Methods Compartment */}
            <div className="p-2 min-h-[30px] flex flex-col gap-1">
                {methods.map((method, idx) => (
                    <div key={idx} className="flex items-center group/method">
                        <input
                            className="flex-1 text-xs outline-none bg-transparent hover:bg-surface-3 focus:bg-white"
                            value={method}
                            readOnly={isReadOnly}
                            onChange={(e) => handleMethodChange(idx, e.target.value)}
                            onBlur={handleMethodBlur}
                        />
                        {!isReadOnly && (
                            <button 
                                onClick={() => removeMethod(idx)}
                                className="opacity-0 group-hover/method:opacity-100 text-status-red text-[10px] ml-1"
                            >
                                ×
                            </button>
                        )}
                    </div>
                ))}
                {!isReadOnly && (
                    <button 
                        onClick={addMethod}
                        className="text-[10px] text-gray-400 hover:text-indigo-500 text-left"
                    >
                        + add method
                    </button>
                )}
            </div>

            {/* Handles */}
            <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-gray-600" />
            <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-gray-600" />
            <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-gray-600" />
            <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-gray-600" />
        </div>
    );
};

export default memo(ClassNode);
