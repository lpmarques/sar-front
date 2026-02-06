import { Text, TextProps } from '@mantine/core';

export interface FieldViewProps extends TextProps {
  label: string,
  children: React.ReactNode,
}

export default function FieldView({ label, children, ...textProps }: FieldViewProps) {
  return (
    <Text {...textProps}>
      <Text span c="dimmed">{label}:</Text> {children}
    </Text>
  )
}
