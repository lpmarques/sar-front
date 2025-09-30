import { Center, Container, Group, MultiSelect, NativeSelect, NumberInput, RangeSlider, Select, Switch, Text, TextInput } from '@mantine/core';
import { UseFieldReturnType } from '@mantine/form';
import {
  Range,
  TraitReadData,
  TraitValue,
} from "../../apis/catalog";
import { useState } from 'react';

interface TraitValueInputProps {
  trait: TraitReadData,
  field: UseFieldReturnType<TraitValue>,
}

const containerSize = 300;

export default function TraitValueInput({ trait, field, ...extraProps }: TraitValueInputProps) {
  switch (trait.type) {
    case "string":
      return <StringTraitSelect key={trait.slug} trait={trait} field={field as UseFieldReturnType<string>} {...extraProps} />
    case "number":
      return <NumberTraitInput key={trait.slug}  trait={trait} field={field as UseFieldReturnType<number>} {...extraProps} />
    case "boolean":
      return <BooleanTraitSwitch key={trait.slug} field={field as UseFieldReturnType<boolean>} {...extraProps} />
    case "string[]":
      return <StringArrayTraitSelect key={trait.slug}  trait={trait} field={field as UseFieldReturnType<string[]>} {...extraProps} />
    case "range":
      return <RangeTraitSlider key={trait.slug} trait={trait} field={field as UseFieldReturnType<Range>} {...extraProps} />
  }
}

function StringTraitSelect({ trait, field, ...extraSelectProps }: { trait: TraitReadData, field: UseFieldReturnType<string> }) {
  const options = trait.textValueOptions.map(opt => ({
    value: opt,
    label: opt.toUpperCase()
  }))

  return (
    <Container size={containerSize}>
      <Select
        key={field.key}
        data={options}
        searchable
        withScrollArea={false}
        {...field.getInputProps()}
        {...extraSelectProps}
      />
    </Container>
  )
}

function NumberTraitInput({ trait, field, ...extraInputProps }: { trait: TraitReadData, field: UseFieldReturnType<number> }) {
  return (
    <Container size={containerSize}>
      <NumberInput
        key={field.key}
        min={trait.numericValueMin}
        max={trait.numericValueMax}
        {...field.getInputProps()}
        {...extraInputProps}
        />
    </Container>
  )
}

function BooleanTraitSwitch({ field, ...extraSwitchProps }: { field: UseFieldReturnType<boolean> }) {
  const initialValue = field.getValue();
  const switchValue = () => {
    field.setValue(!field.getValue());
  }

  return (
    <>
    <Center>
      <Switch
        key={field.key}
        size="xl"
        color="gray.3"
        onLabel={<Text c="green" tt="uppercase" fw={600}>sim</Text>}
        offLabel={<Text c="red" tt="uppercase" fw={600}>não</Text>}
        defaultChecked={initialValue}
        {...field.getInputProps()}
        error={null}
        value={Number(field.getValue())}
        onChange={() => switchValue()}
        {...extraSwitchProps}
        />
    </Center>
    <Text mt={5} size="xs" c="red">{field.getInputProps().error}</Text>
    </>
  )
}

function StringArrayTraitSelect({ trait, field, ...extraSelectProps }: { trait: TraitReadData, field: UseFieldReturnType<string[]>,  }) {
  const options = trait.textValueOptions.map(opt => ({
    value: opt,
    label: opt.toUpperCase()
  }))

  return (
    <Container size={containerSize}>
      <MultiSelect
        key={field.key}
        data={options}
        searchable
        withScrollArea={false}
        {...field.getInputProps()}
        {...extraSelectProps}
        />
    </Container>
  )
}

function RangeTraitSlider({ trait, field, ...extraSliderProps }: { trait: TraitReadData, field: UseFieldReturnType<Range> }) {  
  const initialMin = field.getValue()[0];
  const initialMax = field.getValue()[1];
  const step = Number.isInteger(initialMin) ? 1 : 0.1; // TODO: somehow get this info from backend
  const minRangeLength = 0;
  console.log(initialMin)

  const changeRangeMin = (value: number) => {
    if (!Number.isNaN(value)) {
      field.setValue([value, field.getValue()[1]]);
    }
  }

  const limitRangeMin = (value: number) => {
    const currMax = field.getValue()[1];
    if (currMax-value < minRangeLength)
      field.setValue([currMax-minRangeLength, currMax]);
  }

  const changeRangeMax = (value: number) => {
    if (!Number.isNaN(value)) {
      field.setValue([field.getValue()[0], value]);
    }
  }

  const limitRangeMax = (value: number) => {
    const currMin = field.getValue()[0];
    if (value-currMin < minRangeLength)
      field.setValue([currMin, currMin+minRangeLength]);
    console.log(field.getValue())
  }

  return (
    <div key={field.key}>
      <RangeSlider
        size="sm"
        domain={[trait.numericValueMin, trait.numericValueMax]}
        min={trait.numericValueMin}
        max={trait.numericValueMax}
        marks={[
          { value: initialMin },
          { value: initialMax },
        ]}
        step={step}
        minRange={minRangeLength}
        color="gray.5"
        label={(value: number) => value}
        labelAlwaysOn
        {...field.getInputProps()}
        {...extraSliderProps}
        p={20}
        mt={30}
      />
      <Group justify='center'>
        <Container size={100} m={0} p={0}>
          <NumberInput
            defaultValue={String(initialMin)}
            min={trait.numericValueMin}
            max={trait.numericValueMax}
            value={String(field.getValue()[0])}
            onChange={(e) => changeRangeMin(Number(e))}
            onBlur={(e) => limitRangeMin(Number(e.currentTarget.value))}
            size="xs"
          />
          <Text c="dimmed" fz={14}>Mín.</Text>
        </Container>
        <Container size={100} m={0} p={0}>
          <NumberInput
            defaultValue={String(initialMax)}
            min={trait.numericValueMin}
            max={trait.numericValueMax}
            value={String(field.getValue()[1])}
            onChange={(e) => changeRangeMax(Number(e))}
            onBlur={(e) => limitRangeMax(Number(e.currentTarget.value))}
            size="xs"
          />
          <Text c="dimmed" fz={14}>Máx.</Text>
        </Container>
      </Group>
      <Text size="xs" c="red">{field.getInputProps().error}</Text>
    </div>
  )
}
