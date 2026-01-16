import { Accordion, Container, Group, Input, InputProps, List, MultiSelect, NumberInput, Select, Switch, Text, TextProps, Tooltip } from '@mantine/core';
import { UseFieldReturnType } from '@mantine/form';
import { IconInfoCircle, IconPlus } from '@tabler/icons-react';
import {
  Range,
  SiteTraitReadData,
  SiteTraitValue,
} from "../../apis/agroforestry";
import { JsonSchemaArray, JsonSchemaNumber } from '../../apis/common';
import classes from '../common/AccordionPlusChevron.module.css';

type LabelProps = Omit<SiteTraitLabelProps, 'trait'>;

interface TraitValueInputProps extends InputProps {
  trait: SiteTraitReadData,
  field: UseFieldReturnType<SiteTraitValue | undefined>,
  labelProps?: LabelProps,
}

const numericTypes = ["number", "integer"];

export default function SiteTraitValueInput({ trait, field, labelProps, ...extraProps }: TraitValueInputProps) {
  
  if (trait.schema.type == "string")
    return <StringTraitSelect key={trait.slug} trait={trait} field={field as UseFieldReturnType<string | undefined>} labelProps={labelProps} {...extraProps} />
  if (numericTypes.includes(trait.schema.type))
    return <NumberTraitInput key={trait.slug}  trait={trait} field={field as UseFieldReturnType<number | undefined>} labelProps={labelProps} {...extraProps} />
  if (trait.schema.type == "boolean")
    return <BooleanTraitSwitch key={trait.slug} trait={trait} field={field as UseFieldReturnType<boolean | undefined>} labelProps={labelProps} {...extraProps} />
  if (trait.schema.type == "array" && trait.schema.items.type == "string")
    return <StringArrayTraitSelect key={trait.slug}  trait={trait} field={field as UseFieldReturnType<string[] | undefined>} labelProps={labelProps} {...extraProps} />
  if (trait.schema.type == "array" && numericTypes.includes(trait.schema.items.type))
    return <RangeTraitInput key={trait.slug} trait={trait} field={field as UseFieldReturnType<Range | undefined>} labelProps={labelProps} {...extraProps} />
}

function StringTraitSelect({ trait, field, labelProps, ...extraSelectProps }: { trait: SiteTraitReadData, field: UseFieldReturnType<string | undefined>, labelProps: LabelProps }) {
  
  const options = trait.textValueOptions.map(opt => ({
    value: opt.value,
    label: opt.value.toUpperCase(),
  }));

  return (
    <>
      <SiteTraitLabel trait={trait} {...labelProps} />
      <Select
        key={field.key}
        data={options}
        searchable
        clearable
        withScrollArea={false}
        {...field.getInputProps()}
        {...extraSelectProps}
      />
    </>
  )
}

function NumberTraitInput({ trait, field, labelProps, ...extraInputProps }: { trait: SiteTraitReadData, field: UseFieldReturnType<number | undefined>, labelProps: LabelProps }) {
  const schema = trait.schema as JsonSchemaNumber;
  const minimum = schema.exclusiveMinimum ?? schema.minimum;
  const maximum = schema.exclusiveMaximum ?? schema.maximum;
  const decimalScale = schema.type === 'integer' ? 0 : 4;

  return (
    <>
      <SiteTraitLabel trait={trait} {...labelProps} />
      <NumberInput
        key={field.key}
        min={minimum}
        max={maximum}
        decimalScale={decimalScale}
        rightSection={field.getValue() != undefined ? <Input.ClearButton onClick={() => field.setValue(undefined)} /> : <></>}
        {...field.getInputProps()}
        {...extraInputProps}
        />
    </>
  )
}

function BooleanTraitSwitch({ trait, field, labelProps, ...extraSwitchProps }: { trait: SiteTraitReadData, field: UseFieldReturnType<boolean | undefined>, labelProps: LabelProps }) {
  const initialValue = field.getValue();
  const switchValue = () => {
    field.setValue(!field.getValue());
  }

  return (
    <>
      <SiteTraitLabel trait={trait} {...labelProps} />
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
      <Text mt={5} size="xs" c="red">{field.getInputProps().error}</Text>
    </>
  )
}

function StringArrayTraitSelect({ trait, field, labelProps, ...extraSelectProps }: { trait: SiteTraitReadData, field: UseFieldReturnType<string[] | undefined>, labelProps: LabelProps }) {
  const options = trait.textValueOptions.map(opt => ({
    value: opt.value,
    label: opt.value.toUpperCase()
  }));

  return (
    <>
      <SiteTraitLabel trait={trait} {...labelProps} />
      <MultiSelect
        key={field.key}
        data={options}
        searchable
        withScrollArea={false}
        {...field.getInputProps()}
        {...extraSelectProps}
        />
    </>
  )
}

function RangeTraitInput({ trait, field, labelProps, ...extraInputProps }: { trait: SiteTraitReadData, field: UseFieldReturnType<Range | undefined>, labelProps: LabelProps }) {
  const schema = trait.schema as JsonSchemaArray;
  const itemsSchema = schema.items as JsonSchemaNumber;
  
  const minRangeLength = 0;
  const decimalScale = schema.items.type === 'integer' ? 0 : 3;
  const minimum = itemsSchema.exclusiveMinimum ?? itemsSchema.minimum;
  const maximum = itemsSchema.exclusiveMaximum ?? itemsSchema.maximum;

  const changeRangeMin = (value: number) => {
    const currValue = field.getValue();
    if (!Number.isNaN(value) && currValue || value != 0) {
      const currMax = currValue == undefined || currValue[1]-value < minRangeLength ? value : currValue[1];
      field.setValue([value, currMax]);
    }
  }

  const changeRangeMax = (value: number) => {
    const currValue = field.getValue();
    if (!Number.isNaN(value) && currValue || value != 0) {
      const currMin = currValue == undefined || value-currValue[0] < minRangeLength ? value : currValue[0];
      field.setValue([currMin, value]);
    }
  }

  const clearRange = () => {
    field.setValue(undefined);
  }

  return (
    <div key={field.key}>
      <SiteTraitLabel trait={trait} {...labelProps} />
      <Group mt={5} justify='left'>
        <Container size={150} m={0} p={0}>
          <NumberInput
            min={minimum}
            max={maximum}
            decimalScale={decimalScale}
            value={String(field.getValue() ? field.getValue()![0] : undefined)}
            onBlur={(e) => changeRangeMin(Number(e.currentTarget.value))}
            rightSection={<></>}
            error={field.getInputProps().error}
            {...extraInputProps}
          />
        </Container>
        <Container size={150} m={0} p={0}>
          <NumberInput
            min={minimum}
            max={maximum}
            decimalScale={decimalScale}
            value={String(field.getValue() ? field.getValue()![1] : undefined)}
            onBlur={(e) => changeRangeMax(Number(e.currentTarget.value))}
            rightSection={<></>}
            error={field.getInputProps().error}
            {...extraInputProps}
          />
        </Container>
        {field.getValue() &&
        <Input.ClearButton onClick={clearRange} />}
      </Group>
    </div>
  )
}

interface SiteTraitLabelProps extends TextProps {
  trait: SiteTraitReadData,
}  

function SiteTraitLabel({ trait, ...textProps }: SiteTraitLabelProps) {
  return (
    <>
      <Text fz="sm" mb={5}>{trait.name}</Text>
      <SiteTraitDesc mb={5} trait={trait} />
    </>
  )
}

function SiteTraitDesc({ trait, ...textProps }: SiteTraitLabelProps) {

  const traitDesc = trait.description ? <Text fz="sm" c="dimmed" {...textProps}>{trait.description}</Text> : <></>;
  const textOptionDescItems = trait.textValueOptions.map(opt => (
    <List.Item key={opt.value} fz="sm">
      <Text span fz="xs" fw={600}>{opt.value.toUpperCase()}</Text>{opt.description ? `: ${opt.description}` : ""}
    </List.Item>
  )) ?? [];

  const optionsAccordion = (
    <Accordion
      variant="unstyled"
      // classNames={{ chevron: classes.chevron }}
      // chevron={<IconPlus size={15} />}
    >
      <Accordion.Item value="default">
        <Accordion.Control h={30} pl={0}>{traitDesc}</Accordion.Control>
        <Accordion.Panel>
          <List>{textOptionDescItems}</List>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );

  const optionsTooltip = (
    <Group align="normal">
      {traitDesc}
      <Tooltip withArrow position="top" label={<List>{textOptionDescItems}</List>}>
        <IconInfoCircle size={20} color="gray" />
      </Tooltip>
    </Group>
  );

  return (
    <>
      { textOptionDescItems.length === 0 ? traitDesc : optionsTooltip }
    </>
  )
}