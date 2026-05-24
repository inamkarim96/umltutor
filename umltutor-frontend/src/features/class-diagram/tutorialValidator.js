/**
 * Tutorial validation for Class Diagram (Step 4).
 */
export const validateClassDiagramTutorial = (classDiagram) => {
  const nodes = classDiagram?.nodes || [];
  const classes = nodes.filter((n) => n.type === 'class' || n.type === 'interface');

  if (nodes.length === 0 || classes.length === 0) {
    return {
      isValid: false,
      message: 'Add at least one class or interface to your Class Diagram.',
    };
  }

  const placeholders = new Set(['newclass', 'newinterface', 'class', 'interface', 'untitled']);
  for (const cls of classes) {
    const label = (cls.data?.label || '').trim();
    if (!label || placeholders.has(label.toLowerCase())) {
      return {
        isValid: false,
        message: 'Rename all placeholder classes to meaningful domain names (e.g., Order, Student).',
      };
    }
  }

  const hasMethod = classes.some((cls) => {
    const methods = cls.data?.methods || [];
    return methods.some((m) => String(m).replace(/^[\+\-\#~]\s*/, '').trim().length > 2);
  });

  if (!hasMethod) {
    return {
      isValid: false,
      message: 'Add at least one operation/method to a class (e.g., + placeOrder()).',
    };
  }

  return { isValid: true, message: 'Class Diagram validated successfully!' };
};
