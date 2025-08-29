import { Center, Container, InputProps, MultiSelect, NumberInput, RangeSlider, Select, SelectProps, Space, Switch, Text } from '@mantine/core';
import { UseFieldReturnType } from '@mantine/form';
import {
  Range,
  TraitReadData,
  TraitType,
  TraitValue,
} from "../../apis/catalog";

export type TraitValueField = (0 | 1) | string | string[] | number | [ number, number ];

export const traitValueToTraitValueField = (type: TraitType, value: TraitValue): TraitValueField => {
  switch (type) {
    case "range":
      return [(value as Range).minimum, (value as Range).maximum] as [ number, number ];
    case "boolean":
      return Number(value) as (0 | 1);
    default:
      return value as string | string[] | number;
  }
};

export const traitValueFieldToTraitValue = (type: TraitType, value: TraitValueField): TraitValue => {
  switch (type) {
    case "range":
      let range = value as [number, number];
      return {
        minimum: range[0],
        maximum: range[1],
      };
    case "boolean":
      return Boolean(value as (0 | 1));
    default:
      return value as string | string[] | number;
  }
};

interface TraitValueInputProps {
  trait: TraitReadData,
  field: UseFieldReturnType<TraitValueField>,
}

const containerSize = 300;

export default function TraitValueInput({ trait, field, ...extraProps }: TraitValueInputProps) {
  switch (trait.type) {
    case "string":
      return <StringTraitSelect key={trait.slug} trait={trait} field={field as UseFieldReturnType<string>} {...extraProps} />
    case "number":
      return <NumberTraitInput key={trait.slug}  trait={trait} field={field as UseFieldReturnType<number>} {...extraProps} />
    case "boolean":
      return <BooleanTraitSwitch key={trait.slug} field={field as UseFieldReturnType<0 | 1>} {...extraProps} />
    case "string[]":
      return <StringArrayTraitSelect key={trait.slug}  trait={trait} field={field as UseFieldReturnType<string[]>} {...extraProps} />
    case "range":
      return <RangeTraitSlider key={trait.slug} trait={trait} field={field as UseFieldReturnType<[number, number]>} {...extraProps} />
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

function BooleanTraitSwitch({ field, ...extraSwitchProps }: { field: UseFieldReturnType<0 | 1> }) {
  return (
    <Center>
      <Switch
        key={field.key}
        size="xl"
        color="gray.3"
        onLabel={<Text c="green" tt="uppercase" fw={600}>sim</Text>}
        offLabel={<Text c="red" tt="uppercase" fw={600}>não</Text>}
        defaultChecked={ Boolean(field.getValue()) }
        {...field.getInputProps()}
        { ...extraSwitchProps}
        error={null}
        />
    </Center>
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
        {...field.getInputProps()}
        {...extraSelectProps}
        />
    </Container>
  )
}

function RangeTraitSlider({ trait, field, ...extraSliderProps }: { trait: TraitReadData, field: UseFieldReturnType<[number, number]> }) {  
  const min = field.getValue()[0];
  const max = field.getValue()[1];
  const step = Number.isInteger(min) ? 1 : 0.1;
  const minRange = 0;

  return (
    <RangeSlider
      key={field.key}
      size="sm"
      domain={[trait.numericValueMin, trait.numericValueMax]}
      min={trait.numericValueMin}
      max={trait.numericValueMax}
      marks={[
        { value: min },
        { value: max },
      ]}
      step={step}
      minRange={minRange}
      color="gray.5"
      label={(value: number) => value}
      labelAlwaysOn
      {...field.getInputProps()}
      {...extraSliderProps}
      p={20}
      mt={30}
    />
  )
}
