import moment from "moment";
import { UseFieldReturnType } from "@mantine/form";
import { SourceField, SourceValue } from "../../apis/core";
import { Kbd, NumberInput, TagsInput, TextInput, Tooltip } from "@mantine/core";
import { DateInput } from '@mantine/dates';
import { JsonSchemaNumber } from "../../apis/common";
import { IconInfoCircle } from "@tabler/icons-react";
import { useLanguage } from "../../hooks/useLanguage";

type SourceFieldValueInputProps = {
  sourceField: SourceField,
  formField: UseFieldReturnType<SourceValue | undefined>,
}

export default function SourceFieldValueInput({ sourceField, formField }: SourceFieldValueInputProps) {

  if (sourceField.schema.type === "string" && sourceField.schema.format === "date")
    return <DateFieldValueInput sourceField={sourceField} formField={formField as UseFieldReturnType<string>} />
  if (sourceField.schema.type === "string")
    return <StringFieldValueInput sourceField={sourceField} formField={formField as UseFieldReturnType<string>} />
  if (sourceField.schema.type === "integer")
    return <IntegerFieldValueInput sourceField={sourceField} formField={formField as UseFieldReturnType<number>} />
  if (sourceField.schema.type === "array" && sourceField.schema.items.type === "string")
    return <StringArrayFieldValueInput sourceField={sourceField} formField={formField as UseFieldReturnType<string[]>} />

  return <></>
}

function DateFieldValueInput({ sourceField, formField }: { sourceField: SourceField, formField: UseFieldReturnType<string> }) {
  const { lang } = useLanguage();
  const inputFormat = "L"; // reference: https://day.js.org/docs/en/display/format#localized-formats
  const valueOutputFormat = 'YYYY-MM-DD';

  return (
    <DateInput
      key={formField.key}
      label={sourceField.name}
      required={!sourceField.isNullable}
      placeholder={sourceField.description}
      locale={lang}
      dateParser={input => moment(input, inputFormat).format(valueOutputFormat)}
      valueFormat={inputFormat}
      style={{textDecoration: "none"}}
      {...formField.getInputProps()}
      />
  )
}

function StringFieldValueInput({ sourceField, formField }: { sourceField: SourceField, formField: UseFieldReturnType<string> }) {
  return (
    <TextInput
      key={formField.key}
      label={sourceField.name}
      required={!sourceField.isNullable}
      placeholder={sourceField.description}
      {...formField.getInputProps()}
    />
  )
}

function IntegerFieldValueInput({ sourceField, formField }: { sourceField: SourceField, formField: UseFieldReturnType<number> }) {
  const schema = sourceField.schema as JsonSchemaNumber;

  return (
    <NumberInput
      key={formField.key}
      label={sourceField.name}
      required={!sourceField.isNullable}
      placeholder={sourceField.description}
      allowDecimal={false}
      min={schema.exclusiveMinimum ?? schema.minimum}
      max={schema.exclusiveMaximum ?? schema.maximum}
      {...formField.getInputProps()}
    />
  )
}

function StringArrayFieldValueInput({ sourceField, formField }: { sourceField: SourceField, formField: UseFieldReturnType<string[]> }) {
  const tip = (
    <Tooltip label={<span>Digite um nome e <Kbd>Enter</Kbd> ou <Kbd>,</Kbd> para adicionar</span>}>
      <IconInfoCircle />
    </Tooltip>
  )

  return (
    <TagsInput
      key={formField.key}
      label={sourceField.name}
      required={!sourceField.isNullable}
      placeholder={sourceField.description}
      rightSection={tip}
      {...formField.getInputProps()}
    />
  )
}
