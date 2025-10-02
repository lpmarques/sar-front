import { PolymorphicComponentProps, Text, TextProps } from "@mantine/core";
import classes from '../common/Clickable.module.css';

interface ClickableText extends TextProps {
  children: React.ReactNode,
  onClick: React.MouseEventHandler<HTMLParagraphElement>,
}

export default function ClickableText({ children, onClick, ...props }: ClickableText) {
  return (
    <Text {...props} onClick={onClick} className={classes.text}>
      {children}
    </Text>
  )
}
