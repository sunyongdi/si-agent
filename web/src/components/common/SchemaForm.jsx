import { Form, Input, InputNumber, Switch, Select } from 'antd'

function isEnumProp(prop) {
  return Array.isArray(prop?.enum) && prop.enum.length > 0
}

function renderControl(name, prop, required) {
  const label = prop?.title || name
  const placeholder = prop?.description ? prop.description : `请输入${label}`

  if (prop?.type === 'boolean') {
    return (
      <Form.Item key={name} name={name} label={label} valuePropName="checked">
        <Switch size="small" />
      </Form.Item>
    )
  }

  if (prop?.type === 'integer' || prop?.type === 'number') {
    return (
      <Form.Item key={name} name={name} label={label} tooltip={prop?.description}>
        <InputNumber style={{ width: '100%' }} placeholder={placeholder} />
      </Form.Item>
    )
  }

  if (isEnumProp(prop)) {
    return (
      <Form.Item key={name} name={name} label={label} tooltip={prop?.description} initialValue={prop?.default}>
        <Select placeholder={placeholder} allowClear />
      </Form.Item>
    )
  }

  if (prop?.type === 'array') {
    return (
      <Form.Item key={name} name={name} label={label} tooltip={prop?.description}>
        <Select mode="tags" open={false} placeholder={placeholder} tokenSeparators={[',']} />
      </Form.Item>
    )
  }

  if (prop?.type === 'object') {
    return (
      <Form.Item
        key={name}
        name={name}
        label={label}
        tooltip={prop?.description}
        rules={[
          {
            validator: (_, value) => {
              if (value == null || value === '') return Promise.resolve()
              try {
                JSON.parse(value)
                return Promise.resolve()
              } catch {
                return Promise.reject(new Error('请输入合法的 JSON'))
              }
            },
          },
        ]}
      >
        <Input.TextArea rows={4} placeholder='JSON 对象，例如 {"key": "value"}' />
      </Form.Item>
    )
  }

  if (prop?.writeOnly || /key|secret|token|password/i.test(name)) {
    return (
      <Form.Item
        key={name}
        name={name}
        label={label}
        tooltip={prop?.description}
        rules={required ? [{ required: true, message: `请输入${label}` }] : undefined}
        initialValue={prop?.default}
      >
        <Input.Password placeholder={placeholder} autoComplete="new-password" />
      </Form.Item>
    )
  }

  const longText = (prop?.format === 'textarea' || /prompt|description|content/i.test(name)) && prop?.type !== 'object'
  return (
    <Form.Item
      key={name}
      name={name}
      label={label}
      tooltip={prop?.description}
      rules={required ? [{ required: true, message: `请输入${label}` }] : undefined}
      initialValue={prop?.default}
    >
      {longText ? (
        <Input.TextArea rows={4} placeholder={placeholder} autoSize={{ minRows: 4, maxRows: 12 }} />
      ) : (
        <Input placeholder={placeholder} />
      )}
    </Form.Item>
  )
}

export default function SchemaForm({ schema, form, extraItems = [] }) {
  if (!schema?.properties) return null
  const required = schema.required || []
  const entries = Object.entries(schema.properties)
  return (
    <Form form={form} layout="vertical" preserve={false}>
      {entries.map(([name, prop]) => renderControl(name, prop, required.includes(name)))}
      {extraItems}
    </Form>
  )
}

export function schemaValuesToJson(schema, values) {
  if (!schema?.properties) return values || {}
  const result = {}
  Object.entries(values || {}).forEach(([key, value]) => {
    const propType = schema.properties[key]?.type
    if (value === undefined || value === null || value === '') return
    if (propType === 'object' && typeof value === 'string') {
      try {
        result[key] = JSON.parse(value)
      } catch {
        result[key] = value
      }
      return
    }
    if (propType === 'integer' && typeof value === 'string') {
      result[key] = parseInt(value, 10)
      return
    }
    if (propType === 'number' && typeof value === 'string') {
      result[key] = parseFloat(value)
      return
    }
    result[key] = value
  })
  return result
}
