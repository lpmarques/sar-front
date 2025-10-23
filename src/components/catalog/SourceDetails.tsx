import { Anchor, Text } from '@mantine/core';
import { getSource, SourceReadData, SourceValue } from '../../apis/core';
import { JsonSchema } from '../../apis/common';
import classes from '../common/Clickable.module.css';
import { useLanguage } from '../../hooks/useLanguage';
import { useQuery } from '@tanstack/react-query';
import { QueryLoader } from '../common/QueryLoader';

export default function SourceDetails({ sourceId, sourceData }: { sourceId?: number, sourceData?: SourceReadData }) {
  const sourceQueryOptions = {
    queryKey: ['source', String(sourceId)],
    queryFn: getSource,
    enabled: sourceId !== undefined,
  };
  const sourceQuery = useQuery(sourceQueryOptions);
  const data = sourceData ?? sourceQuery.data;

  const fields = data ? data.fieldValues.sort((a, b) => a.position - b.position) : [];
  const lines = fields.map((item) => (
    <Text key={item.field} pb={10}>
      <Text span c="dimmed">{item.field}:</Text> <SourceValueDisplay value={item.value} schema={item.schema}/>
    </Text>
  ));
  
  return (
    <QueryLoader {...sourceQueryOptions}>
      { data &&
      <>
        <Text pb={10}>
          <Text span c="dimmed">Tipo:</Text> {data.type}
        </Text>
        {lines}
      </>}
    </QueryLoader>
  )
}

function SourceValueDisplay({ value, schema }: { value: SourceValue, schema: JsonSchema }) {
  const { lang } = useLanguage();

  if (schema.type === "array" && schema.items.type === "string") {
    const typedValue = value as string[];
    return <>{typedValue.join("; ")}</>;
  }

  if (schema.type === "string" && schema.format === "uri") {
    return <Anchor onClick={() => window.open(value as string)} className={classes.url}>{value as string}</Anchor>;
  }

  if (schema.type === "string" && schema.format === "date") {
    return <>{new Date(value as string).toLocaleDateString(lang, { timeZone: 'UTC' })}</>;
  }

  return <>{value}</>;
}
