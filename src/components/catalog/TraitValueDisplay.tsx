import { Badge, MantineStyleProp, RangeSlider, Space, Text } from '@mantine/core';
import {
  Range,
  TraitValueReadData,
} from "../../apis/catalog";

interface TraitValueDisplayProps {
  data: TraitValueReadData,
  style?: MantineStyleProp
}

export default function TraitValueDisplay({ data, style }: TraitValueDisplayProps) {
  switch (data.type) {
    case "string":
      return <StringTraitValue key={data.traitSlug} value={data.value as string} style={style} />
    case "number":
      return <NumberTraitValue key={data.traitSlug} value={data.value as number} style={style} />
    case "boolean":
      return <BooleanTraitValue key={data.traitSlug} value={data.value as boolean} style={style} />
    case "string[]":
      return <StringArrayTraitValue key={data.traitSlug} value={data.value as string[]} style={style} />
    case "range":
      return <RangeTraitValue key={data.traitSlug} value={data.value as Range} boundaries={data.boundaries as Range} style={style} />
  }
}

function StringTraitValue({ value, style }: { value: string, style?: MantineStyleProp }) {
  return (
    <Text size="sm" tt="uppercase" fw={600} m={5} style={style}>{value}</Text>
  )
}

function NumberTraitValue({ value, style }: { value: number, style?: MantineStyleProp }) {
  return (
    <Text size="md" tt="uppercase" fw={600} m={5} style={style}>{value}</Text>
  )
}

function BooleanTraitValue({ value, style }: { value: boolean, style?: MantineStyleProp }) {
  const text = value ? "sim" : "não";
  const color = value ? "green" : "red";
  
  return (
    <Text size="md" tt="uppercase" fw={600} m={5} c={color} style={style}>{text}</Text>
  )
}

function StringArrayTraitValue({ value, style }: { value: string[], style?: MantineStyleProp }) {
  const valueItems = value.map(item => (
    <Badge key={item} fw={600} color="dimmed" size="lg" variant="light" m={5} style={style}>{item}</Badge>
  ))

  return (
    <>
      {valueItems}
    </>
  )
}

function RangeTraitValue({ value, boundaries, style }: { value: Range, boundaries: Range, style?: MantineStyleProp }) {
  function round(num: number) {
    return Math.round(num * 10) / 10
  }

  return (
    <RangeSlider
      disabled
      size="sm"
      defaultValue={[value.minimum, value.maximum]}
      domain={[boundaries.minimum, boundaries.maximum]}
      marks={[
        { value: value.minimum, label: round(value.minimum) },
        { value: value.maximum, label: round(value.maximum) },
      ]}
      label={(value: number) => value}
      p={20}
      mb={20}
      style={style}
    />
  )
}
