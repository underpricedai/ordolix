/**
 * Tooltip content dictionary for the Custom Fields module.
 * @module custom-fields-tooltips
 */

const tooltips = {
  createField: "Define a new custom field for issues in this project",
  fieldType: "The data type for this field (text, number, select, etc.)",
  fieldContext: "The projects and issue types where this field appears",
  defaultValue: "The pre-filled value when a new issue is created",
  requiredField: "Users must provide a value before saving the issue",
  fieldDescription: "Help text shown below the field on the issue form",
} as const;

export default tooltips;
