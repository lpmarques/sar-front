import { Container, Text, Textarea, TextareaProps } from "@mantine/core";
import { UseFieldReturnType } from "@mantine/form";

interface CommentInputProps extends TextareaProps {
  field: UseFieldReturnType<string>,
  maxChars: number,
}

export default function CommentInput ({ field, maxChars, ...textareaProps }: CommentInputProps) {
  const comment = field.getValue();
  const commentLength = comment ? comment.length : 0;

  return (
    <Container size={500}>
      <Textarea
        key={field.key}
        size="md"
        {...textareaProps}
        {...field.getInputProps()}
      />
      <Text size="xs" c={commentLength > maxChars ? "red" : "dimmed"} pt={5}>
        {commentLength}/{maxChars}
      </Text>
    </Container>
  )
}
