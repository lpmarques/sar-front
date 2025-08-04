import { Badge, RangeSlider, Space, Text } from '@mantine/core';
import {
  RangeValue,
  TraitValueReadData,
} from "../../apis/catalog";

export default function TraitValue({ data }: { data: TraitValueReadData }) {
  switch (data.type) {
    case "string":
      return <StringTraitValue key={data.traitKey} value={data.value as string} />
    case "number":
      return <NumberTraitValue key={data.traitKey} value={data.value as number} />
    case "boolean":
      return <BooleanTraitValue key={data.traitKey} value={data.value as boolean} />
    case "string[]":
      return <StringArrayTraitValue key={data.traitKey} value={data.value as string[]} />
    case "range":
      return <RangeTraitValue key={data.traitKey} value={data.value as RangeValue} boundaries={data.boundaries as RangeValue} />
  }
}

function StringTraitValue({ value }: { value: string }) {
  return (
    <Text size="sm" tt="uppercase" fw={600} m={5}>{value}</Text>
  )
}

function NumberTraitValue({ value }: { value: number }) {
  return (
    <Text size="sm" tt="uppercase" fw={600} m={5}>{value}</Text>
  )
}

function BooleanTraitValue({ value }: { value: boolean }) {
  const text = value ? "sim" : "não";
  const color = value ? "green" : "red";
  
  return (
    <Text size="sm" tt="uppercase" fw={600} m={5} c={color}>{text}</Text>
  )
}

function StringArrayTraitValue({ value }: { value: string[] }) {
  const valueItems = value.map(item => (
    <Badge key={item} fw={600} color="dimmed" size="lg" variant="light" m={5}>{item}</Badge>
  ))

  return (
    <>
      {valueItems}
    </>
  )
}

function RangeTraitValue({ value, boundaries }: { value: RangeValue, boundaries: RangeValue }) {
  function round(num: number) {
    return Math.round(num * 10) / 10
  }

  return (
    <>
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
      />
      <Space h={20}/>
    </>
  )
}
