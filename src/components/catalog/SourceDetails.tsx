/*
Simulador Agroflorestal Regenera (SAR)
Copyright (C) 2026  Lucas Marques and Regenera Mata Atlântica

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses>.
*/

import { Anchor } from '@mantine/core';
import { getSource, SourceReadData, SourceValue } from '../../apis/core';
import { JsonSchema } from '../../apis/common';
import classes from '../common/Clickable.module.css';
import { useLanguage } from '../../hooks/useLanguage';
import { useQuery } from '@tanstack/react-query';
import { QueryLoader } from '../common/QueryLoader';
import FieldView from '../common/FieldView';

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
    <FieldView pb={10} key={item.field} label={item.field}>
      <SourceValueDisplay value={item.value} schema={item.schema}/>
    </FieldView>
  ));
  
  return (
    <QueryLoader {...sourceQueryOptions}>
      { data &&
      <>
        <FieldView pb={10} label="Tipo">{data.type}</FieldView>
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
