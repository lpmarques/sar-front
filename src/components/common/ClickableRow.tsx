import { MantineStyleProp, Table, TableTrProps } from "@mantine/core";
import classes from './Clickable.module.css';

export interface ClickableRowProps extends TableTrProps {
  children: React.ReactNode,
  style?: MantineStyleProp,
}

export default function ClickableRow({ children, style, ...props }: ClickableRowProps) {
  const defaultStyle = {
    '--hover-color': 'var(--mantine-color-gray-1)',
  };

  return (
    <Table.Tr {...props} className={classes.row} style={{...defaultStyle, ...style}}>
      {children}
    </Table.Tr>
  )
}
