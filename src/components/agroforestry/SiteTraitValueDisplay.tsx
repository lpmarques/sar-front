import { Badge, MantineStyleProp, Text } from '@mantine/core';
import {
  Range,
  SiteTraitValueReadData,
} from '../../apis/agroforestry';

interface SiteTraitValueDisplayProps {
  data: SiteTraitValueReadData,
  style?: MantineStyleProp
}

const numericTypes = ["number", "integer"];

export default function SiteTraitValueDisplay({ data, style }: SiteTraitValueDisplayProps) {
  if (data.schema.type == "string")
    return <StringTraitValue key={data.traitSlug} value={data.value as string} style={style} />
  if (numericTypes.includes(data.schema.type))
    return <NumberTraitValue key={data.traitSlug} value={data.value as number} style={style} />
  if (data.schema.type == "boolean")
    return <BooleanTraitValue key={data.traitSlug} value={data.value as boolean} style={style} />
  if (data.schema.type == "array" && data.schema.items.type == "string")
    return <StringArrayTraitValue key={data.traitSlug} value={data.value as string[]} style={style} />
  if (data.schema.type == "array" && numericTypes.includes(data.schema.items.type))
    return <RangeTraitValue key={data.traitSlug} value={data.value as Range} style={style} />
}

function StringTraitValue({ value, style }: { value: string, style?: MantineStyleProp }) {
  return (
    <Text span style={style}>{value}</Text>
  )
}

function NumberTraitValue({ value, style }: { value: number, style?: MantineStyleProp }) {
  return (
    <Text span style={style}>{value}</Text>
  )
}

function BooleanTraitValue({ value, style }: { value: boolean, style?: MantineStyleProp }) {
  const text = value ? "sim" : "não";
  const color = value ? "green" : "red";
  
  return (
    <Text span c={color} style={style}>{text}</Text>
  )
}

function StringArrayTraitValue({ value, style }: { value: string[], style?: MantineStyleProp }) {
  const valueItems = value.map(item => (
    <Badge key={item} color="dimmed" size="lg" variant="light" m={5} style={style}>{item}</Badge>
  ))

  return (
    <>
      {valueItems}
    </>
  )
}

function RangeTraitValue({ value, style }: { value: Range, style?: MantineStyleProp }) {
  return (
    <Text span style={style}>
      {value[0]} - {value[1]}
    </Text>
  )
}
