import { Center, Text, Tooltip } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';

type TipProps = {
  label: string
}

export default function InputTip(props: TipProps) {
  return (
  <Tooltip
    label={props.label}
    position="top-end"
    withArrow
    transitionProps={{ transition: 'pop-bottom-right' }}
  >
    <Text component="div" c="dimmed" style={{ cursor: 'help' }}>
      <Center>
        <IconInfoCircle size={18} stroke={1.5} />
      </Center>
    </Text>
  </Tooltip>
  )
}