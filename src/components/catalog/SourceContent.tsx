import { Anchor, Text } from '@mantine/core';
import { SourceReadData, SourceValue } from '../../apis/core';
import { JsonSchema } from '../../apis/common';
import classes from '../common/Clickable.module.css';
import { useLanguage } from '../../hooks/useLanguage';

export default function SourceContent({ data }: { data: SourceReadData }) {
  const fields = data.fieldValues.sort((a, b) => a.position - b.position);
  const lines = fields.map((item) => (
    <Text key={item.field} pb={10}>
      <Text span c="dimmed">{item.field}:</Text> <SourceValueDisplay value={item.value} schema={item.schema}/>
    </Text>
  ))
  
  return (
    <>
      <Text pb={10}>
        <Text span c="dimmed">Tipo:</Text> {data.type}
      </Text>
      {lines}
    </>
  )
}

function SourceValueDisplay({ value, schema }: { value: SourceValue, schema: JsonSchema }) {
  const { lang } = useLanguage();

  if (schema.type === "array" && schema.items.type === "string") {
    const typedValue = value as string[];
    return <>{typedValue.join("; ")}</>;
  }

  if (schema.type === "string" && schema.format === "uri") {
    return <Anchor className={classes.text} onClick={() => window.open(value as string)}>{value as string}</Anchor>
  }

  if (schema.type === "string" && schema.format === "date") {
    return <>{new Date(value as string).toLocaleDateString(lang, { timeZone: 'UTC' })}</>;
  }

  return <>{value}</>
}
