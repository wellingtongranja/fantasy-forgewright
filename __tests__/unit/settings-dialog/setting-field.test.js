/**
 * SettingField Component Tests
 * Testing reusable form field component with validation and accessibility
 */

import { SettingField } from '../../../src/components/dialogs/settings-dialog/components/setting-field.js'

// Mock the validation utilities
jest.mock('../../../src/components/dialogs/settings-dialog/utils/validation.js', () => ({
  sanitizeHtml: jest.fn((text) => text?.toString().replace(/</g, '&lt;').replace(/>/g, '&gt;') || ''),
}))

jest.mock('../../../src/components/dialogs/settings-dialog/utils/settings-helpers.js', () => ({
  generateId: jest.fn(() => 'test-field-id')
}))

describe('SettingField Component', () => {
  describe('Constructor and Configuration', () => {
    test('creates field with default configuration', () => {
      const field = new SettingField({})
      
      expect(field.config.label).toBe('')
      expect(field.config.type).toBe('text')
      expect(field.config.required).toBe(false)
      expect(field.config.options).toEqual([])
      expect(field.id).toBe('test-field-id')
    })

    test('accepts custom configuration', () => {
      const field = new SettingField({
        label: 'Test Field',
        type: 'select',
        setting: 'test.setting',
        value: 'test-value',
        required: true,
        description: 'Test description'
      })
      
      expect(field.config.label).toBe('Test Field')
      expect(field.config.type).toBe('select')
      expect(field.config.setting).toBe('test.setting')
      expect(field.config.value).toBe('test-value')
      expect(field.config.required).toBe(true)
      expect(field.config.description).toBe('Test description')
    })
  })

  describe('Validation Logic', () => {
    test('validates required fields correctly', () => {
      const field = new SettingField({
        label: 'Required Field',
        required: true
      })
      
      expect(field.validate('')).toBe(false)
      expect(field.isValid).toBe(false)
      expect(field.errorMessage).toBe('Required Field is required')
      
      expect(field.validate('some value')).toBe(true)
      expect(field.isValid).toBe(true)
      expect(field.errorMessage).toBe('')
    })

    test('uses custom validator when provided', () => {
      const mockValidator = jest.fn()
        .mockReturnValueOnce({ isValid: false, error: 'Custom error' })
        .mockReturnValueOnce({ isValid: true })
      
      const field = new SettingField({
        validator: mockValidator
      })
      
      expect(field.validate('invalid')).toBe(false)
      expect(field.errorMessage).toBe('Custom error')
      
      expect(field.validate('valid')).toBe(true)
      expect(field.errorMessage).toBe('')
      
      expect(mockValidator).toHaveBeenCalledTimes(2)
    })

    test('handles validator errors gracefully', () => {
      const mockValidator = jest.fn().mockImplementation(() => {
        throw new Error('Validator crashed')
      })
      
      const field = new SettingField({
        validator: mockValidator
      })
      
      expect(field.validate('test')).toBe(false)
      expect(field.errorMessage).toBe('Validation error')
    })

    test('skips validation for non-required empty values', () => {
      const field = new SettingField({
        required: false
      })
      
      expect(field.validate('')).toBe(true)
      expect(field.validate(null)).toBe(true)
    })
  })

  describe('Text Input Rendering', () => {
    test('renders text input with correct attributes', () => {
      const field = new SettingField({
        label: 'Text Field',
        type: 'text',
        setting: 'text.setting',
        value: 'test value',
        description: 'Field description'
      })
      
      const html = field.renderTextInput()
      
      expect(html).toContain('input')
      expect(html).toContain('type="text"')
      expect(html).toContain('data-setting="text.setting"')
      expect(html).toContain('value="test value"')
      expect(html).toContain('settings-text-input')
      expect(html).toContain('aria-describedby="test-field-id-desc"')
    })

    test('includes error state in text input', () => {
      const field = new SettingField({
        type: 'text'
      })
      
      field.validate('') // Make it invalid
      field.isValid = false
      
      const html = field.renderTextInput()
      
      expect(html).toContain('class="settings-text-input error"')
      expect(html).toContain('aria-invalid="true"')
    })

    test('handles number input type', () => {
      const field = new SettingField({
        type: 'number',
        value: 42,
        attributes: { min: '0', max: '100' }
      })
      
      const html = field.renderTextInput()
      
      expect(html).toContain('type="number"')
      expect(html).toContain('value="42"')
      expect(html).toContain('min="0"')
      expect(html).toContain('max="100"')
    })
  })

  describe('Select Dropdown Rendering', () => {
    test('renders select with options', () => {
      const field = new SettingField({
        type: 'select',
        setting: 'select.setting',
        value: 'option2',
        options: [
          { value: 'option1', label: 'Option 1' },
          { value: 'option2', label: 'Option 2' },
          { value: 'option3', label: 'Option 3' }
        ]
      })
      
      const html = field.renderSelect()
      
      expect(html).toContain('<select')
      expect(html).toContain('data-setting="select.setting"')
      expect(html).toContain('settings-select')
      
      // Check options
      expect(html).toContain('value="option1"')
      expect(html).toContain('Option 1</option>')
      expect(html).toContain('value="option2" selected')
      expect(html).toContain('Option 2</option>')
      expect(html).toContain('value="option3"')
      expect(html).toContain('Option 3</option>')
    })

    test('handles string options', () => {
      const field = new SettingField({
        type: 'select',
        value: 'medium',
        options: ['small', 'medium', 'large']
      })
      
      const html = field.renderSelect()
      
      expect(html).toContain('value="small"') 
      expect(html).toContain('>small</option>')
      expect(html).toContain('value="medium" selected')
      expect(html).toContain('medium</option>')
      expect(html).toContain('value="large"')
      expect(html).toContain('large</option>')
    })

    test('includes error state in select', () => {
      const field = new SettingField({
        type: 'select',
        options: ['option1', 'option2']
      })
      
      field.isValid = false
      
      const html = field.renderSelect()
      
      expect(html).toContain('class="settings-select error"')
      expect(html).toContain('aria-invalid="true"')
    })
  })

  describe('Checkbox Rendering', () => {
    test('renders checkbox with label', () => {
      const field = new SettingField({
        label: 'Enable Feature',
        type: 'checkbox',
        setting: 'checkbox.setting',
        value: true
      })
      
      const html = field.renderCheckbox()
      
      expect(html).toContain('<input')
      expect(html).toContain('type="checkbox"')
      expect(html).toContain('data-setting="checkbox.setting"')
      expect(html).toContain('checked="checked"')
      expect(html).toContain('class="settings-checkbox-label"')
      expect(html).toContain('<span class="settings-checkbox-text">Enable Feature</span>')
    })

    test('renders unchecked checkbox', () => {
      const field = new SettingField({
        label: 'Disabled Feature',
        type: 'checkbox',
        value: false
      })
      
      const html = field.renderCheckbox()
      
      expect(html).not.toContain('checked="checked"')
      expect(html).toContain('Disabled Feature')
    })
  })

  describe('Range Slider Rendering', () => {
    test('renders range input', () => {
      const field = new SettingField({
        type: 'range',
        setting: 'range.setting',
        value: 50,
        attributes: {
          min: '0',
          max: '100',
          step: '10'
        }
      })
      
      const html = field.renderRange()
      
      expect(html).toContain('type="range"')
      expect(html).toContain('data-setting="range.setting"')
      expect(html).toContain('value="50"')
      expect(html).toContain('min="0"')
      expect(html).toContain('max="100"')
      expect(html).toContain('step="10"')
    })
  })

  describe('Complete Field Rendering', () => {
    test('renders complete field with all components', () => {
      const field = new SettingField({
        label: 'Complete Field',
        type: 'text',
        value: 'test',
        description: 'Field description',
        required: true
      })
      
      const html = field.render()
      
      expect(html).toContain('settings-field')
      expect(html).toContain('for="test-field-id"')
      expect(html).toContain('Complete Field</label>')
      expect(html).toContain('class="settings-input-container"')
      expect(html).toContain('<small id="test-field-id-desc">Field description</small>')
    })

    test('renders field with error state', () => {
      const field = new SettingField({
        label: 'Error Field',
        type: 'text'
      })
      
      field.validate('') // Make invalid
      field.isValid = false
      field.errorMessage = 'This field is required'
      
      const html = field.render()
      
      expect(html).toContain('class="settings-field has-error"')
      expect(html).toContain('class="settings-error-message"')
      expect(html).toContain('role="alert"')
      expect(html).toContain('This field is required')
    })

    test('checkbox field does not duplicate label', () => {
      const field = new SettingField({
        label: 'Checkbox Field',
        type: 'checkbox'
      })
      
      const html = field.render()
      
      // Should not have separate label element for checkbox
      expect(html).not.toContain('<label for="test-field-id">Checkbox Field</label>')
      // But should have the checkbox with embedded label
      expect(html).toContain('settings-checkbox-text')
    })

    test('handles render errors gracefully', () => {
      // Create a field that will cause an error during rendering
      const field = new SettingField({
        type: 'invalid-type'
      })
      
      // Mock renderTextInput to throw an error
      field.renderTextInput = jest.fn(() => {
        throw new Error('Render error')
      })
      
      const html = field.render()
      
      expect(html).toContain('settings-error')
      expect(html).toContain('Error rendering field')
    })
  })

  describe('Static Utility Methods', () => {
    test('getValue returns checkbox state', () => {
      const checkboxElement = {
        type: 'checkbox',
        checked: true
      }
      
      expect(SettingField.getValue(checkboxElement)).toBe(true)
      
      checkboxElement.checked = false
      expect(SettingField.getValue(checkboxElement)).toBe(false)
    })

    test('getValue returns input value', () => {
      const inputElement = {
        type: 'text',
        value: 'test value'
      }
      
      expect(SettingField.getValue(inputElement)).toBe('test value')
    })

    test('getValue handles null element', () => {
      expect(SettingField.getValue(null)).toBeNull()
      expect(SettingField.getValue(undefined)).toBeNull()
    })
  })

  describe('Accessibility Features', () => {
    test('includes proper ARIA attributes', () => {
      const field = new SettingField({
        label: 'Accessible Field',
        description: 'Helpful description'
      })
      
      const html = field.render()
      
      expect(html).toContain('aria-describedby="test-field-id-desc"')
      expect(html).toContain('id="test-field-id-desc"')
    })

    test('sets aria-invalid for validation errors', () => {
      const field = new SettingField({
        type: 'text'
      })
      
      field.isValid = false
      
      const html = field.renderTextInput()
      
      expect(html).toContain('aria-invalid="true"')
    })

    test('error messages have alert role', () => {
      const field = new SettingField({})
      field.isValid = false
      field.errorMessage = 'Error message'
      
      const html = field.render()
      
      expect(html).toContain('role="alert"')
    })
  })
})