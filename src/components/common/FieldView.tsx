import { Text, TextProps } from '@mantine/core';

interface FieldViewProps extends TextProps {
  label: string,
  children: React.ReactNode,
}

export default function FieldView({ label, children, ...textProps }: FieldViewProps) {
  return (
    <Text pb={10} {...textProps}>
      <Text span c="dimmed">{label}:</Text> {children}
    </Text>
  )
}
