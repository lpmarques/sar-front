import { Container, Text, TextInput } from "@mantine/core";
import { UseFieldReturnType } from "@mantine/form";

export default function CommentInput ({ field, maxChars }: { field: UseFieldReturnType<string>, maxChars: number }) {
  const comment = field.getValue();
  const commentLength = comment ? comment.length : 0;

  return (
    <Container size={700}>
      <TextInput
        key={field.key}
        placeholder="Se achar pertinente, fale mais aqui sobre sua proposta."
        {...field.getInputProps()}
      />
      <Text size="xs" c={commentLength > maxChars ? "red" : "dimmed"} pt={5}>
        {commentLength}/{maxChars}
      </Text>
    </Container>
  )
}
